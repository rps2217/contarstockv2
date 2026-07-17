/**
 * SessionLockManager - Sistema de Bloqueos para Sesiones
 *
 * Previene conflictos cuando múltiples operadores intentan trabajar
 * en la misma sesión de conteo.
 *
 * Features:
 * - Adquisición y liberación de locks
 * - TTL (Time To Live) para locks automáticos
 * - Extensión de locks
 * - Detección de deadlocks
 * - Persistencia en IndexedDB para recuperación
 */

import { db } from '../../db';
import { logger } from '@/services/logger';
import { EventBus, AppEvents } from '@/core/events/EventBus';

// ============================================================================
// TIPOS
// ============================================================================

export interface SessionLock {
  id?: number;
  sessionId: string;
  lockedBy: string;
  lockedByName?: string;
  lockedAt: number;
  expiresAt: number;
  lastHeartbeat?: number;
  metadata?: Record<string, unknown>;
}

export interface LockResult {
  success: boolean;
  lock?: SessionLock;
  error?: string;
  heldBy?: string;
  heldByName?: string;
}

export interface LockInfo {
  sessionId: string;
  isLocked: boolean;
  lock?: SessionLock;
  canAcquire: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minuto
const CLEANUP_INTERVAL = 60 * 1000; // 1 minuto
const MAX_LOCK_EXTENSION = 30 * 60 * 1000; // 30 minutos máximo

// ============================================================================
// SERVICE
// ============================================================================

class SessionLockManagerClass {
  private locks = new Map<string, SessionLock>();
  private heartbeatTimers = new Map<string, ReturnType<typeof setInterval>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private currentOperatorId: string | null = null;
  private currentOperatorName: string | null = null;

  /**
   * Inicializar con información del operador actual
   */
  init(operatorId: string, operatorName?: string): void {
    this.currentOperatorId = operatorId;
    this.currentOperatorName = operatorName || null;
    this.startCleanup();
    logger.info('SessionLockManager', 'Initialized', { operatorId });
  }

