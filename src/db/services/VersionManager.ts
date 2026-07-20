/**
 * VersionManager - Sistema de Versionamiento de Registros
 *
 * Proporciona:
 * - Snapshots de sesiones en cualquier momento
 * - Historial de cambios por registro
 * - Rollback a versiones anteriores
 * - Diferencias entre versiones (diff)
 * - Auto-snapshots programables
 */

import { db } from '../../db';
import { logger } from '@/services/logger';
import { EventBus, AppEvents } from '@/core/events/EventBus';
import { ScanRecord, CountingSession } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export type SnapshotType = 'manual' | 'auto' | 'pre_sync' | 'pre_delete';

export interface SnapshotMetadata {
  id: string;
  tableName: string;
  recordId: string;
  version: number;
  type: SnapshotType;
  createdAt: number;
  createdBy?: string;
  description?: string;
  checksum: string;
  recordCount: number;
  sizeBytes: number;
}

export interface SnapshotData {
  session?: CountingSession;
  scans?: ScanRecord[];
  metrics?: SnapshotMetrics;
}

export interface SnapshotMetrics {
  totalScans: number;
  totalUnits: number;
  uniqueProducts: number;
  discrepancyCount: number;
  discrepancyPercentage: number;
}

export interface VersionDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface VersionHistory {
  recordId: string;
  tableName: string;
  versions: SnapshotMetadata[];
  currentVersion: number;
}

export interface RollbackResult {
  success: boolean;
  snapshotId: string;
  changes: VersionDiff[];
  error?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

class VersionManagerClass {
  private readonly MAX_AUTO_SNAPSHOTS = 5;
  private readonly MAX_MANUAL_SNAPSHOTS = 20;

  /**
   * Crear snapshot de una sesión
   */
  async createSnapshot(
    sessionId: string,
    type: SnapshotType,
    options: {
      createdBy?: string;
      description?: string;
      includeScans?: boolean;
    } = {}
  ): Promise<SnapshotMetadata | null> {
    const { createdBy, description, includeScans = true } = options;

    try {
      // Obtener datos de la sesión
      const session = await db.sessions.get(sessionId);
      if (!session) {
        logger.warn('VersionManager', 'Session not found', { sessionId });
        return null;
      }

      // Obtener scans si se solicita
      let scans: ScanRecord[] = [];
      let metrics: SnapshotMetrics | undefined;

      if (includeScans) {
        scans = await db.scans.where('sessionId').equals(sessionId).toArray();

        // Calcular métricas
        const totalUnits = scans.reduce((sum, s) => sum + (s.quantity || 0), 1);
        const uniqueProducts = new Set(scans.map(s => s.barcode)).size;

        // Calcular discrepancias si hay carga teórica
        let discrepancyCount = 0;
        let discrepancyPercentage = 0;
        if (session.expectedItems && session.expectedItems.length > 0) {
          const expectedMap = new Map(
            session.expectedItems.map(i => [i.barcode, i.expectedQty || 0])
          );

          for (const scan of scans) {
            const expected = expectedMap.get(scan.barcode) || 0;
            if (scan.quantity !== expected) {
              discrepancyCount++;
            }
          }
          discrepancyPercentage = scans.length > 0 ? (discrepancyCount / scans.length) * 100 : 0;
        }

        metrics = {
          totalScans: scans.length,
          totalUnits,
          uniqueProducts,
          discrepancyCount,
          discrepancyPercentage,
        };
      }

      // Serializar datos
      const data: SnapshotData = { session, scans, metrics };
      const dataString = JSON.stringify(data);
      const checksum = await this.calculateChecksum(dataString);

      // Obtener versión actual
      const existingSnapshots = await this.getSnapshotsByRecord('sessions', sessionId);
      const version = existingSnapshots.length + 1;

      // Crear metadata
      const metadata: SnapshotMetadata = {
        id: crypto.randomUUID(),
        tableName: 'sessions',
        recordId: sessionId,
        version,
        type,
        createdAt: Date.now(),
        createdBy,
        description,
        checksum,
        recordCount: scans.length,
        sizeBytes: new Blob([dataString]).size,
      };

      // Guardar en storage
      await db.table('snapshots').add({
        ...metadata,
        data,
      });

      // Limpiar snapshots antiguos si es auto-snapshot
      if (type === 'auto') {
        await this.cleanupOldSnapshots('sessions', sessionId, this.MAX_AUTO_SNAPSHOTS);
      }

      // Publicar evento
      EventBus.publish(AppEvents.SNAPSHOT_CREATED, {
        snapshotId: metadata.id,
        sessionId,
        type,
        version,
      });

      logger.info('VersionManager', 'Snapshot created', {
        snapshotId: metadata.id,
        sessionId,
        version,
        type,
      });

      return metadata;
    } catch (error) {
      logger.error('VersionManager', 'Failed to create snapshot', {
        sessionId,
        error,
      });
      return null;
    }
  }

