/**
 * DatabaseCleanupService - Limpieza automática de datos antiguos
 *
 * Proporciona:
 * - Limpieza de registros expirados
 * - Eliminación de datos huérfanos
 * - Compactación de tablas
 * - Políticas de retención configurables
 * - Dry-run mode para预览
 */

import { db } from '../../db';
import { logger } from '@/services/logger';
import { EventBus, AppEvents } from '@/core/events/EventBus';

// ============================================================================
// TIPOS
// ============================================================================

export interface CleanupPolicy {
  /** Nombre de la política */
  name: string;
  /** Tablas afectadas */
  tables: string[];
  /** Campo de fecha para filtrar */
  dateField: string;
  /** Antigüedad máxima en días */
  maxAgeDays: number;
  /** Condiciones adicionales */
  conditions?: Record<string, any>;
  /** Habilitado */
  enabled: boolean;
}

export interface CleanupResult {
  table: string;
  deleted: number;
  preserved: number;
  duration: number;
}

export interface CleanupReport {
  success: boolean;
  totalDeleted: number;
  totalPreserved: number;
  results: CleanupResult[];
  duration: number;
  timestamp: number;
  errors: Array<{ table: string; error: string }>;
}

export interface CleanupConfig {
  /** Políticas de limpieza */
  policies: CleanupPolicy[];
  /** Habilitar limpieza automática */
  autoCleanupEnabled: boolean;
  /** Intervalo de limpieza automática (ms) */
  autoCleanupInterval: number;
  /** Mantener siempre cierto número de registros */
  keepMinRecords?: number;
  /** Dry run - solo preview sin eliminar */
  dryRun?: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_POLICIES: CleanupPolicy[] = [
  {
    name: 'Logs antiguos',
    tables: ['logs', 'sync_logs'],
    dateField: 'timestamp',
    maxAgeDays: 30,
    enabled: true,
  },
  {
    name: 'Sesiones completadas',
    tables: ['sessions'],
    dateField: 'createdAt',
    maxAgeDays: 90,
    conditions: { status: 'completed' },
    enabled: true,
  },
  {
    name: 'Scans de sesiones eliminadas',
    tables: ['scans'],
    dateField: 'timestamp',
    maxAgeDays: 180,
    conditions: {},
    enabled: true,
  },
  {
    name: 'Preferencias antiguas',
    tables: ['viewPreferences'],
    dateField: 'lastUpdated',
    maxAgeDays: 60,
    enabled: true,
  },
  {
    name: 'Audit logs',
    tables: ['audit_logs'],
    dateField: 'timestamp',
    maxAgeDays: 365,
    enabled: false, // Deshabilitado por defecto
  },
  {
    name: 'Events resueltos',
    tables: ['events'],
    dateField: 'createdAt',
    maxAgeDays: 60,
    conditions: { status: ['destined', 'adjusted'] },
    enabled: true,
  },
  {
    name: 'Settings obsoletos',
    tables: ['settings'],
    dateField: 'key',
    maxAgeDays: 0, // Nunca basado en fecha
    enabled: false,
  },
];

// ============================================================================
// SERVICE
// ============================================================================

class DatabaseCleanupServiceClass {
  private config: CleanupConfig;
  private autoCleanupTimer: number | null = null;
  private lastCleanup: CleanupReport | null = null;

  constructor() {
    this.config = {
      policies: DEFAULT_POLICIES,
      autoCleanupEnabled: false,
      autoCleanupInterval: 24 * 60 * 60 * 1000, // 24 horas
    };

    // Cargar configuración guardada
    this.loadConfig();
  }

  /**
   * Cargar configuración desde settings
   */
  private async loadConfig(): Promise<void> {
    try {
      const saved = await db.settings.get('cleanup_config');
      if (saved && typeof saved.value === 'object' && saved.value !== null) {
        this.config = { ...this.config, ...(saved.value as Record<string, unknown>) };
      }
    } catch (error) {
      logger.warn('DatabaseCleanupService', 'Failed to load config', { error });
    }
  }

  /**
   * Guardar configuración
   */
  private async saveConfig(): Promise<void> {
    try {
      await db.settings.put({
        key: 'cleanup_config',
        value: this.config,
      });
    } catch (error) {
      logger.warn('DatabaseCleanupService', 'Failed to save config', { error });
    }
  }

