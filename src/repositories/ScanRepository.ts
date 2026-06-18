import { db } from '../db';
import { ScanRecord } from '../types';
import { ScanRecordSchema } from '../schemas/database';

/**
 * Repository para ScanRecords
 * Maneja operaciones CRUD y sincronizacion de registros de escaneo
 */
export class ScanRepository {
  // Metodos estaticos para compatibilidad hacia atras
  static async save(scan: ScanRecord): Promise<void> {
    const record = ScanRecordSchema.parse({
      ...scan,
      syncStatus: scan.syncStatus || 'pending'
    }) as ScanRecord;
    await db.scans.put(record);
  }

  static async saveBatch(scans: ScanRecord[]): Promise<void> {
    const records = scans.map(s => ({
      ...s,
      syncStatus: s.syncStatus || 'pending'
    }));
    await db.scans.bulkPut(records);
  }

  static async getBySession(sessionId: string): Promise<ScanRecord[]> {
    return await db.scans.where('sessionId').equals(sessionId).toArray();
  }

  static async getAll(): Promise<ScanRecord[]> {
    return await db.scans.toArray();
  }

  static async get(id: string): Promise<ScanRecord | null> {
    return (await db.scans.get(id)) ?? null;
  }

  static async getUnsynced(): Promise<ScanRecord[]> {
    return await db.scans.where('syncStatus').equals('pending').toArray();
  }

  static async getPendingScans(): Promise<ScanRecord[]> {
    return await db.scans.where('synced').equals(0).toArray();
  }

  static async markAsSynced(ids: string[]): Promise<void> {
    await db.scans.where('id').anyOf(ids).modify({
      syncStatus: 'synced',
      synced: Date.now()
    });
  }

  static async markManySynced(ids: string[]): Promise<void> {
    await db.scans.where('id').anyOf(ids).modify({
      syncStatus: 'synced',
      synced: Date.now()
    });
  }

  static async markSyncError(id: string, error: string): Promise<void> {
    await db.scans.update(id, { syncStatus: 'error', syncError: error });
  }

  static async deleteBySession(sessionId: string): Promise<void> {
    await db.scans.where('sessionId').equals(sessionId).delete();
  }

  static async deleteBySessions(sessionIds: string[]): Promise<void> {
    await db.scans.where('sessionId').anyOf(sessionIds).delete();
  }

  static async getPendingSyncCount(): Promise<number> {
    return await db.scans.where('syncStatus').equals('pending').count();
  }

  static async countBySession(sessionId: string): Promise<number> {
    return await db.scans.where('sessionId').equals(sessionId).count();
  }

  static async getIncidents(): Promise<ScanRecord[]> {
    return await db.scans.filter(scan => scan.isIncident === true).toArray();
  }

  static async delete(id: string): Promise<void> {
    await db.scans.delete(id);
  }

  static async getRecent(limit: number = 50): Promise<ScanRecord[]> {
    return await db.scans.orderBy('timestamp').reverse().limit(limit).toArray();
  }

  static async getByDateRange(startDate: number, endDate: number): Promise<ScanRecord[]> {
    return await db.scans
      .filter(scan => scan.timestamp >= startDate && scan.timestamp <= endDate)
      .toArray();
  }

  static async getByBarcode(barcode: string): Promise<ScanRecord[]> {
    return await db.scans.where('barcode').equals(barcode).toArray();
  }
}

// Exportar como singleton para nuevo codigo
export const scanRepository = {
  save: ScanRepository.save,
  saveBatch: ScanRepository.saveBatch,
  getBySession: ScanRepository.getBySession,
  getAll: ScanRepository.getAll,
  get: ScanRepository.get,
  getUnsynced: ScanRepository.getUnsynced,
  getPendingScans: ScanRepository.getPendingScans,
  markAsSynced: ScanRepository.markAsSynced,
  markManySynced: ScanRepository.markManySynced,
  markSyncError: ScanRepository.markSyncError,
  deleteBySession: ScanRepository.deleteBySession,
  deleteBySessions: ScanRepository.deleteBySessions,
  getPendingSyncCount: ScanRepository.getPendingSyncCount,
  countBySession: ScanRepository.countBySession,
  getIncidents: ScanRepository.getIncidents,
  delete: ScanRepository.delete,
  getRecent: ScanRepository.getRecent,
  getByDateRange: ScanRepository.getByDateRange,
  getByBarcode: ScanRepository.getByBarcode,
};
