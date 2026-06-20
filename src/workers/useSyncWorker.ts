/**
 * =============================================================================
 * useSyncWorker - Hook para integración con Web Worker de Sincronización
 * =============================================================================
 * 
 * Proporciona una interfaz para controlar el Web Worker de sincronización
 * con soporte para:
 * - Sincronización en segundo plano
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
  startSyncAll: () => void;
  startSyncTable: (key: string) => void;
  startPushTable: (key: string) => void;
  startPullTable: (key: string) => void;
  abort: () => void;
  clearLogs: () => void;
}

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
    const workerCode = `
      const BATCH_SIZE = 100;
      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 1000;

      let isProcessing = false;
      let shouldAbort = false;

      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      const sendMessage = (response) => {
        self.postMessage(response);
      };

      const handleSyncAll = async (tables) => {
        if (isProcessing) return;
        isProcessing = true;
        shouldAbort = false;

        sendMessage({ type: 'LOG', level: 'info', msg: 'Iniciando sincronización completa...' });

        const results = [];
        const totalTables = tables.length;

        for (let i = 0; i < tables.length; i++) {
          if (shouldAbort) {
            sendMessage({ type: 'LOG', level: 'warn', msg: 'Sincronización cancelada por usuario' });
            break;
          }

          const table = tables[i];
          const percent = Math.round(((i + 1) / totalTables) * 100);

          sendMessage({ type: 'PROGRESS', table, percent });

          try {
            // Simular sync - en producción reemplazar con lógica real
            await sleep(300);
            
            results.push({
              table,
              pushed: Math.floor(Math.random() * 10),
              pulled: Math.floor(Math.random() * 10),
              errors: 0
            });

            sendMessage({ type: 'LOG', level: 'info', msg: '✓ Tabla sincronizada: ' + table });
          } catch (err) {
            sendMessage({ type: 'LOG', level: 'error', msg: '✗ Error en ' + table + ': ' + err.message });
            results.push({ table, pushed: 0, pulled: 0, errors: 1 });
          }
        }

        sendMessage({ type: 'COMPLETE', results });
        isProcessing = false;
      };

      const handleAbort = () => {
        shouldAbort = true;
        sendMessage({ type: 'LOG', level: 'warn', msg: 'Abort solicitado' });
      };

      self.onmessage = async (e) => {
        const { type, key, tables } = e.data;

        switch (type) {
          case 'SYNC_ALL':
            handleSyncAll(tables || ['products', 'providers', 'sessions', 'scans', 'expiry', 'events']);
            break;
          case 'ABORT':
            handleAbort();
            break;
          default:
            sendMessage({ type: 'LOG', level: 'info', msg: 'Worker listo' });
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
                ...prev.logs.slice(0, 99) // Mantener últimos 100 logs
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
      workerRef.current.postMessage({ type: 'SYNC_ALL' });
    }
  }, []);

  const startSyncTable = useCallback((key: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'SYNC_TABLE', key });
    }
  }, []);

  const startPushTable = useCallback((key: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'PUSH_TABLE', key });
    }
  }, []);

  const startPullTable = useCallback((key: string) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'PULL_TABLE', key });
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
