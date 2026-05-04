import { db } from '../db';
import { ScanRecord } from '../types';

export class ScanRepository {
  static async save(scan: ScanRecord): Promise<void> {
    await db.scans.put(scan);
  }

  static async getBySession(sessionId: string): Promise<ScanRecord[]> {
    return await db.scans.where('sessionId').equals(sessionId).toArray();
  }

  static async getAll(): Promise<ScanRecord[]> {
    return await db.scans.toArray();
  }

  static async getUnsynced(): Promise<ScanRecord[]> {
    return await db.scans.where('synced').equals(0).toArray();
  }

  static async markAsSynced(ids: string[]): Promise<void> {
    await db.scans.where('id').anyOf(ids).modify({ synced: 1 });
  }

  static async deleteBySession(sessionId: string): Promise<void> {
    await db.scans.where('sessionId').equals(sessionId).delete();
  }

  static async getPendingSyncCount(): Promise<number> {
    return await db.scans.where('synced').equals(0).count();
  }

  static async deleteBySessions(sessionIds: string[]): Promise<void> {
    await db.scans.where('sessionId').anyOf(sessionIds).delete();
  }
}
