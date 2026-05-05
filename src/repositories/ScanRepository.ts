import { db } from '../db';
import { ScanRecord } from '../types';
import { ScanRecordSchema } from '../schemas/database';

export class ScanRepository {
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

  static async getUnsynced(): Promise<ScanRecord[]> {
    return await db.scans.where('syncStatus').equals('pending').toArray();
  }

  static async markAsSynced(ids: string[]): Promise<void> {
    await db.scans.where('id').anyOf(ids).modify({ 
      syncStatus: 'synced',
      synced: Date.now() 
    });
  }

  static async deleteBySession(sessionId: string): Promise<void> {
    await db.scans.where('sessionId').equals(sessionId).delete();
  }

  static async getPendingSyncCount(): Promise<number> {
    return await db.scans.where('syncStatus').equals('pending').count();
  }

  static async deleteBySessions(sessionIds: string[]): Promise<void> {
    await db.scans.where('sessionId').anyOf(sessionIds).delete();
  }
}
