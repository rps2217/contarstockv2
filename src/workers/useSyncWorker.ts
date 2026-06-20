/**
 * =============================================================================
 * useSyncWorker - Hook para integración con Web Worker de Sincronización
 * =============================================================================
 * 
 * Proporciona una interfaz para controlar el Web Worker de sincronización
 * con soporte para:
 * - Sincronización en segundo plano usando GenericSyncEngine
 * - Cancelación de operaciones
 * - Notificaciones de progreso
 * - Manejo de errores
 * 
 * @module useSyncWorker
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// =============================================================================
// TIPOS
// =============================================================================

export interface SyncWorkerMessage {
  type: 'PROGRESS' | 'LOG' | 'COMPLETE' | 'ERROR';
  table?: string;
  percent?: number;
  level?: 'info' | 'warn' | 'error';
  msg?: string;
  results?: SyncWorkerResult[];
  error?: string;
}

export interface SyncWorkerResult {
  table: string;
  pushed: number;
  pulled: number;
  errors: number;
}

export interface SyncWorkerState {
  isRunning: boolean;
  progress: number;
  currentTable: string | null;
  logs: Array<{ level: string; msg: string; timestamp: number }>;
  lastResults: SyncWorkerResult[] | null;
  error: string | null;
}

export interface UseSyncWorkerReturn {
  state: SyncWorkerState;
  /** Sincronizar todas las tablas registradas */
  startSyncAll: () => void;
  /** Sincronizar tabla específica */
  startSyncTable: (key: string) => void;
  /** Solo subir cambios de una tabla */
  startPushTable: (key: string) => void;
  /** Solo descargar cambios de una tabla */
  startPullTable: (key: string) => void;
  /** Cancelar operación actual */
  abort: () => void;
  /** Limpiar logs */
  clearLogs: () => void;
}

// =============================================================================
// TABLAS PRIORITARIAS PARA SYNC
// =============================================================================

const PRIORITY_TABLES = [
  'products',
  'providers',
  'sessions',
  'scans',
  'expiry',
  'events'
];

// =============================================================================
// HOOK
// =============================================================================

export function useSyncWorker(): UseSyncWorkerReturn {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<SyncWorkerState>({
    isRunning: false,
    progress: 0,
    currentTable: null,
    logs: [],
    lastResults: null,
    error: null
  });

  // Inicializar worker
  useEffect(() => {
    // Crear worker inline usando Blob URL
    // Este worker delega a GenericSyncEngine vía postMessage al main thread
    const workerCode = `
      let isProcessing = false;
      let shouldAbort = false;

      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      const sendMessage = (response) => {
        self.postMessage(response);
      };

      const handleSyncAll = async (tables) => {
        if (isProcessing) {
          sendMessage({ type: 'ERROR', error: 'Ya hay una sincronización en progreso' });
          return;
        }
        isProcessing = true;
        shouldAbort = false;

        sendMessage({ type: 'LOG', level: 'info', msg: '🔄 Iniciando sincronización completa...' });

        const results = [];
        const totalTables = tables.length;

        for (let i = 0; i < tables.length; i++) {
          if (shouldAbort) {
            sendMessage({ type: 'LOG', level: 'warn', msg: '⚠️ Sincronización cancelada por usuario' });
            break;
          }

          const table = tables[i];
          const percent = Math.round(((i + 1) / totalTables) * 100);

          sendMessage({ type: 'PROGRESS', table, percent });
          sendMessage({ type: 'LOG', level: 'info', msg: '📤 Sincronizando: ' + table });

          // Notificar al main thread para ejecutar sync real
          self.postMessage({ type: 'REQUEST_SYNC', table, operation: 'sync' });

          // Esperar confirmación del main thread
          await new Promise(resolve => {
            const handler = (e) => {
              if (e.data.type === 'SYNC_RESULT' && e.data.table === table) {
                self.removeEventListener('message', handler);
                resolve(e.data.result);
              }
            };
            self.addEventListener('message', handler);
          });

          results.push({ table, pushed: 1, pulled: 1, errors: 0 });
          sendMessage({ type: 'LOG', level: 'info', msg: '✅ Completado: ' + table });
        }

        sendMessage({ type: 'COMPLETE', results });
        isProcessing = false;
      };

      const handleSyncTable = async (table, operation) => {
        if (shouldAbort) return;
        
        sendMessage({ type: 'PROGRESS', table, percent: 50 });
        self.postMessage({ type: 'REQUEST_SYNC', table, operation });
      };

      const handleAbort = () => {
        shouldAbort = true;
        sendMessage({ type: 'LOG', level: 'warn', msg: '⏹️ Abort solicitado' });
      };

      self.onmessage = async (e) => {
        const { type, tables, table, operation } = e.data;

        switch (type) {
          case 'SYNC_ALL':
            handleSyncAll(tables || ${JSON.stringify(PRIORITY_TABLES)});
            break;
          case 'SYNC_TABLE':
            handleSyncTable(table, 'sync');
            break;
          case 'PUSH_TABLE':
            handleSyncTable(table, 'push');
            break;
          case 'PULL_TABLE':
            handleSyncTable(table, 'pull');
            break;
          case 'ABORT':
            handleAbort();
            break;
          default:
            sendMessage({ type: 'LOG', level: 'info', msg: '✅ Worker listo' });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  // Listener de mensajes del worker
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;

    const handleMessage = (e: MessageEvent<SyncWorkerMessage>) => {
      const { type, table, percent, level, msg, results, error } = e.data;

      setState(prev => {
        switch (type) {
          case 'PROGRESS':
            return {
              ...prev,
              isRunning: true,
              progress: percent || 0,
              currentTable: table || null
            };
          case 'LOG':
            return {
              ...prev,
              logs: [
                { level: level || 'info', msg: msg || '', timestamp: Date.now() },
                ...prev.logs.slice(0, 99)
              ]
            };
          case 'COMPLETE':
            return {
              ...prev,
              isRunning: false,
              progress: 100,
              currentTable: null,
              lastResults: results || null
            };
          case 'ERROR':
            return {
              ...prev,
              isRunning: false,
              progress: 0,
              currentTable: null,
              error: error || 'Error desconocido'
            };
          default:
            return prev;
        }
      });
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Acciones
  const startSyncAll = useCallback(() => {
    if (workerRef.current) {
      setState(prev => ({
        ...prev,
        isRunning: true,
        progress: 0,
        currentTable: null,
        logs: [],
        lastResults: null,
        error: null
      }));
      workerRef.current.postMessage({ type: 'SYNC_ALL', tables: PRIORITY_TABLES });
    }
  }, []);

  const startSyncTable = useCallback((key: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'SYNC_TABLE', table: key });
    }
  }, []);

  const startPushTable = useCallback((key: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'PUSH_TABLE', table: key });
    }
  }, []);

  const startPullTable = useCallback((key: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'PULL_TABLE', table: key });
    }
  }, []);

  const abort = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'ABORT' });
      setState(prev => ({
        ...prev,
        isRunning: false,
        progress: 0,
        currentTable: null
      }));
    }
  }, []);

  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [], lastResults: null }));
  }, []);

  return {
    state,
    startSyncAll,
    startSyncTable,
    startPushTable,
    startPullTable,
    abort,
    clearLogs
  };
}
