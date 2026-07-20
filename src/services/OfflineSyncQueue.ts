/**
 * OfflineSyncQueue - Cola de sincronización offline para operaciones críticas
 *
 * Funcionalidades:
 * - Cola local en memoria + localStorage
 * - Priorización de operaciones (crítica, importante, normal)
 * - Reintentos automáticos con backoff exponencial
 * - Indicador visual de estado
 * - Persistencia entre sesiones
 */

import { logger } from './logger';
import { telemetry } from './telemetryService';

// =============================================================================
// TIPOS
// =============================================================================

export type SyncOperationType = 'scan' | 'count' | 'expiry' | 'adjustment' | 'session';

export type SyncPriority = 'critical' | 'important' | 'normal';

export interface QueuedOperation<T = unknown> {
  id: string;
  type: SyncOperationType;
  priority: SyncPriority;
  data: T;
  createdAt: number;
  retryCount: number;
  lastAttempt?: number;
  error?: string;
}

export interface OfflineQueueOptions {
  /** Clave de almacenamiento en localStorage */
  storageKey?: string;
  /** Máximo de reintentos */
  maxRetries?: number;
  /** Tiempo base para backoff (ms) */
  baseBackoffMs?: number;
  /** Máximo de operaciones en cola */
  maxQueueSize?: number;
  /** Sincronizar automáticamente */
  autoSync?: boolean;
  /** Intervalo de sync automático (ms) */
  syncIntervalMs?: number;
}

interface QueueState {
  operations: QueuedOperation[];
  lastSyncAt: number | null;
  isOnline: boolean;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const DEFAULT_OPTIONS: Required<OfflineQueueOptions> = {
  storageKey: 'offline_sync_queue',
  maxRetries: 5,
  baseBackoffMs: 1000,
  maxQueueSize: 1000,
  autoSync: true,
  syncIntervalMs: 30000,
};

const PRIORITY_ORDER: Record<SyncPriority, number> = {
  critical: 0,
  important: 1,
  normal: 2,
};

// =============================================================================
// CLASE
// =============================================================================

export class OfflineSyncQueue {
  private options: Required<OfflineQueueOptions>;
  private operations: Map<string, QueuedOperation> = new Map();
  private syncInProgress = false;
  private isOnline = navigator.onLine;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(state: QueueState) => void> = new Set();

  // Referencias a handlers para cleanup
  private onlineHandler = () => {
    this.isOnline = true;
    logger.info('OfflineSyncQueue', 'Network online');
    this.notifyListeners();
    this.triggerSync();
  };

  private offlineHandler = () => {
    this.isOnline = false;
    logger.info('OfflineSyncQueue', 'Network offline');
    this.notifyListeners();
  };

  constructor(options: OfflineQueueOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadFromStorage();
    this.setupNetworkListeners();
    this.setupAutoSync();
  }

  // ===========================================================================
  // CONFIGURACIÓN
  // ===========================================================================

