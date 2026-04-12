import { db } from '../db';
import { ScanRecord } from '../types';
import { ScanSchema } from '../services/validationService';

export class ScanRepository {
  static async getBySessionId(sessionId: string): Promise<ScanRecord[]> {
    return await db.scans.where('sessionId').equals(sessionId).toArray();
  }

  static async getAll(): Promise<ScanRecord[]> {
    return await db.scans.toArray();
  }

  static async add(scan: ScanRecord): Promise<void> {
    // Validar antes de agregar
    ScanSchema.parse(scan);
    await db.scans.add(scan);
  }

  static async bulkAdd(scans: ScanRecord[]): Promise<void> {
    // Validar cada uno
    scans.forEach(s => ScanSchema.parse(s));
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

  static async getScansLast7Days(): Promise<{date: string, count: number}[]> {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      const start = d.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const count = await db.scans.where('timestamp').between(start, end).count();
      result.push({
        date: d.toLocaleDateString('es-CL', { weekday: 'short' }),
        count
      });
    }
    return result;
  }
}

// Forced GitHub sync
