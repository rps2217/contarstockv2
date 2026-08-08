/**
 * BackupService - Sistema de backup y restore de la base de datos
 *
 * Proporciona:
 * - Export completo de la base de datos
 * - Export parcial por tablas
 * - Import con validación
 * - Puntos de recuperación
 * - Compresión de datos
 */

import { db } from '../../db';
import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export interface BackupMetadata {
  version: string;
  createdAt: number;
  tables: string[];
  totalRecords: number;
  compressedSize: number;
  originalSize: number;
  checksum: string;
  appVersion: string;
}

export interface BackupOptions {
  /** Incluir tablas específicas (vacío = todas) */
  tables?: string[];
  /** Incluir datos de sync (pendientes) */
  includePendingSync?: boolean;
  /** Comprimir datos */
  compress?: boolean;
  /** Incluir metadata */
  includeMetadata?: boolean;
}

export interface RestoreOptions {
  /** Modo de restore */
  mode: 'merge' | 'replace' | 'selective';
  /** Tablas a restaurar (para modo selective) */
  tables?: string[];
  /** Crear backup antes de restaurar */
  createBackupFirst?: boolean;
  /** Validar datos antes de restaurar */
  validate?: boolean;
}

export interface BackupResult {
  success: boolean;
  data?: string;
  metadata?: BackupMetadata;
  error?: string;
  duration: number;
}

export interface RestoreResult {
  success: boolean;
  restored: Record<string, number>;
  skipped: Record<string, number>;
  errors: Array<{ table: string; error: string }>;
  duration: number;
}

export interface RecoveryPoint {
  id: string;
  name: string;
  createdAt: number;
  size: number;
  tables: string[];
  recordCount: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const BACKUP_VERSION = '1.0.0';
const STORAGE_KEY = 'db_backup_';
const MAX_RECOVERY_POINTS = 5;

// ============================================================================
// SERVICE
// ============================================================================

class BackupServiceClass {
  /**
   * Crear backup completo
   */
  async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    const startTime = performance.now();
    const { tables, includePendingSync = true, compress = true } = options;