  private setupNetworkListeners() {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  private setupAutoSync() {
    if (!this.options.autoSync) return;

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress && this.operations.size > 0) {
        this.triggerSync();
      }
    }, this.options.syncIntervalMs);
  }

  // ===========================================================================
  // PERSISTENCIA
  // ===========================================================================

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        const { operations } = JSON.parse(stored) as QueueState;
        operations.forEach((op: QueuedOperation) => {
          this.operations.set(op.id, op);
        });
        logger.info('OfflineSyncQueue', `Loaded ${operations.length} queued operations`);
      }
    } catch (e: unknown) {
      logger.error('OfflineSyncQueue', 'Error loading from storage', e);
    }
  }

  private saveToStorage() {
    try {
      const operations = Array.from(this.operations.values());
      localStorage.setItem(this.options.storageKey, JSON.stringify({ operations }));
    } catch (e: unknown) {
      logger.error('OfflineSyncQueue', 'Error saving to storage', e);
    }
  }

  // ===========================================================================
  // OPERACIONES DE COLA
  // ===========================================================================

  /**
   * Agregar operación a la cola
   */
  enqueue<T>(type: SyncOperationType, data: T, priority: SyncPriority = 'normal'): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const operation: QueuedOperation<T> = {
      id,
      type,
      priority,
      data,
      createdAt: Date.now(),
      retryCount: 0,
    };

    // Verificar tamaño máximo
    if (this.operations.size >= this.options.maxQueueSize) {
      // Remover la más antigua de menor prioridad
      this.removeOldestLowPriority();
    }

    this.operations.set(id, operation);
    this.saveToStorage();
    this.notifyListeners();

    telemetry.track('SYNC', 'OFFLINE_ENQUEUE', { type, priority });

    // Intentar sync si estamos online
    if (this.isOnline) {
      this.triggerSync();
    }

    return id;
  }

  /**
   * Remover operación por ID
   */
  remove(id: string): boolean {
    const deleted = this.operations.delete(id);
    if (deleted) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return deleted;
  }

  /**
   * Limpiar cola completa
   */
  clear(): void {
    this.operations.clear();
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Obtener estado de la cola
   */
  getState(): QueueState {
    return {
      operations: Array.from(this.operations.values()).sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      ),
      lastSyncAt: null,
      isOnline: this.isOnline,
    };
  }

  // ===========================================================================
  // SINCRONIZACIÓN
  // ===========================================================================

  /**
   * Trigger sincronización
   */
  async triggerSync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;
    telemetry.track('SYNC', 'SYNC_START', { queueSize: this.operations.size });

    try {
      const operations = this.getSortedOperations();

      for (const operation of operations) {
        if (!this.isOnline) break;

        try {
          await this.syncOperation(operation);
          this.operations.delete(operation.id);
          telemetry.track('SYNC', 'SYNC_SUCCESS', { id: operation.id });
        } catch (e: unknown) {
          const error = e instanceof Error ? e.message : 'Unknown error';

          if (operation.retryCount >= this.options.maxRetries) {
            logger.error('OfflineSyncQueue', `Max retries exceeded for ${operation.id}`, error);
            this.operations.delete(operation.id);
            telemetry.track('SYNC', 'SYNC_FAILED', { id: operation.id, reason: 'max_retries' });
          } else {
            // Programar reintento con backoff
            operation.retryCount++;
            operation.lastAttempt = Date.now();
            operation.error = error;
            this.operations.set(operation.id, operation);

            const backoffMs = this.options.baseBackoffMs * Math.pow(2, operation.retryCount);
            setTimeout(() => this.triggerSync(), backoffMs);
          }
        }
      }
    } finally {
      this.syncInProgress = false;
      this.saveToStorage();
      this.notifyListeners();
      telemetry.track('SYNC', 'SYNC_COMPLETE', { remaining: this.operations.size });
    }
  }

  /**
   * Sincronizar operación individual (override para implementar lógica real)
   */
  protected async syncOperation(operation: QueuedOperation): Promise<void> {
    // Por defecto, simula sync exitoso
    // Override en subclase para implementar lógica real
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Obtener operaciones ordenadas por prioridad
   */
  private getSortedOperations(): QueuedOperation[] {
    return Array.from(this.operations.values()).sort((a, b) => {
      // Primero por prioridad
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Luego por antigüedad
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Remover operación más antigua de menor prioridad
   */
  private removeOldestLowPriority(): void {
    const sorted = this.getSortedOperations();
    // Usar reverse() para compatibilidad con navegadores que no soportan findLast()
    const lowPriority = [...sorted].reverse().find(op => op.priority === 'normal');
    if (lowPriority) {
      this.operations.delete(lowPriority.id);
    }
  }

  // ===========================================================================
  // LISTENERS
  // ===========================================================================

  subscribe(listener: (state: QueueState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Limpiar event listeners
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);

    this.listeners.clear();
  }
}

// =============================================================================
// INSTANCIA SINGLETON
// =============================================================================

let instance: OfflineSyncQueue | null = null;

export function getOfflineSyncQueue(options?: OfflineQueueOptions): OfflineSyncQueue {
  if (!instance) {
    instance = new OfflineSyncQueue(options);
  }
  return instance;
}
