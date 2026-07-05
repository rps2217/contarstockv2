"use client";
/**
 * useAuditStore - Sistema de Auditoría y Logging de Acciones
 * 
 * Registra todas las acciones importantes realizadas en la aplicación
 * para cumplir con requisitos de trazabilidad y compliance.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'sync'
  | 'export'
  | 'import'
  | 'permission_change'
  | 'settings_change'
  | 'error'
  | 'custom';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLog {
  id: string;
  timestamp: number;
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId?: string;
  userName?: string;
  severity: AuditSeverity;
  description: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    fields?: string[];
  };
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  synced: boolean;
}

interface AuditFilters {
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  severity?: AuditSeverity;
  startDate?: number;
  endDate?: number;
  search?: string;
}

interface AuditState {
  // Logs de auditoría
  logs: AuditLog[];
  
  // Configuración
  maxLogs: number;
  isEnabled: boolean;
  
  // Agregar log
  addLog: (log: Omit<AuditLog, 'id' | 'timestamp' | 'synced'>) => string;
  
  // Consultas
  getLogs: (filters?: AuditFilters, limit?: number) => AuditLog[];
  getLogById: (id: string) => AuditLog | null;
  getLogsByEntity: (entityType: string, entityId: string) => AuditLog[];
  getLogsByUser: (userId: string) => AuditLog[];
  
  // Estadísticas
  getActionStats: (startDate?: number, endDate?: number) => Record<AuditAction, number>;
  getSeverityStats: (startDate?: number, endDate?: number) => Record<AuditSeverity, number>;
  
  // Gestión
  clearLogs: () => void;
  markSynced: (ids: string[]) => void;
  getUnsyncedLogs: () => AuditLog[];
  
  // Config
  setEnabled: (enabled: boolean) => void;
  setMaxLogs: (max: number) => void;
}

let logIdCounter = 0;

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      logs: [],
      maxLogs: 1000,
      isEnabled: true,

      addLog: (logData) => {
        const id = `audit_${Date.now()}_${++logIdCounter}`;
        
        const log: AuditLog = {
          ...logData,
          id,
          timestamp: Date.now(),
          synced: false,
        };

        set((state) => {
          let newLogs = [log, ...state.logs];
          
          // Limitar tamaño
          if (newLogs.length > state.maxLogs) {
            newLogs = newLogs.slice(0, state.maxLogs);
          }
          
          return { logs: newLogs };
        });

        return id;
      },

      getLogs: (filters, limit = 100) => {
        const state = get();
        let filtered = [...state.logs];

        if (filters) {
          if (filters.action) {
            filtered = filtered.filter((l) => l.action === filters.action);
          }
          if (filters.entityType) {
            filtered = filtered.filter((l) => l.entityType === filters.entityType);
          }
          if (filters.entityId) {
            filtered = filtered.filter((l) => l.entityId === filters.entityId);
          }
          if (filters.userId) {
            filtered = filtered.filter((l) => l.userId === filters.userId);
          }
          if (filters.severity) {
            filtered = filtered.filter((l) => l.severity === filters.severity);
          }
          if (filters.startDate) {
            filtered = filtered.filter((l) => l.timestamp >= filters.startDate!);
          }
          if (filters.endDate) {
            filtered = filtered.filter((l) => l.timestamp <= filters.endDate!);
          }
          if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(
              (l) =>
                l.description.toLowerCase().includes(search) ||
                l.entityType.toLowerCase().includes(search) ||
                l.entityId.toLowerCase().includes(search)
            );
          }
        }

        return filtered.slice(0, limit);
      },

      getLogById: (id) => {
        return get().logs.find((l) => l.id === id) || null;
      },

      getLogsByEntity: (entityType, entityId) => {
        return get().logs.filter(
          (l) => l.entityType === entityType && l.entityId === entityId
        );
      },

      getLogsByUser: (userId) => {
        return get().logs.filter((l) => l.userId === userId);
      },

      getActionStats: (startDate, endDate) => {
        const logs = get().logs.filter((l) => {
          if (startDate && l.timestamp < startDate) return false;
          if (endDate && l.timestamp > endDate) return false;
          return true;
        });

        const stats: Record<AuditAction, number> = {
          create: 0,
          read: 0,
          update: 0,
          delete: 0,
          login: 0,
          logout: 0,
          sync: 0,
          export: 0,
          import: 0,
          permission_change: 0,
          settings_change: 0,
          error: 0,
          custom: 0,
        };

        logs.forEach((l) => {
          stats[l.action]++;
        });

        return stats;
      },

      getSeverityStats: (startDate, endDate) => {
        const logs = get().logs.filter((l) => {
          if (startDate && l.timestamp < startDate) return false;
          if (endDate && l.timestamp > endDate) return false;
          return true;
        });

        const stats: Record<AuditSeverity, number> = {
          info: 0,
          warning: 0,
          error: 0,
          critical: 0,
        };

        logs.forEach((l) => {
          stats[l.severity]++;
        });

        return stats;
      },

      clearLogs: () => {
        set({ logs: [] });
      },

      markSynced: (ids) => {
        set((state) => ({
          logs: state.logs.map((l) =>
            ids.includes(l.id) ? { ...l, synced: true } : l
          ),
        }));
      },

      getUnsyncedLogs: () => {
        return get().logs.filter((l) => !l.synced);
      },

      setEnabled: (enabled) => {
        set({ isEnabled: enabled });
      },

      setMaxLogs: (max) => {
        set({ maxLogs: max });
      },
    }),
    {
      name: 'audit-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        logs: state.logs.slice(0, 100), // Solo últimos 100 en localStorage
        isEnabled: state.isEnabled,
      }),
    }
  )
);

// =============================================================================
// HELPERS PARA CREAR LOGS
// =============================================================================

export const auditCreate = (
  entityType: string,
  entityId: string,
  data: Record<string, any>,
  userId?: string,
  userName?: string
) => {
  return useAuditStore.getState().addLog({
    action: 'create',
    entityType,
    entityId,
    userId,
    userName,
    severity: 'info',
    description: `Creó ${entityType} #${entityId}`,
    changes: { after: data },
  });
};

export const auditUpdate = (
  entityType: string,
  entityId: string,
  before: Record<string, any>,
  after: Record<string, any>,
  userId?: string,
  userName?: string
) => {
  const changedFields = Object.keys(after).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
  );

  return useAuditStore.getState().addLog({
    action: 'update',
    entityType,
    entityId,
    userId,
    userName,
    severity: changedFields.length > 2 ? 'warning' : 'info',
    description: `Actualizó ${entityType} #${entityId}`,
    changes: { before, after, fields: changedFields },
  });
};

export const auditDelete = (
  entityType: string,
  entityId: string,
  data: Record<string, any>,
  userId?: string,
  userName?: string
) => {
  return useAuditStore.getState().addLog({
    action: 'delete',
    entityType,
    entityId,
    userId,
    userName,
    severity: 'warning',
    description: `Eliminó ${entityType} #${entityId}`,
    changes: { before: data },
  });
};

export const auditError = (
  entityType: string,
  entityId: string,
  error: string,
  metadata?: Record<string, any>,
  userId?: string,
  userName?: string
) => {
  return useAuditStore.getState().addLog({
    action: 'error',
    entityType,
    entityId,
    userId,
    userName,
    severity: 'error',
    description: `Error en ${entityType} #${entityId}: ${error}`,
    metadata,
  });
};

export const auditSync = (
  entityType: string,
  count: number,
  success: boolean
) => {
  return useAuditStore.getState().addLog({
    action: 'sync',
    entityType,
    entityId: 'bulk',
    severity: success ? 'info' : 'error',
    description: `Sync de ${entityType}: ${count} registros (${success ? 'éxito' : 'fallido'})`,
    metadata: { count, success },
  });
};

export default useAuditStore;