  /**
   * Ejecutar limpieza
   */
  async cleanup(options?: { dryRun?: boolean; policyNames?: string[] }): Promise<CleanupReport> {
    const startTime = performance.now();
    const dryRun = options?.dryRun ?? false;
    const results: CleanupResult[] = [];
    const errors: Array<{ table: string; error: string }> = [];
    let totalDeleted = 0;
    let totalPreserved = 0;

    logger.info('DatabaseCleanupService', 'Starting cleanup', { dryRun });

    // Filtrar políticas activas
    const policies = this.config.policies.filter(p => {
      if (!p.enabled) return false;
      if (options?.policyNames) {
        return options.policyNames.includes(p.name);
      }
      return true;
    });

    for (const policy of policies) {
      for (const tableName of policy.tables) {
        try {
          const result = await this.cleanupTable(tableName, policy, dryRun);
          results.push(result);
          totalDeleted += result.deleted;
          totalPreserved += result.preserved;
        } catch (error) {
          errors.push({
            table: tableName,
            error: (error as Error).message,
          });
          logger.error('DatabaseCleanupService', `Failed to cleanup table: ${tableName}`, {
            error,
          });
        }
      }
    }

    const report: CleanupReport = {
      success: errors.length === 0,
      totalDeleted,
      totalPreserved,
      results,
      duration: performance.now() - startTime,
      timestamp: Date.now(),
      errors,
    };

    if (!dryRun) {
      this.lastCleanup = report;

      // Publicar evento
      EventBus.publish(AppEvents.SYNC_COMPLETED, {
        source: 'cleanup',
        deleted: totalDeleted,
      });
    }

    logger.info('DatabaseCleanupService', 'Cleanup completed', {
      deleted: totalDeleted,
      duration: report.duration,
    });

    return report;
  }

  /**
   * Limpiar una tabla específica
   */
  private async cleanupTable(
    tableName: string,
    policy: CleanupPolicy,
    dryRun: boolean
  ): Promise<CleanupResult> {
    const startTime = performance.now();
    const table = db.table(tableName);

    // Calcular cutoff
    const cutoff = Date.now() - policy.maxAgeDays * 24 * 60 * 60 * 1000;

    // Obtener todos los registros
    const allRecords = await table.toArray();
    let deleted = 0;
    let preserved = 0;

    // Si no hay campo de fecha válido, no podemos filtrar por tiempo
    if (policy.maxAgeDays === 0) {
      return { table: tableName, deleted: 0, preserved: allRecords.length, duration: 0 };
    }

    // Clasificar registros
    const toDelete: any[] = [];
    const toPreserve: any[] = [];

    for (const record of allRecords) {
      const dateValue = record[policy.dateField];

      // Si no tiene campo de fecha, preservar
      if (dateValue === undefined || dateValue === null) {
        toPreserve.push(record);
        preserved++;
        continue;
      }

      // Verificar si cumple condiciones adicionales
      let meetsConditions = true;
      if (policy.conditions) {
        for (const [field, expected] of Object.entries(policy.conditions)) {
          const actual = record[field];
          if (Array.isArray(expected)) {
            if (!expected.includes(actual)) {
              meetsConditions = false;
              break;
            }
          } else if (actual !== expected) {
            meetsConditions = false;
            break;
          }
        }
      }

      // Verificar antigüedad
      const isOld = typeof dateValue === 'number' && dateValue < cutoff;

      if (isOld && meetsConditions) {
        toDelete.push(record);
      } else {
        toPreserve.push(record);
        preserved++;
      }
    }

    // Aplicar keepMinRecords
    if (this.config.keepMinRecords && toDelete.length > 0) {
      const preserveNeeded = Math.max(0, this.config.keepMinRecords - toPreserve.length);
      if (preserveNeeded > 0) {
        // Mover algunos de delete a preserve
        toDelete.splice(0, preserveNeeded).forEach(r => {
          toPreserve.push(r);
          preserved++;
        });
      }
    }

    // Eliminar si no es dry run
    if (!dryRun && toDelete.length > 0) {
      // Usar bulk delete
      const deleteKeys = toDelete
        .map(r => {
          // Intentar obtener la key primaria
          if ('id' in r) return r.id;
          if ('barcode' in r) return r.barcode;
          return null;
        })
        .filter(Boolean);

      if (deleteKeys.length > 0) {
        await table.bulkDelete(deleteKeys as any[]);
      }
    }

    deleted = toDelete.length;

    return {
      table: tableName,
      deleted,
      preserved,
      duration: performance.now() - startTime,
    };
  }

