/**
 * useAudit - Hook para registro de auditoría estilo AppSheet
 * 
 * Proporciona trazabilidad completa de cambios en la aplicación:
 * - CREATE, UPDATE, DELETE por registro
 * - Historial de cambios por tabla/registro
 * - Sincronización a la nube
 * 
 * @example
 * ```tsx
 * const { log, getRecordHistory, getTableHistory } = useAudit();
 * 
 * // Registrar un cambio
 * await log({
 *   tableName: 'events',
 *   recordId: '123',
 *   action: 'UPDATE',
 *   fieldName: 'quantity',
 *   oldValue: '10',
 *   newValue: '15'
 * });
 * 
 * // Obtener historial de un registro
 * const history = await getRecordHistory('events', '123');
 * ```
 */

import { useCallback } from 'react';
import { db, type AuditLogEntry } from '@/db';
import { useAppStore } from '@/stores';

// Device info helper
const getDeviceInfo = (): string => {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  return `${platform} | ${ua.substring(0, 50)}`;
};

// Current user helper (integrate with your auth system)
const getCurrentUserId = (): string => {
  try {
    return useAppStore.getState().settings?.userId || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

export interface CreateAuditEntry {
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId?: string;
}

export interface UseAuditReturn {
  /** Registrar un cambio */
  log: (entry: CreateAuditEntry) => Promise<void>;
  /** Obtener historial de un registro específico */
  getRecordHistory: (tableName: string, recordId: string) => Promise<AuditLogEntry[]>;
  /** Obtener historial de una tabla completa */
  getTableHistory: (tableName: string, limit?: number) => Promise<AuditLogEntry[]>;
  /** Obtener historial de un usuario */
  getUserHistory: (userId?: string, limit?: number) => Promise<AuditLogEntry[]>;
  /** Obtener entradas no sincronizadas */
  getPendingSync: () => Promise<AuditLogEntry[]>;
  /** Marcar entradas como sincronizadas */
  markSynced: (ids: number[]) => Promise<void>;
  /** Limpiar logs antiguos */
  purgeOld: (beforeTimestamp: number) => Promise<number>;
}

/**
 * Hook de auditoría - debe llamarse dentro de React context
 */
export function useAudit(): UseAuditReturn {
  
  const log = useCallback(async (entry: CreateAuditEntry) => {
    const auditEntry: Omit<AuditLogEntry, 'id'> = {
      tableName: entry.tableName,
      recordId: entry.recordId,
      action: entry.action,
      fieldName: entry.fieldName,
      oldValue: entry.oldValue !== undefined ? JSON.stringify(entry.oldValue) : undefined,
      newValue: entry.newValue !== undefined ? JSON.stringify(entry.newValue) : undefined,
      userId: entry.userId || getCurrentUserId(),
      deviceInfo: getDeviceInfo(),
      timestamp: Date.now(),
      synced: false,
    };

    await db.audit_logs.add(auditEntry as AuditLogEntry);
  }, []);

  const getRecordHistory = useCallback(async (tableName: string, recordId: string): Promise<AuditLogEntry[]> => {
    return db.audit_logs
      .where('[tableName+recordId]')
      .equals([tableName, recordId])
      .reverse()
      .sortBy('timestamp');
  }, []);

  const getTableHistory = useCallback(async (tableName: string, limit = 50): Promise<AuditLogEntry[]> => {
    return db.audit_logs
      .where('tableName')
      .equals(tableName)
      .reverse()
      .limit(limit)
      .toArray();
  }, []);

  const getUserHistory = useCallback(async (userId?: string, limit = 50): Promise<AuditLogEntry[]> => {
    const uid = userId || getCurrentUserId();
    return db.audit_logs
      .where('userId')
      .equals(uid)
      .reverse()
      .limit(limit)
      .toArray();
  }, []);

  const getPendingSync = useCallback(async (): Promise<AuditLogEntry[]> => {
    return db.audit_logs
      .where('synced')
      .equals(0) // false stored as 0 in IndexedDB
      .toArray();
  }, []);

  const markSynced = useCallback(async (ids: number[]): Promise<void> => {
    await db.audit_logs
      .where('id!')
      .anyOf(ids)
      .modify({ synced: true });
  }, []);

  const purgeOld = useCallback(async (beforeTimestamp: number): Promise<number> => {
    const toDelete = await db.audit_logs
      .where('timestamp')
      .below(beforeTimestamp)
      .toArray();
    
    const ids = toDelete.map(l => l.id!).filter(Boolean);
    await db.audit_logs.bulkDelete(ids);
    return ids.length;
  }, []);

  return {
    log,
    getRecordHistory,
    getTableHistory,
    getUserHistory,
    getPendingSync,
    markSynced,
    purgeOld,
  };
}

// Versión standalone para uso fuera de React (en services, etc.)
export const auditService = {
  async log(entry: CreateAuditEntry): Promise<void> {
    const auditEntry: Omit<AuditLogEntry, 'id'> = {
      tableName: entry.tableName,
      recordId: entry.recordId,
      action: entry.action,
      fieldName: entry.fieldName,
      oldValue: entry.oldValue !== undefined ? JSON.stringify(entry.oldValue) : undefined,
      newValue: entry.newValue !== undefined ? JSON.stringify(entry.newValue) : undefined,
      userId: entry.userId || getCurrentUserId(),
      deviceInfo: getDeviceInfo(),
      timestamp: Date.now(),
      synced: false,
    };

    await db.audit_logs.add(auditEntry as AuditLogEntry);
  },

  async getRecordHistory(tableName: string, recordId: string): Promise<AuditLogEntry[]> {
    return db.audit_logs
      .where('[tableName+recordId]')
      .equals([tableName, recordId])
      .reverse()
      .sortBy('timestamp');
  },

  async getTableHistory(tableName: string, limit = 50): Promise<AuditLogEntry[]> {
    return db.audit_logs
      .where('tableName')
      .equals(tableName)
      .reverse()
      .limit(limit)
      .toArray();
  },
};

export default useAudit;
