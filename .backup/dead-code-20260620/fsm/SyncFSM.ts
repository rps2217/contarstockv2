import type { SyncState, SyncEvent, SyncContext, SyncResult, SyncError, UploadGroup } from './types';

/**
 * Configuracion por defecto
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  batchSize: 500,
  timeoutMs: 30000,
};

/**
 * Maquina de estados finitos para sincronizacion
 * Implementa el patron State Machine para gestionar el flujo de sync
 */
export class SyncFSM {
  private state: SyncState = 'idle';
  private context: SyncContext;
  private config = DEFAULT_CONFIG;
  private listeners: Set<(state: SyncState, context: SyncContext) => void> = new Set();

  constructor(initialContext?: Partial<SyncContext>) {
    this.context = {
      pendingCount: 0,
      processedCount: 0,
      errors: [],
      retryCount: 0,
      ...initialContext,
    };
  }

  /** Obtener estado actual */
  getState(): SyncState {
    return this.state;
  }

  /** Obtener contexto actual */
  getContext(): SyncContext {
    return { ...this.context };
  }

  /** Suscribirse a cambios de estado */
  subscribe(listener: (state: SyncState, context: SyncContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Notificar a listeners */
  private notify(): void {
    const snapshot = { state: this.state, context: this.context };
    this.listeners.forEach(listener => listener(snapshot.state, snapshot.context));
  }

  /** Verificar si puede procesar evento */
  private canHandle(event: SyncEvent): boolean {
    const transitions: Record<SyncState, string[]> = {
      idle: ['START_SYNC'],
      preparing: ['SYNC_COMPLETE', 'SYNC_ERROR', 'CANCEL'],
      uploading: ['BATCH_COMPLETE', 'SYNC_ERROR', 'NETWORK_ERROR', 'CANCEL'],
      waiting: ['SYNC_COMPLETE', 'TIMEOUT', 'CANCEL'],
      processing: ['SYNC_COMPLETE', 'SYNC_ERROR', 'CANCEL'],
      success: ['START_SYNC'],
      error: ['RETRY', 'START_SYNC', 'CANCEL'],
      retrying: ['SYNC_COMPLETE', 'SYNC_ERROR', 'CANCEL'],
    };
    return transitions[this.state]?.includes(event.type) ?? false;
  }

  /** Transicionar a un nuevo estado */
  private transition(newState: SyncState, contextUpdate?: Partial<SyncContext>): void {
    const prevState = this.state;
    this.state = newState;
    this.context = { ...this.context, ...contextUpdate };
    this.notify();
    console.log(`[SyncFSM] ${prevState} -> ${newState}`, contextUpdate);
  }

  /** Procesar un evento */
  handle(event: SyncEvent): boolean {
    if (!this.canHandle(event)) {
      console.warn(`[SyncFSM] Cannot handle ${event.type} in state ${this.state}`);
      return false;
    }

    switch (event.type) {
      case 'START_SYNC':
        return this.onStartSync();
      
      case 'SYNC_COMPLETE':
        return this.onSyncComplete();
      
      case 'SYNC_ERROR':
        return this.onSyncError(event.error);
      
      case 'RETRY':
        return this.onRetry();
      
      case 'CANCEL':
        return this.onCancel();
      
      case 'BATCH_COMPLETE':
        return this.onBatchComplete();
      
      case 'NETWORK_ERROR':
        return this.onNetworkError(event.error);
      
      case 'TIMEOUT':
        return this.onTimeout();
      
      default:
        return false;
    }
  }

  /** START_SYNC */
  private onStartSync(): boolean {
    if (this.state === 'idle' || this.state === 'success' || this.state === 'error') {
      this.transition('preparing', {
        startTime: Date.now(),
        processedCount: 0,
        errors: [],
        retryCount: 0,
        lastError: undefined,
      });
      return true;
    }
    return false;
  }

  /** SYNC_COMPLETE */
  private onSyncComplete(): boolean {
    if (['uploading', 'processing', 'waiting', 'retrying'].includes(this.state)) {
      this.transition('success');
      return true;
    }
    return false;
  }

  /** SYNC_ERROR */
  private onSyncError(error: string): boolean {
    const syncError: SyncError = {
      table: this.context.currentGroup?.tableName ?? 'unknown',
      message: error,
      timestamp: Date.now(),
      retryable: true,
    };

    if (this.context.retryCount < this.config.maxRetries) {
      this.transition('error', {
        lastError: error,
        errors: [...this.context.errors, syncError],
        retryCount: this.context.retryCount + 1,
      });
    } else {
      this.transition('error', {
        lastError: error,
        errors: [...this.context.errors, syncError],
      });
    }
    return true;
  }

  /** RETRY */
  private onRetry(): boolean {
    if (this.state === 'error' && this.context.retryCount < this.config.maxRetries) {
      this.transition('retrying', {
        retryCount: this.context.retryCount + 1,
      });
      return true;
    }
    return false;
  }

  /** CANCEL */
  private onCancel(): boolean {
    const validStates: SyncState[] = ['preparing', 'uploading', 'waiting', 'processing', 'retrying'];
    if (validStates.includes(this.state)) {
      this.transition('idle');
      return true;
    }
    return false;
  }

  /** BATCH_COMPLETE */
  private onBatchComplete(): boolean {
    if (this.state === 'uploading') {
      this.transition('processing', {
        processedCount: this.context.processedCount + 1,
      });
      return true;
    }
    return false;
  }

  /** NETWORK_ERROR */
  private onNetworkError(error: string): boolean {
    const syncError: SyncError = {
      table: this.context.currentGroup?.tableName ?? 'network',
      message: error,
      timestamp: Date.now(),
      retryable: true,
    };

    if (this.state === 'uploading') {
      if (this.context.retryCount < this.config.maxRetries) {
        this.transition('retrying', {
          lastError: error,
          errors: [...this.context.errors, syncError],
          retryCount: this.context.retryCount + 1,
        });
      } else {
        this.transition('error', {
          lastError: error,
          errors: [...this.context.errors, syncError],
        });
      }
      return true;
    }
    return false;
  }

  /** TIMEOUT */
  private onTimeout(): boolean {
    if (this.state === 'waiting') {
      this.transition('error', {
        lastError: 'Timeout waiting for response',
      });
      return true;
    }
    return false;
  }

  /** Configurar la maquina */
  configure(config: Partial<typeof DEFAULT_CONFIG>): void {
    this.config = { ...this.config, ...config };
  }

  /** Resetear al estado inicial */
  reset(): void {
    this.state = 'idle';
    this.context = {
      pendingCount: 0,
      processedCount: 0,
      errors: [],
      retryCount: 0,
    };
    this.notify();
  }

  /** Obtener resultado del sync */
  getResult(): SyncResult {
    return {
      success: this.state === 'success',
      processedCount: this.context.processedCount,
      errorCount: this.context.errors.length,
      durationMs: this.context.startTime ? Date.now() - this.context.startTime : 0,
      errors: this.context.errors,
    };
  }

  /** Verificar si esta en ejecucion */
  isRunning(): boolean {
    return ['preparing', 'uploading', 'waiting', 'processing', 'retrying'].includes(this.state);
  }

  /** Verificar si puede iniciar sync */
  canStart(): boolean {
    return ['idle', 'success', 'error'].includes(this.state);
  }
}

/** Singleton para uso global */
export const syncFSM = new SyncFSM();