  /**
   * Obtener snapshots de un registro
   */
  async getSnapshotsByRecord(tableName: string, recordId: string): Promise<SnapshotMetadata[]> {
    const snapshots = await db
      .table('snapshots')
      .where('recordId')
      .equals(recordId)
      .filter(s => s.tableName === tableName)
      .reverse()
      .sortBy('version');

    return snapshots.map(s => ({
      id: s.id,
      tableName: s.tableName,
      recordId: s.recordId,
      version: s.version,
      type: s.type,
      createdAt: s.createdAt,
      createdBy: s.createdBy,
      description: s.description,
      checksum: s.checksum,
      recordCount: s.recordCount,
      sizeBytes: s.sizeBytes,
    }));
  }

  /**
   * Obtener un snapshot específico
   */
  async getSnapshot(snapshotId: string): Promise<SnapshotData | null> {
    const snapshot = await db.table('snapshots').get(snapshotId);
    return snapshot?.data || null;
  }

  /**
   * Obtener historial de versiones de un registro
   */
  async getVersionHistory(tableName: string, recordId: string): Promise<VersionHistory | null> {
    const versions = await this.getSnapshotsByRecord(tableName, recordId);

    if (versions.length === 0) {
      return null;
    }

    return {
      recordId,
      tableName,
      versions,
      currentVersion: Math.max(...versions.map(v => v.version)),
    };
  }

  /**
   * Comparar dos versiones
   */
  async compareVersions(snapshotId1: string, snapshotId2: string): Promise<VersionDiff[]> {
    const [data1, data2] = await Promise.all([
      this.getSnapshot(snapshotId1),
      this.getSnapshot(snapshotId2),
    ]);

    if (!data1 || !data2) {
      return [];
    }

    const diffs: VersionDiff[] = [];

    // Comparar sesiones
    if (data1.session && data2.session) {
      const sessionDiff = this.compareObjects(data1.session, data2.session, 'session');
      diffs.push(...sessionDiff);
    }

    // Comparar métricas
    if (data1.metrics && data2.metrics) {
      const metricsDiff = this.compareObjects(data1.metrics, data2.metrics, 'metrics');
      diffs.push(...metricsDiff);
    }

    return diffs;
  }