  /**
   * Adquirir un lock para una sesión
   */
  async acquireLock(
    sessionId: string,
    operatorId?: string,
    operatorName?: string,
    ttl: number = DEFAULT_TTL
  ): Promise<LockResult> {
    const lockOwner = operatorId || this.currentOperatorId;
    const lockOwnerName = operatorName || this.currentOperatorName;

    if (!lockOwner) {
      return {
        success: false,
        error: 'No operator ID provided',
      };
    }

    try {
      // Verificar lock existente en memoria
      const existingLock = this.locks.get(sessionId);

      if (existingLock) {
        // Verificar si está expirado
        if (existingLock.expiresAt < Date.now()) {
          // Lock expirado, remover
          this.locks.delete(sessionId);
        } else if (existingLock.lockedBy !== lockOwner) {
          // Lock activo de otro operador
          return {
            success: false,
            error: 'Session is locked by another operator',
            heldBy: existingLock.lockedBy,
            heldByName: existingLock.lockedByName,
          };
        } else {
          // Mismo operador, extender
          return this.extendLock(sessionId, ttl);
        }
      }

      // Verificar en DB para locks de otras pestañas
      const dbLock = await db.table('sessionLocks').where('sessionId').equals(sessionId).first();

      if (dbLock) {
        if (dbLock.expiresAt > Date.now() && dbLock.lockedBy !== lockOwner) {
          return {
            success: false,
            error: 'Session is locked by another operator',
            heldBy: dbLock.lockedBy,
            heldByName: dbLock.lockedByName,
          };
        }
      }

      // Crear nuevo lock
      const lock: SessionLock = {
        sessionId,
        lockedBy: lockOwner,
        lockedByName: lockOwnerName || undefined,
        lockedAt: Date.now(),
        expiresAt: Date.now() + ttl,
        lastHeartbeat: Date.now(),
      };

      // Guardar en memoria
      this.locks.set(sessionId, lock);

      // Persistir en DB
      await this.persistLock(lock);

      // Iniciar heartbeat
      this.startHeartbeat(sessionId);

      // Publicar evento
      EventBus.publish(AppEvents.SESSION_LOCK_ACQUIRED, {
        sessionId,
        lockedBy: lockOwner,
      });

      logger.info('SessionLockManager', 'Lock acquired', {
        sessionId,
        lockedBy: lockOwner,
        ttl,
      });

      return { success: true, lock };
    } catch (error) {
      logger.error('SessionLockManager', 'Failed to acquire lock', {
        sessionId,
        error,
      });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Liberar un lock
   */
  async releaseLock(sessionId: string, operatorId?: string): Promise<boolean> {
    const lockOwner = operatorId || this.currentOperatorId;

    if (!lockOwner) {
      return false;
    }

    try {
      const lock = this.locks.get(sessionId);

      if (!lock) {
        return true; // No hay lock que liberar
      }

      // Verificar propiedad
      if (lock.lockedBy !== lockOwner) {
        logger.warn('SessionLockManager', 'Cannot release lock owned by another', {
          sessionId,
          requestedBy: lockOwner,
          ownedBy: lock.lockedBy,
        });
        return false;
      }

      // Remover de memoria
      this.locks.delete(sessionId);

      // Detener heartbeat
      this.stopHeartbeat(sessionId);

      // Remover de DB
      await db.table('sessionLocks').where('sessionId').equals(sessionId).delete();

      // Publicar evento
      EventBus.publish(AppEvents.SESSION_LOCK_RELEASED, {
        sessionId,
        lockedBy: lockOwner,
      });

      logger.info('SessionLockManager', 'Lock released', { sessionId });
      return true;
    } catch (error) {
      logger.error('SessionLockManager', 'Failed to release lock', {
        sessionId,
        error,
      });
      return false;
    }
  }

  /**
   * Extender un lock existente
   */
  async extendLock(sessionId: string, additionalTtl: number = DEFAULT_TTL): Promise<LockResult> {
    const operatorId = this.currentOperatorId;

    if (!operatorId) {
      return { success: false, error: 'No operator ID' };
    }

    // Verificar que somos propietarios
    const lock = this.locks.get(sessionId);
    if (!lock || lock.lockedBy !== operatorId) {
      return { success: false, error: 'Not the lock owner' };
    }

    // Verificar que no exceda el máximo
    const totalTtl = lock.expiresAt - lock.lockedAt + additionalTtl;
    if (totalTtl > MAX_LOCK_EXTENSION + DEFAULT_TTL) {
      return { success: false, error: 'Maximum lock extension exceeded' };
    }

    // Extender
    lock.expiresAt = Date.now() + additionalTtl;
    lock.lastHeartbeat = Date.now();

    // Persistir
    await this.persistLock(lock);

    logger.debug('SessionLockManager', 'Lock extended', {
      sessionId,
      newExpiresAt: lock.expiresAt,
    });

    return { success: true, lock };
  }

  /**
   * Verificar si una sesión está bloqueada
   */
  async getLockInfo(sessionId: string): Promise<LockInfo> {
    // Verificar en memoria primero
    let lock = this.locks.get(sessionId);

    if (!lock) {
      // Verificar en DB
      lock = (await db.table('sessionLocks').where('sessionId').equals(sessionId).first()) as
        SessionLock | undefined;
    }

    if (!lock) {
      return {
        sessionId,
        isLocked: false,
        canAcquire: true,
      };
    }

    // Verificar expiración
    if (lock.expiresAt < Date.now()) {
      // Lock expirado
      await this.releaseLock(sessionId, lock.lockedBy);
      return {
        sessionId,
        isLocked: false,
        canAcquire: true,
      };
    }

    return {
      sessionId,
      isLocked: true,
      lock,
      canAcquire: lock.lockedBy === this.currentOperatorId,
    };
  }

  /**
   * Obtener todos los locks activos
   */
  async getAllLocks(): Promise<SessionLock[]> {
    const memoryLocks = Array.from(this.locks.values());

    const dbLocks = await db.table('sessionLocks').toArray();

    // Combinar y filtrar expirados
    const allLocks = [...memoryLocks, ...dbLocks];
    const validLocks = allLocks.filter(l => l.expiresAt > Date.now());

    // Remover duplicados (preferir memoria)
    const uniqueLocks = new Map<string, SessionLock>();
    for (const lock of validLocks) {
      if (!uniqueLocks.has(lock.sessionId) || this.locks.has(lock.sessionId)) {
        uniqueLocks.set(lock.sessionId, lock);
      }
    }

    return Array.from(uniqueLocks.values());
  }

  /**
   * Forzar liberación de un lock (solo admins)
   */
  async forceRelease(sessionId: string): Promise<boolean> {
    try {
      this.locks.delete(sessionId);
      this.stopHeartbeat(sessionId);
      await db.table('sessionLocks').where('sessionId').equals(sessionId).delete();

      EventBus.publish(AppEvents.SESSION_LOCK_FORCED, { sessionId });

      logger.warn('SessionLockManager', 'Lock force released', { sessionId });
      return true;
    } catch (error) {
      logger.error('SessionLockManager', 'Failed to force release', {
        sessionId,
        error,
      });
      return false;
    }
  }

  /**
   * Persistir lock en DB
   */
  private async persistLock(lock: SessionLock): Promise<void> {
    // Remover lock anterior si existe
    await db.table('sessionLocks').where('sessionId').equals(lock.sessionId).delete();

    // Agregar nuevo
    await db.table('sessionLocks').add(lock);
  }

  /**
   * Iniciar heartbeat para un lock
   */
  private startHeartbeat(sessionId: string): void {
    if (this.heartbeatTimers.has(sessionId)) {
      return;
    }

    const timer = setInterval(async () => {
      const lock = this.locks.get(sessionId);
      if (!lock) {
        this.stopHeartbeat(sessionId);
        return;
      }

      // Actualizar heartbeat
      lock.lastHeartbeat = Date.now();

      // Verificar que no haya expirado
      if (lock.expiresAt < Date.now()) {
        await this.releaseLock(sessionId, lock.lockedBy);
        return;
      }

      // Persistir
      await this.persistLock(lock);
    }, HEARTBEAT_INTERVAL);

    this.heartbeatTimers.set(sessionId, timer);
  }

  /**
   * Detener heartbeat
   */
  private stopHeartbeat(sessionId: string): void {
    const timer = this.heartbeatTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(sessionId);
    }
  }

  /**
   * Iniciar cleanup de locks expirados
   */
  private startCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(async () => {
      await this.cleanup();
    }, CLEANUP_INTERVAL);
  }