  /**
   * Limpiar registros huérfanos
   */
  async cleanupOrphanedRecords(dryRun = false): Promise<CleanupReport> {
    const startTime = performance.now();
    const results: CleanupResult[] = [];
    const errors: Array<{ table: string; error: string }> = [];
    let totalDeleted = 0;

    logger.info('DatabaseCleanupService', 'Cleaning orphaned records');

    try {
      // Scans sin sesión
      const sessions = await db.sessions.toArray();
      const sessionIds = new Set(sessions.map(s => s.id));

      const scans = await db.scans.toArray();
      const orphanScans = scans.filter(s => !sessionIds.has(s.sessionId));

      if (!dryRun && orphanScans.length > 0) {
        await db.scans.bulkDelete(orphanScans.map(s => s.id!));
      }

      results.push({
        table: 'scans (huérfanos)',
        deleted: orphanScans.length,
        preserved: scans.length - orphanScans.length,
        duration: 0,
      });
      totalDeleted += orphanScans.length;
    } catch (error) {
      errors.push({ table: 'orphan_cleanup', error: (error as Error).message });
    }

    return {
      success: errors.length === 0,
      totalDeleted,
      totalPreserved: 0,
      results,
      duration: performance.now() - startTime,
      timestamp: Date.now(),
      errors,
    };
  }

  /**
   * Compactar base de datos
   */
  async compact(): Promise<{ success: boolean; before: number; after: number }> {
    logger.info('DatabaseCleanupService', 'Starting database compaction');

    try {
      // En IndexedDB, compactar no es directamente posible como en SQL
      // pero podemos limpiar las tablas одна
      await this.cleanup();

      return {
        success: true,
        before: 0,
        after: 0,
      };
    } catch (error) {
      logger.error('DatabaseCleanupService', 'Compaction failed', { error });
      return {
        success: false,
        before: 0,
        after: 0,
      };
    }
  }

  /**
   * Iniciar limpieza automática
   */
  startAutoCleanup(): void {
    if (this.autoCleanupTimer) {
      this.stopAutoCleanup();
    }

    this.config.autoCleanupEnabled = true;
    this.saveConfig();

    this.autoCleanupTimer = window.setInterval(async () => {
      logger.info('DatabaseCleanupService', 'Running scheduled cleanup');
      await this.cleanup();
    }, this.config.autoCleanupInterval);

    logger.info('DatabaseCleanupService', 'Auto cleanup started', {
      interval: this.config.autoCleanupInterval,
    });
  }

  /**
   * Detener limpieza automática
   */
  stopAutoCleanup(): void {
    if (this.autoCleanupTimer) {
      clearInterval(this.autoCleanupTimer);
      this.autoCleanupTimer = null;
    }

    this.config.autoCleanupEnabled = false;
    this.saveConfig();

    logger.info('DatabaseCleanupService', 'Auto cleanup stopped');
  }

  /**
   * Verificar si la limpieza automática está activa
   */
  isAutoCleanupEnabled(): boolean {
    return this.config.autoCleanupEnabled;
  }

  /**
   * Actualizar políticas
   */
  updatePolicies(policies: CleanupPolicy[]): void {
    this.config.policies = policies;
    this.saveConfig();
  }

  /**
   * Agregar política
   */
  addPolicy(policy: CleanupPolicy): void {
    this.config.policies.push(policy);
    this.saveConfig();
  }

  /**
   * Remover política
   */
  removePolicy(name: string): void {
    this.config.policies = this.config.policies.filter(p => p.name !== name);
    this.saveConfig();
  }

  /**
   * Obtener políticas actuales
   */
  getPolicies(): CleanupPolicy[] {
    return [...this.config.policies];
  }

  /**
   * Obtener último reporte de limpieza
   */
  getLastCleanup(): CleanupReport | null {
    return this.lastCleanup;
  }

  /**
   * Preview - ver qué se eliminaría
   */
  async preview(): Promise<CleanupReport> {
    return this.cleanup({ dryRun: true });
  }

  /**
   * Estimar espacio recuperable
   */
  async estimateRecoverableSpace(): Promise<number> {
    const preview = await this.preview();

    // Estimar ~1KB por registro promedio
    return preview.totalDeleted * 1024;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const DatabaseCleanupService = new DatabaseCleanupServiceClass();
export default DatabaseCleanupService;
