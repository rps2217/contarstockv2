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

  static async getScansToday(startOfDay: number): Promise<number> {
    const scans = await db.scans.where('timestamp').aboveOrEqual(startOfDay).toArray();
    return scans.reduce((acc, s) => acc + s.quantity, 0);
  }

  static async getScansLast7Days(): Promise<{ date: string, v: number }[]> {
    const sevenDaysAgo = new Date().setDate(new Date().getDate() - 7);
    const scans = await db.scans.where('timestamp').aboveOrEqual(sevenDaysAgo).toArray();
    
    const groups: Record<string, number> = {};
    scans.forEach(s => {
      const date = new Date(s.timestamp).toISOString().split('T')[0];
      groups[date] = (groups[date] || 0) + s.quantity;
    });

    return Object.entries(groups).map(([date, v]) => ({ date, v }));
  }

  static async deleteBySessions(sessionIds: string[]): Promise<void> {
    await db.scans.where('sessionId').anyOf(sessionIds).delete();
  }
}