  /**
   * Limpiar locks expirados
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    try {
      const now = Date.now();

      // Limpiar de memoria
      for (const [sessionId, lock] of this.locks.entries()) {
        if (lock.expiresAt < now) {
          this.locks.delete(sessionId);
          this.stopHeartbeat(sessionId);
          cleaned++;
        }
      }

      // Limpiar de DB
      const expiredLocks = await db
        .table('sessionLocks')
        .filter(lock => lock.expiresAt < now)
        .toArray();

      if (expiredLocks.length > 0) {
        await db
          .table('sessionLocks')
          .where('sessionId')
          .anyOf(expiredLocks.map(l => l.sessionId))
          .delete();
        cleaned += expiredLocks.length;
      }

      if (cleaned > 0) {
        logger.info('SessionLockManager', 'Cleanup completed', { cleaned });
      }
    } catch (error) {
      logger.error('SessionLockManager', 'Cleanup failed', { error });
    }

    return cleaned;
  }

  /**
   * Destruir el servicio
   */
  destroy(): void {
    // Limpiar timers
    for (const timer of this.heartbeatTimers.values()) {
      clearInterval(timer);
    }
    this.heartbeatTimers.clear();

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Liberar todos los locks del operador actual
    if (this.currentOperatorId) {
      for (const [sessionId, lock] of this.locks.entries()) {
        if (lock.lockedBy === this.currentOperatorId) {
          this.releaseLock(sessionId, this.currentOperatorId);
        }
      }
    }

    this.locks.clear();
    this.currentOperatorId = null;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const SessionLockManager = new SessionLockManagerClass();
export default SessionLockManager;
