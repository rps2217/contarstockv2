/**
 * Sync FSM - Máquina de estados finitos para sincronización
 * 
 * Proporciona control de flujo robusto con retry automático.
 */

import type { SyncState, SyncEvent, SyncContext } from './types';
import { useSyncStore } from '@/stores';

const MAX_RETRIES = 3;

type TransitionHandler = (ctx: SyncContext) => Partial<SyncContext> | void;

/**
 * Tabla de transiciones de estado
 */
const transitions: Record<SyncState, Partial<Record<SyncEvent['type'], {
  nextState: SyncState;
  handler?: TransitionHandler;
}>>> = {
  idle: {
    START: { nextState: 'preparing' },
  },
  preparing: {
    PREPARED: { nextState: 'uploading' },
    ERROR: { nextState: 'error', handler: (ctx) => ({ error: ctx.error }) },
  },
  uploading: {
    UPLOADING: { nextState: 'uploading', handler: (ctx) => ({ progress: ctx.progress }) },
    WAITING: { nextState: 'waiting' },
    ERROR: { nextState: 'error', handler: (ctx) => ({ error: ctx.error }) },
  },
  waiting: {
    PROCESSING: { nextState: 'processing' },
    ERROR: { nextState: 'error', handler: (ctx) => ({ error: ctx.error }) },
  },
  processing: {
    SUCCESS: { nextState: 'success' },
    ERROR: { nextState: 'error', handler: (ctx) => ({ error: ctx.error }) },
  },
  success: {
    START: { nextState: 'preparing' },
    RESET: { nextState: 'idle' },
  },
  error: {
    RETRY: { nextState: 'retrying', handler: (ctx) => ({ retryCount: ctx.retryCount + 1 }) },
    RESET: { nextState: 'idle' },
  },
  retrying: {
    START: { nextState: 'preparing' },
    ERROR: { nextState: 'error', handler: (ctx) => ({ error: ctx.error }) },
  },
};

class SyncFSMClass {
  private state: SyncState = 'idle';
  private context: SyncContext = {
    progress: 0,
    retryCount: 0,
  };
  private listeners: Set<(state: SyncState, context: SyncContext) => void> = new Set();

  getState(): SyncState {
    return this.state;
  }

  getContext(): SyncContext {
    return { ...this.context };
  }

  isRunning(): boolean {
    return this.state !== 'idle' && this.state !== 'success' && this.state !== 'error';
  }

  subscribe(listener: (state: SyncState, context: SyncContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const update: { isSyncing: boolean; lastError?: string } = { 
      isSyncing: this.isRunning() 
    };
    if (this.context.error) {
      update.lastError = this.context.error;
    }
    useSyncStore.setState(update);
    this.listeners.forEach((l) => l(this.state, this.context));
  }

  dispatch(event: SyncEvent): boolean {
    const transition = transitions[this.state]?.[event.type];
    if (!transition) return false;

    const { nextState, handler } = transition;
    
    // Aplicar updates del handler
    if (handler) {
      const updates = handler(this.context);
      if (updates) {
        this.context = { ...this.context, ...updates };
      }
    }
    
    // Para eventos con payload, actualizar contexto
    if (event.type === 'ERROR' && event.error) {
      this.context.error = event.error;
    }
    if (event.type === 'UPLOADING' && event.progress !== undefined) {
      this.context.progress = event.progress;
    }
    
    this.context.lastUpdate = Date.now();
    this.state = nextState;
    this.notify();
    return true;
  }

  async execute(
    action: () => Promise<void>,
    onProgress?: (msg: string) => void
  ): Promise<void> {
    if (this.state === 'error' && this.context.retryCount >= MAX_RETRIES) {
      throw new Error(`Máximo de reintentos alcanzado: ${this.context.error}`);
    }

    this.dispatch({ type: 'START' });
    try {
      this.dispatch({ type: 'PREPARED' });
      if (onProgress) onProgress('Iniciando sincronización...');

      this.dispatch({ type: 'UPLOADING', progress: 10 });
      await action();
      
      this.dispatch({ type: 'WAITING' });
      if (onProgress) onProgress('Procesando respuesta...');

      this.dispatch({ type: 'PROCESSING' });
      this.dispatch({ type: 'SUCCESS' });
      if (onProgress) onProgress('Sincronización completada');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.dispatch({ type: 'ERROR', error: errorMsg });
      if (onProgress) onProgress(`Error: ${errorMsg}`);
      throw err;
    }
  }

  reset(): void {
    this.state = 'idle';
    this.context = { progress: 0, retryCount: 0 };
    this.notify();
  }
}

export const syncFSM = new SyncFSMClass();

// ============================================================
// COMPATIBILIDAD LEGACY - Wrapper para syncFSM.ts antiguo
// ============================================================

export interface LegacySyncStatus {
  state: 'IDLE' | 'SYNCING' | 'ERROR' | 'SUCCESS';
  lastSync?: number;
  error?: string;
  pendingCount: number;
}

/**
 * Wrapper de compatibilidad para código que usa el viejo syncFSM
 * Convierte la nueva FSM a la API legacy
 */
export const legacySyncWrapper = {
  subscribe(listener: (status: LegacySyncStatus) => void): () => void {
    return syncFSM.subscribe((state, context) => {
      // Mapear estados nuevos a legacy
      let legacyState: LegacySyncStatus['state'];
      switch (state) {
        case 'idle':
        case 'success':
          legacyState = 'IDLE';
          break;
        case 'preparing':
        case 'uploading':
        case 'waiting':
        case 'processing':
        case 'retrying':
          legacyState = 'SYNCING';
          break;
        case 'error':
          legacyState = 'ERROR';
          break;
        default:
          legacyState = 'IDLE';
      }

      listener({
        state: legacyState,
        error: context.error,
        lastSync: context.lastUpdate || 0,
        pendingCount: 0, // Se calcula por separado
      });
    });
  },

  async runSync(onProgress?: (msg: string) => void): Promise<void> {
    // La lógica real de sync está en BatchUploader
    const { performBatchUpload } = await import('../BatchUploader');
    return syncFSM.execute(async () => {
      await performBatchUpload();
    }, onProgress);
  },

  getState(): LegacySyncStatus['state'] {
    const state = syncFSM.getState();
    if (state === 'idle' || state === 'success') return 'IDLE';
    if (state === 'error') return 'ERROR';
    return 'SYNCING';
  },
};
