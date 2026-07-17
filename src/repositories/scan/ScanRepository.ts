/**
 * ScanRepository - Patrón Singleton
 *
 * REEMPLAZA a src/repositories/ScanRepository.ts
 *
 * PATRÓN ACTUAL (v2):
 * - export const scanRepository - Instancia singleton
 * - export class ScanRepository - Clase con métodos de instancia
 *
 * @deprecated Los métodos estáticos serán eliminados en v4
 */

import { db } from '../../db';
import { ScanRecord } from '../../types';
import { ScanRecordSchema } from '../../schemas/database';

export class ScanRepository {
  private table = () => db.scans;

  async save(scan: ScanRecord): Promise<void> {
    const record = ScanRecordSchema.parse({
      ...scan,
      syncStatus: scan.syncStatus || 'pending',
    }) as ScanRecord;
    await this.table().put(record);
  }

  async saveBatch(scans: ScanRecord[]): Promise<void> {
    const records = scans.map(s => ({
      ...s,
      syncStatus: s.syncStatus || 'pending',
    }));
    await this.table().bulkPut(records);
  }

  async getBySession(sessionId: string): Promise<ScanRecord[]> {
    return await this.table().where('sessionId').equals(sessionId).toArray();
  }

  async getAll(): Promise<ScanRecord[]> {
    return await this.table().toArray();
  }

  async get(id: string): Promise<ScanRecord | null> {
    return (await this.table().get(id)) ?? null;
  }

  async getUnsynced(): Promise<ScanRecord[]> {
    return await this.table().where('syncStatus').equals('pending').toArray();
  }

  async getPendingScans(): Promise<ScanRecord[]> {
    return await this.table().where('synced').equals(0).toArray();
  }

  async markAsSynced(ids: string[]): Promise<void> {
    await this.table().where('id').anyOf(ids).modify({
      syncStatus: 'synced',
      synced: Date.now(),
    });
  }

  async markManySynced(ids: string[]): Promise<void> {
    await this.table().where('id').anyOf(ids).modify({
      syncStatus: 'synced',
      synced: Date.now(),
    });
  }

  async markSyncError(id: string, error: string): Promise<void> {
    await this.table().update(id, { syncStatus: 'error', syncError: error });
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.table().where('sessionId').equals(sessionId).delete();
  }

  async deleteBySessions(sessionIds: string[]): Promise<void> {
    await this.table().where('sessionId').anyOf(sessionIds).delete();
  }

  async getPendingSyncCount(): Promise<number> {
    return await this.table().where('syncStatus').equals('pending').count();
  }

  async getTodayScansCount(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTimestamp = startOfDay.getTime();
    return await this.table().where('timestamp').aboveOrEqual(startTimestamp).count();
  }

  async countBySession(sessionId: string): Promise<number> {
    return await this.table().where('sessionId').equals(sessionId).count();
  }

  async getIncidents(): Promise<ScanRecord[]> {
    return await this.table()
      .filter(scan => scan.isIncident === true)
      .toArray();
  }

  async delete(id: string): Promise<void> {
    await this.table().delete(id);
  }

  async getRecent(limit: number = 50): Promise<ScanRecord[]> {
    return await this.table().orderBy('timestamp').reverse().limit(limit).toArray();
  }

  async getByDateRange(startDate: number, endDate: number): Promise<ScanRecord[]> {
    return await this.table()
      .filter(scan => scan.timestamp >= startDate && scan.timestamp <= endDate)
      .toArray();
  }

  async getByBarcode(barcode: string): Promise<ScanRecord[]> {
    return await this.table().where('barcode').equals(barcode).toArray();
  }
}

// ============================================================================
// EXPORT - SINGLETON
// ============================================================================

export const scanRepository = new ScanRepository();

// ============================================================================
// EXPORT LEGACY (Deprecated)
// ============================================================================

export const ScanRepositoryLegacy = {
  save: (scan: ScanRecord) => scanRepository.save(scan),
  saveBatch: (scans: ScanRecord[]) => scanRepository.saveBatch(scans),
  getBySession: (sessionId: string) => scanRepository.getBySession(sessionId),
  getAll: () => scanRepository.getAll(),
  get: (id: string) => scanRepository.get(id),
  getUnsynced: () => scanRepository.getUnsynced(),
  getPendingScans: () => scanRepository.getPendingScans(),
  markAsSynced: (ids: string[]) => scanRepository.markAsSynced(ids),
  markManySynced: (ids: string[]) => scanRepository.markManySynced(ids),
  markSyncError: (id: string, error: string) => scanRepository.markSyncError(id, error),
  deleteBySession: (sessionId: string) => scanRepository.deleteBySession(sessionId),
  deleteBySessions: (sessionIds: string[]) => scanRepository.deleteBySessions(sessionIds),
  getPendingSyncCount: () => scanRepository.getPendingSyncCount(),
  countBySession: (sessionId: string) => scanRepository.countBySession(sessionId),
  getIncidents: () => scanRepository.getIncidents(),
  delete: (id: string) => scanRepository.delete(id),
  getRecent: (limit?: number) => scanRepository.getRecent(limit),
  getByDateRange: (start: number, end: number) => scanRepository.getByDateRange(start, end),
  getByBarcode: (barcode: string) => scanRepository.getByBarcode(barcode),
};