    try {
      // Obtener lista de tablas
      const tablesToBackup = tables || db.tables.map(t => t.name);

      // Filtrar tablas según opciones
      const filteredTables = tablesToBackup.filter(tableName => {
        // Excluir tablas de métricas y logs
        if (['sync_logs', 'syncMetrics', 'logs'].includes(tableName)) {
          return false;
        }
        // Si no incluye sync pendiente, excluir queue
        if (!includePendingSync && tableName === 'syncQueue') {
          return false;
        }
        return true;
      });

      // Exportar datos
      const exportData: Record<string, any[]> = {};
      let totalRecords = 0;

      for (const tableName of filteredTables) {
        try {
          const table = db.table(tableName);
          const records = await table.toArray();
          exportData[tableName] = records;
          totalRecords += records.length;
        } catch (error) {
          logger.warn('BackupService', `Failed to export table: ${tableName}`, { error });
        }
      }

      // Serializar
      const jsonString = JSON.stringify(exportData);
      const originalSize = new Blob([jsonString]).size;

      // Comprimir si está habilitado
      let finalData = jsonString;
      if (compress) {
        finalData = await this.compress(jsonString);
      }

      const compressedSize = new Blob([finalData]).size;

      // Generar checksum
      const checksum = await this.generateChecksum(finalData);

      // Crear metadata
      const metadata: BackupMetadata = {
        version: BACKUP_VERSION,
        createdAt: Date.now(),
        tables: filteredTables,
        totalRecords,
        compressedSize,
        originalSize,
        checksum,
        appVersion: this.getAppVersion(),
      };

      const duration = performance.now() - startTime;

      // Guardar recovery point si es backup completo
      if (!tables) {
        await this.saveRecoveryPoint(metadata, finalData);
      }

      logger.info('BackupService', 'Backup created', {
        tables: filteredTables.length,
        records: totalRecords,
        size: compressedSize,
        duration: `${duration.toFixed(2)}ms`,
      });

      return {
        success: true,
        data: finalData,
        metadata,
        duration,
      };
    } catch (error) {
      logger.error('BackupService', 'Backup failed', { error });
      return {
        success: false,
        error: (error as Error).message,
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Restaurar desde backup
   */
  async restoreBackup(backupData: string, options: RestoreOptions): Promise<RestoreResult> {
    const startTime = performance.now();
    const { mode = 'merge', tables, createBackupFirst = true, validate = true } = options;

    const restored: Record<string, number> = {};
    const skipped: Record<string, number> = {};
    const errors: Array<{ table: string; error: string }> = [];

    try {
      // Crear backup de seguridad primero
      if (createBackupFirst) {
        await this.createBackup({});
        logger.info('BackupService', 'Security backup created before restore');
      }

      // Descomprimir si es necesario
      let jsonData = backupData;
      try {
        JSON.parse(backupData);
      } catch {
        // Es compressed
        jsonData = await this.decompress(backupData);
      }

      // Parsear datos
      const data = JSON.parse(jsonData);

      // Validar si está habilitado
      if (validate) {
        const validation = await this.validateBackupData(data);
        if (!validation.valid) {
          return {
            success: false,
            restored: {},
            skipped: {},
            errors: validation.errors.map(e => ({ table: 'backup', error: e })),
            duration: performance.now() - startTime,
          };
        }
      }

      // Determinar tablas a restaurar
      const tablesToRestore = tables || Object.keys(data);

      // Ejecutar restore según modo
      switch (mode) {
        case 'replace':
          await this.restoreReplace(tablesToRestore, data, restored, skipped, errors);
          break;
        case 'merge':
          await this.restoreMerge(tablesToRestore, data, restored, skipped, errors);
          break;
        case 'selective':
          await this.restoreSelective(tablesToRestore, data, restored, skipped, errors);
          break;
      }

      logger.info('BackupService', 'Restore completed', {
        restored,
        skipped,
        errors: errors.length,
        duration: `${(performance.now() - startTime).toFixed(2)}ms`,
      });

      return {
        success: errors.length === 0,
        restored,
        skipped,
        errors,
        duration: performance.now() - startTime,
      };
    } catch (error) {
      logger.error('BackupService', 'Restore failed', { error });
      return {
        success: false,
        restored,
        skipped,
        errors: [{ table: 'backup', error: (error as Error).message }],
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Restaurar reemplazando todo
   */
  private async restoreReplace(
    tableNames: string[],
    data: Record<string, any[]>,
    restored: Record<string, number>,
    skipped: Record<string, number>,
    errors: Array<{ table: string; error: string }>
  ): Promise<void> {
    for (const tableName of tableNames) {
      try {
        if (!data[tableName]) {
          skipped[tableName] = 0;
          continue;
        }

        const table = db.table(tableName);

        // Clear y re-add
        await table.clear();
        await table.bulkAdd(data[tableName]);

        restored[tableName] = data[tableName].length;
      } catch (error) {
        errors.push({ table: tableName, error: (error as Error).message });
        skipped[tableName] = 0;
      }
    }
  }

  /**
   * Restaurar mezclando con datos existentes
   */
  private async restoreMerge(
    tableNames: string[],
    data: Record<string, any[]>,
    restored: Record<string, number>,
    skipped: Record<string, number>,
    errors: Array<{ table: string; error: string }>
  ): Promise<void> {
    for (const tableName of tableNames) {
      try {
        if (!data[tableName]) {
          skipped[tableName] = 0;
          continue;
        }

        const table = db.table(tableName);
        let added = 0;

        for (const record of data[tableName]) {
          try {
            // Intentar actualizar, si falla agregar
            await table.put(record);
            added++;
          } catch {
            try {
              await table.add(record);
              added++;
            } catch {
              // Registro duplicado, skip
            }
          }
        }

        restored[tableName] = added;
      } catch (error) {
        errors.push({ table: tableName, error: (error as Error).message });
        skipped[tableName] = 0;
      }
    }
  }

  /**
   * Restaurar selectivamente
   */
  private async restoreSelective(
    tableNames: string[],
    data: Record<string, any[]>,
    restored: Record<string, number>,
    skipped: Record<string, number>,
    errors: Array<{ table: string; error: string }>
  ): Promise<void> {
    // Igual a merge pero más estricto
    await this.restoreMerge(tableNames, data, restored, skipped, errors);
  }

  /**
   * Validar datos de backup
   */
  private async validateBackupData(data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Formato de backup inválido');
      return { valid: false, errors };
    }

    for (const [tableName, records] of Object.entries(data)) {
      if (!Array.isArray(records)) {
        errors.push(`Tabla ${tableName}: debe ser un array`);
        continue;
      }

      // Verificar que la tabla existe
      const tableExists = db.tables.some(t => t.name === tableName);
      if (!tableExists) {
        errors.push(`Tabla ${tableName}: no existe en el schema`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Guardar recovery point
   */
  private async saveRecoveryPoint(metadata: BackupMetadata, data: string): Promise<void> {
    try {
      // Obtener recovery points existentes
      const existingPoints = await this.getRecoveryPoints();

      // Agregar nuevo
      const point: RecoveryPoint = {
        id: crypto.randomUUID(),
        name: `Recovery ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        size: metadata.compressedSize,
        tables: metadata.tables,
        recordCount: metadata.totalRecords,
      };

      // Guardar datos
      localStorage.setItem(`${STORAGE_KEY}${point.id}`, data);
      localStorage.setItem(`${STORAGE_KEY}metadata:${point.id}`, JSON.stringify(metadata));

      // Mantener solo los últimos N puntos
      const allPoints = [point, ...existingPoints].slice(0, MAX_RECOVERY_POINTS);

      // Eliminar puntos antiguos
      const pointIds = new Set(allPoints.map(p => p.id));
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY)) {
          const id = key.replace(STORAGE_KEY, '').replace(':metadata', '');
          if (!pointIds.has(id) && !key.includes('metadata:')) {
            localStorage.removeItem(key);
            localStorage.removeItem(`${STORAGE_KEY}metadata:${id}`);
          }
        }
      }

      // Guardar lista de puntos
      localStorage.setItem(`${STORAGE_KEY}index`, JSON.stringify(allPoints));
    } catch (error) {
      logger.warn('BackupService', 'Failed to save recovery point', { error });
    }
  }

  /**
   * Obtener puntos de recuperación
   */
  async getRecoveryPoints(): Promise<RecoveryPoint[]> {
    try {
      const indexStr = localStorage.getItem(`${STORAGE_KEY}index`);
      if (!indexStr) return [];
      return JSON.parse(indexStr);
    } catch {
      return [];
    }
  }

  /**
   * Restaurar desde recovery point
   */
  async restoreFromRecoveryPoint(pointId: string): Promise<RestoreResult> {
    try {
      const data = localStorage.getItem(`${STORAGE_KEY}${pointId}`);
      if (!data) {
        return {
          success: false,
          restored: {},
          skipped: {},
          errors: [{ table: 'recovery', error: 'Recovery point not found' }],
          duration: 0,
        };
      }

      return await this.restoreBackup(data, {
        mode: 'replace',
        createBackupFirst: true,
      });
    } catch (error) {
      return {
        success: false,
        restored: {},
        skipped: {},
        errors: [{ table: 'recovery', error: (error as Error).message }],
        duration: 0,
      };
    }
  }

  /**
   * Eliminar recovery point
   */
  async deleteRecoveryPoint(pointId: string): Promise<void> {
    localStorage.removeItem(`${STORAGE_KEY}${pointId}`);
    localStorage.removeItem(`${STORAGE_KEY}metadata:${pointId}`);

    // Actualizar índice
    const points = await this.getRecoveryPoints();
    const filtered = points.filter(p => p.id !== pointId);
    localStorage.setItem(`${STORAGE_KEY}index`, JSON.stringify(filtered));
  }

  /**
   * Comprimir datos (usando LZString si disponible, o simple encoding)
   */
  private async compress(data: string): Promise<string> {
    // Intentar usar LZString si está disponible
    if (typeof (window as any).LZString !== 'undefined') {
      return (window as any).LZString.compressToUTF16(data);
    }

    // Fallback: simplemente codificar
    return btoa(encodeURIComponent(data));
  }

  /**
   * Descomprimir datos
   */
  private async decompress(data: string): Promise<string> {
    // Intentar usar LZString
    if (typeof (window as any).LZString !== 'undefined') {
      return (window as any).LZString.decompressFromUTF16(data);
    }

    // Fallback
    try {
      return decodeURIComponent(atob(data));
    } catch {
      return data;
    }
  }

  /**
   * Generar checksum
   */
  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Obtener versión de la app
   */
  private getAppVersion(): string {
    return (window as any).__APP_VERSION__ || '1.0.0';
  }

  /**
   * Exportar a archivo
   */
  async exportToFile(filename?: string): Promise<void> {
    const result = await this.createBackup({ compress: false });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Backup failed');
    }

    const blob = new Blob([result.data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `logiscount-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Importar desde archivo
   */
  async importFromFile(file: File): Promise<RestoreResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async e => {
        try {
          const data = e.target?.result as string;
          const result = await this.restoreBackup(data, {
            mode: 'merge',
            createBackupFirst: true,
            validate: true,
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const BackupService = new BackupServiceClass();
export default BackupService;
