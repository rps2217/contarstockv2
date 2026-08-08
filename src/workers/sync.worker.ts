/**
 * =============================================================================
 * SYNC WORKER - Sincronización en Segundo Plano
 * =============================================================================
 *
 * Este Web Worker ejecuta el ciclo de sincronización fuera del hilo principal
 * para evitar bloquear la UI.
 *
 * BENEFICIOS:
 * - UI tetap responsif durante sincronización
 * - Procesamiento paralelo
 * - Notificaciones de progreso
 *
 * COMUNICACIÓN:
 * ┌─────────────┐                         ┌──────────────┐
 * │  Main Thread │ ──── postMessage ────► │  Sync Worker │
 * │             │ ◄─── postMessage ────── │              │
 * └─────────────┘                         └──────────────┘
 *
 * MENSAJES ENTRANTES:
 * - { type: 'SYNC_ALL' }              → Sincronizar todas las tablas
 * - { type: 'SYNC_TABLE', key }       → Sincronizar tabla específica
 * - { type: 'PUSH_TABLE', key }        → Solo subir cambios locales
 * - { type: 'PULL_TABLE', key }        → Solo descargar cambios remotos
 * - { type: 'ABORT' }                  → Cancelar operación actual
 *
 * MENSAJES SALIENTES:
 * - { type: 'PROGRESS', table, percent } → Progreso de sync
 * - { type: 'LOG', level, msg }         → Log para consola
 * - { type: 'COMPLETE', results }       → Sync completado
 * - { type: 'ERROR', error }            → Error en sync
 *
 * @module sync.worker
 */

/// <reference lib="webworker" />

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// =============================================================================
// ESTADO DEL WORKER
// =============================================================================

let isProcessing = false;
let shouldAbort = false;

// =============================================================================
// HELPERS
// =============================================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(RETRY_DELAY_MS * Math.pow(2, i)); // Backoff exponencial
    }
  }
  throw new Error('Max retries exceeded');
};

// =============================================================================
// MENSAJES
// =============================================================================

interface SyncMessage {
  type: 'SYNC_ALL' | 'SYNC_TABLE' | 'PUSH_TABLE' | 'PULL_TABLE' | 'ABORT';
  key?: string;
  batchSize?: number;
}

interface SyncResponse {
  type: 'PROGRESS' | 'LOG' | 'COMPLETE' | 'ERROR';
  table?: string;
  percent?: number;
  level?: 'info' | 'warn' | 'error';
  msg?: string;
  results?: {
    table: string;
    pushed: number;
    pulled: number;
    errors: number;
  }[];
  error?: string;
}

const sendMessage = (response: SyncResponse) => {
  self.postMessage(response);
};

// =============================================================================
// HANDLERS DE MENSAJES
// =============================================================================

const handleAbort = () => {
  shouldAbort = true;
  sendMessage({ type: 'LOG', level: 'warn', msg: 'Sync abort requested' });
};

const handleSyncAll = async () => {
  if (isProcessing) {
    sendMessage({ type: 'ERROR', error: 'Sync already in progress' });
    return;
  }

  isProcessing = true;
  shouldAbort = false;

  try {
    sendMessage({ type: 'LOG', level: 'info', msg: 'Starting full sync...' });

    // Tables a sincronizar (las más importantes primero)
    const tables = ['products', 'providers', 'sessions', 'scans', 'expiry', 'events'];

    const results: SyncResponse['results'] = [];
    const totalTables = tables.length;

    for (let i = 0; i < tables.length; i++) {
      if (shouldAbort) {
        sendMessage({ type: 'LOG', level: 'warn', msg: 'Sync aborted by user' });
        break;
      }

      const table = tables[i];
      const percent = Math.round(((i + 1) / totalTables) * 100);

      sendMessage({ type: 'PROGRESS', table, percent });

      try {
        // Simular sync (en producción usar supabase real)
        await sleep(500); // Placeholder para sync real

        results.push({
          table,
          pushed: 0,
          pulled: 0,
          errors: 0,
        });

        sendMessage({ type: 'LOG', level: 'info', msg: `Synced table: ${table}` });
      } catch (err: any) {
        sendMessage({ type: 'LOG', level: 'error', msg: `Error syncing ${table}: ${err.message}` });
        results.push({
          table,
          pushed: 0,
          pulled: 0,
          errors: 1,
        });
      }
    }

    sendMessage({ type: 'COMPLETE', results });
  } catch (error: unknown) {
    sendMessage({ type: 'ERROR', error: (error as Error).message });
  } finally {
    isProcessing = false;
    shouldAbort = false;
  }
};

const handleSyncTable = async (key: string) => {
  sendMessage({ type: 'LOG', level: 'info', msg: `Syncing table: ${key}` });
  sendMessage({ type: 'PROGRESS', table: key, percent: 50 });

  // Placeholder para sync real
  await sleep(300);

  sendMessage({
    type: 'COMPLETE',
    results: [{ table: key, pushed: 0, pulled: 0, errors: 0 }],
  });
};

const handlePushTable = async (key: string) => {
  sendMessage({ type: 'LOG', level: 'info', msg: `Pushing table: ${key}` });
  sendMessage({ type: 'PROGRESS', table: key, percent: 50 });

  // Placeholder para push real
  await sleep(200);

  sendMessage({
    type: 'COMPLETE',
    results: [{ table: key, pushed: 0, pulled: 0, errors: 0 }],
  });
};

const handlePullTable = async (key: string) => {
  sendMessage({ type: 'LOG', level: 'info', msg: `Pulling table: ${key}` });
  sendMessage({ type: 'PROGRESS', table: key, percent: 50 });

  // Placeholder para pull real
  await sleep(200);

  sendMessage({
    type: 'COMPLETE',
    results: [{ table: key, pushed: 0, pulled: 0, errors: 0 }],
  });
};

// =============================================================================
// LISTENER PRINCIPAL
// =============================================================================

self.onmessage = async (e: MessageEvent<SyncMessage>) => {
  const { type, key } = e.data;

  switch (type) {
    case 'ABORT':
      handleAbort();
      break;
    case 'SYNC_ALL':
      await handleSyncAll();
      break;
    case 'SYNC_TABLE':
      if (key) await handleSyncTable(key);
      break;
    case 'PUSH_TABLE':
      if (key) await handlePushTable(key);
      break;
    case 'PULL_TABLE':
      if (key) await handlePullTable(key);
      break;
    default:
      sendMessage({ type: 'ERROR', error: `Unknown message type: ${type}` });
  }
};

// =============================================================================
// EXPORT PARA MODULE WORKERS
// =============================================================================

export {};