  /**
   * Hacer rollback a una versión anterior
   */
  async rollback(snapshotId: string): Promise<RollbackResult> {
    const snapshot = await db.table('snapshots').get(snapshotId);

    if (!snapshot || !snapshot.data) {
      return {
        success: false,
        snapshotId,
        changes: [],
        error: 'Snapshot not found',
      };
    }

    const { session, scans } = snapshot.data;

    try {
      // Verificar checksum
      const dataString = JSON.stringify(snapshot.data);
      const newChecksum = await this.calculateChecksum(dataString);

      if (newChecksum !== snapshot.checksum) {
        logger.warn('VersionManager', 'Checksum mismatch, snapshot may be corrupted', {
          snapshotId,
          originalChecksum: snapshot.checksum,
          currentChecksum: newChecksum,
        });
      }

      // Realizar rollback en transacción
      await db.transaction('rw', db.sessions, db.scans, async () => {
        // Actualizar sesión
        await db.sessions.put(session);

        // Eliminar scans actuales
        await db.scans.where('sessionId').equals(session.id).delete();

        // Restaurar scans del snapshot
        if (scans && scans.length > 0) {
          await db.scans.bulkAdd(scans);
        }
      });

      // Crear snapshot post-rollback
      await this.createSnapshot(session.id, 'manual', {
        createdBy: 'system',
        description: `Rollback a versión ${snapshot.version}`,
      });

      // Publicar evento
      EventBus.publish(AppEvents.SNAPSHOT_RESTORED, {
        snapshotId,
        sessionId: session.id,
        version: snapshot.version,
      });

      logger.info('VersionManager', 'Rollback completed', {
        snapshotId,
        sessionId: session.id,
        version: snapshot.version,
      });

      return {
        success: true,
        snapshotId,
        changes: [],
      };
    } catch (error) {
      logger.error('VersionManager', 'Rollback failed', {
        snapshotId,
        error,
      });

      return {
        success: false,
        snapshotId,
        changes: [],
        error: (error as Error).message,
      };
    }
  }

  /**
   * Eliminar snapshots antiguos
   */
  async cleanupOldSnapshots(
    tableName: string,
    recordId: string,
    keepCount: number
  ): Promise<number> {
    const snapshots = await this.getSnapshotsByRecord(tableName, recordId);

    if (snapshots.length <= keepCount) {
      return 0;
    }

    const toDelete = snapshots.slice(keepCount);
    const idsToDelete = toDelete.map(s => s.id);

    if (idsToDelete.length > 0) {
      await db.table('snapshots').bulkDelete(idsToDelete);
      logger.info('VersionManager', 'Old snapshots cleaned', {
        tableName,
        recordId,
        deletedCount: idsToDelete.length,
      });
    }

    return idsToDelete.length;
  }

  /**
   * Crear snapshot automático antes de sync
   */
  async autoSnapshotBeforeSync(sessionId: string): Promise<void> {
    await this.createSnapshot(sessionId, 'pre_sync', {
      createdBy: 'system',
      description: 'Auto-snapshot antes de sincronización',
    });
  }

  /**
   * Crear snapshot automático antes de delete
   */
  async autoSnapshotBeforeDelete(sessionId: string): Promise<void> {
    await this.createSnapshot(sessionId, 'pre_delete', {
      createdBy: 'system',
      description: 'Auto-snapshot antes de eliminación',
    });
  }

  /**
   * Obtener estadísticas de snapshots
   */
  async getStats(): Promise<{
    totalSnapshots: number;
    byType: Record<SnapshotType, number>;
    totalSize: number;
    oldestSnapshot: number | null;
    newestSnapshot: number | null;
  }> {
    const snapshots = await db.table('snapshots').toArray();

    const byType: Record<SnapshotType, number> = {
      manual: 0,
      auto: 0,
      pre_sync: 0,
      pre_delete: 0,
    };

    let totalSize = 0;
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const s of snapshots) {
      byType[s.type]++;
      totalSize += s.sizeBytes;

      if (!oldest || s.createdAt < oldest) oldest = s.createdAt;
      if (!newest || s.createdAt > newest) newest = s.createdAt;
    }

    return {
      totalSnapshots: snapshots.length,
      byType,
      totalSize,
      oldestSnapshot: oldest,
      newestSnapshot: newest,
    };
  }

  /**
   * Comparar dos objetos y devolver diferencias
   */
  private compareObjects(obj1: any, obj2: any, prefix = ''): VersionDiff[] {
    const diffs: VersionDiff[] = [];
    const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    for (const key of keys) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;

      const value1 = obj1?.[key];
      const value2 = obj2?.[key];

      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        diffs.push({
          field: prefix ? `${prefix}.${key}` : key,
          oldValue: value1,
          newValue: value2,
        });
      }
    }

    return diffs;
  }

  /**
   * Calcular checksum SHA-256
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const VersionManager = new VersionManagerClass();
export default VersionManager;
