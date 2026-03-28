import { db } from '../db';
import { ScanRecord } from '../types';

export class ScanRepository {
  static async getBySessionId(sessionId: string): Promise<ScanRecord[]> {
    return await db.scans.where('sessionId').equals(sessionId).toArray();
  }

  static async getAll(): Promise<ScanRecord[]> {
    return await db.scans.toArray();
  }

  static async add(scan: ScanRecord): Promise<void> {
    await db.scans.add(scan);
  }

  static async bulkAdd(scans: ScanRecord[]): Promise<void> {
    await db.scans.bulkAdd(scans);
  }

  static async delete(id: string): Promise<void> {
    await db.scans.delete(id);
  }

  static async deleteBySessionId(sessionId: string): Promise<void> {
    await db.scans.where('sessionId').equals(sessionId).delete();
  }

  static async getRecentBySession(sessionId: string, limit: number = 1): Promise<ScanRecord[]> {
    return await db.scans
      .where('sessionId')
      .equals(sessionId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async getPendingSyncCount(): Promise<number> {
    return await db.scans.where('synced').equals(0).count();
  }

  static async getScansToday(today: number): Promise<number> {
    return await db.scans.where('timestamp').above(today).count();
  }
}
