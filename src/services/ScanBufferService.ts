/**
 * ScanBufferService - Servicio mejorado para manejo de buffer de escaneos
 *
 * Mejoras sobre pendingBuffer:
 * - Flush periódico para evitar pérdida de datos
 * - Persistencia en localStorage como backup
 * - Flush en beforeunload
 * - Métricas de sincronización
 */

import { db } from '../db';
import { logger } from './logger';
import { ScanRecord } from '../types';

// ============================================================================
// TIPOS
// ============================================================================

interface PendingScan extends Omit<ScanRecord, 'id'> {
  id: string;
  localId: string; // ID temporal para tracking
}

interface BufferMetrics {
  pendingCount: number;
  totalProcessed: number;
  lastFlushTime: number;
  flushErrors: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const FLUSH_INTERVAL_MS = 5000; // Flush cada 5 segundos
const MAX_BUFFER_SIZE = 100; // Forzar flush si llega a este límite
const STORAGE_KEY = 'countarstock_pending_scans';

// ============================================================================
// SERVICIO
// ============================================================================

class ScanBufferServiceClass {
  private buffer: PendingScan[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private metrics: BufferMetrics = {
    pendingCount: 0,
    totalProcessed: 0,
    lastFlushTime: 0,
    flushErrors: 0,
  };

  constructor() {
    this.init();
  }

  private init(): void {
    // Restaurar buffer desde localStorage si existe
    this.restoreFromStorage();

    // Iniciar flush periódico
    this.startFlushTimer();

    // Registrar beforeunload
    this.registerBeforeUnload();

    logger.info('ScanBuffer', 'Initialized', {
      restoredCount: this.buffer.length,
    });
  }

  /**
   * Agregar un scan al buffer
   */
  add(scan: Omit<ScanRecord, 'id'>): PendingScan {
    const pendingScan: PendingScan = {
      id: crypto.randomUUID(),
      localId: crypto.randomUUID(),
      ...scan,
      synced: 0,
      timestamp: Date.now(),
    };

    this.buffer.push(pendingScan);
    this.metrics.pendingCount = this.buffer.length;

    // Persistir en localStorage como backup
    this.persistToStorage();

    // Si el buffer está lleno, hacer flush inmediatamente
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.flush().catch(err => {
        logger.error('ScanBuffer', 'Emergency flush failed', { error: String(err) });
      });
    }

    return pendingScan;
  }

  /**
   * Obtener el buffer actual
   */
  getBuffer(): PendingScan[] {
    return [...this.buffer];
  }

  /**
   * Obtener métricas del buffer
   */
  getMetrics(): BufferMetrics {
    return { ...this.metrics };
  }

  /**
   * Flush manual - guardar todos los scans pendientes
   */
  async flush(): Promise<number> {
    if (this.isProcessing || this.buffer.length === 0) {
      return 0;
    }

    this.isProcessing = true;
    const toFlush = [...this.buffer];
    this.buffer = [];

    try {
      // Bulk add a IndexedDB
      const ids = await db.scans.bulkAdd(
        toFlush.map(s => ({
          id: s.id,
          sessionId: s.sessionId,
          barcode: s.barcode,
          quantity: s.quantity,
          mm: s.mm,
          yyyy: s.yyyy,
          location: s.location,
          batch: s.batch,
          synced: 0,
          timestamp: s.timestamp,
        }))
      );

      // Limpiar localStorage backup
      this.clearStorage();

      // Actualizar métricas
      this.metrics.pendingCount = 0;
      this.metrics.totalProcessed += toFlush.length;
      this.metrics.lastFlushTime = Date.now();

      logger.debug('ScanBuffer', 'Flushed', { count: toFlush.length });

      return toFlush.length;
    } catch (error) {
      // En caso de error, restaurar el buffer
      this.buffer = [...toFlush, ...this.buffer];
      this.metrics.flushErrors++;

      logger.error('ScanBuffer', 'Flush failed, buffer restored', {
        error: String(error),
        restoredCount: toFlush.length,
      });

      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Remover un scan específico (para undo)
   */
  remove(localId: string): PendingScan | null {
    const index = this.buffer.findIndex(s => s.localId === localId);
    if (index === -1) return null;

    const [removed] = this.buffer.splice(index, 1);
    this.metrics.pendingCount = this.buffer.length;
    this.persistToStorage();

    return removed;
  }

  /**
   * Limpiar buffer completamente
   */
  clear(): void {
    this.buffer = [];
    this.metrics.pendingCount = 0;
    this.clearStorage();
  }

  /**
   * Iniciar timer de flush periódico
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush().catch(err => {
          logger.warn('ScanBuffer', 'Periodic flush failed', { error: String(err) });
        });
      }
    }, FLUSH_INTERVAL_MS);
  }

  /**
   * Detener timer de flush
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Registrar beforeunload para flush de emergencia
   */
  private registerBeforeUnload(): void {
    const handler = () => {
      if (this.buffer.length > 0) {
        // Intentar sincrono - esto es lo mejor que podemos hacer
        const data = JSON.stringify(this.buffer);
        localStorage.setItem(STORAGE_KEY, data);
        logger.debug('ScanBuffer', 'Saved to localStorage on unload', {
          count: this.buffer.length,
        });
      }
    };

    window.addEventListener('beforeunload', handler);
  }

  /**
   * Persistir buffer en localStorage
   */
  private persistToStorage(): void {
    try {
      const data = JSON.stringify({
        buffer: this.buffer,
        timestamp: Date.now(),
      });
      localStorage.setItem(STORAGE_KEY, data);
    } catch (error) {
      // Storage lleno - intentar limpiar y reintentar
      logger.warn('ScanBuffer', 'Storage full, attempting recovery');
      this.clearStorage();
    }
  }

  /**
   * Restaurar buffer desde localStorage
   */
  private restoreFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return;

      const parsed = JSON.parse(data);
      const { buffer, timestamp } = parsed;

      // Solo restaurar si tiene menos de 1 hora
      const ONE_HOUR = 60 * 60 * 1000;
      if (Date.now() - timestamp < ONE_HOUR && Array.isArray(buffer)) {
        this.buffer = buffer;
        this.metrics.pendingCount = buffer.length;
        logger.info('ScanBuffer', 'Restored from storage', {
          count: buffer.length,
          age: Date.now() - timestamp,
        });
      } else {
        this.clearStorage();
      }
    } catch (error) {
      logger.error('ScanBuffer', 'Failed to restore from storage', { error });
      this.clearStorage();
    }
  }

  /**
   * Limpiar localStorage
   */
  private clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Cleanup - debe llamarse al cerrar la app
   */
  destroy(): void {
    this.stopFlushTimer();
    this.flush().catch(() => {
      // Ignore errors on destroy
    });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const ScanBufferService = new ScanBufferServiceClass();

// Exportar tipos
export type { PendingScan, BufferMetrics };

export default ScanBufferService;
