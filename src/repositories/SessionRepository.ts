import { db } from '../db';
import { CountingSession } from '../types';

export class SessionRepository {
  static async getById(id: string): Promise<CountingSession | undefined> {
    return await db.sessions.get(id);
  }

  static async getAll(): Promise<CountingSession[]> {
    return await db.sessions.toArray();
  }

  static async getActiveSessions(): Promise<CountingSession[]> {
    return await db.sessions.where('status').anyOf(['draft', 'active']).toArray();
  }

  static async getDraftSessions(): Promise<CountingSession[]> {
    return await db.sessions.where('status').equals('draft').reverse().toArray();
  }

  static async getDraftReceptionSessions(): Promise<CountingSession[]> {
    return await db.sessions.where('status').equals('draft')
      .and(s => s.erpOrder === 'RECEPCION_BORRADOR')
      .reverse().toArray();
  }

  static async getSessionsByType(type: string, query: string, limit: number): Promise<CountingSession[]> {
    let collection = db.sessions.where('sessionType').equals(type);
    
    if (query) {
      return await collection
        .filter(s => 
          (s.erpOrder?.toLowerCase() || '').includes(query) || 
          (s.logisticsLabel?.toLowerCase() || '').includes(query)
        )
        .reverse()
        .limit(limit)
        .toArray();
    }

    return await collection.reverse().limit(limit).toArray();
  }

  static async save(session: CountingSession): Promise<void> {
    await db.sessions.put(session);
  }

  static async update(id: string, changes: Partial<CountingSession>): Promise<void> {
    await db.sessions.update(id, changes);
  }

  static async markAsCompleted(ids: string[]): Promise<void> {
    await db.sessions.where('id').anyOf(ids).modify({ status: 'completed' });
  }

  static async delete(id: string): Promise<void> {
    await db.sessions.delete(id);
  }

  static async deleteDrafts(): Promise<void> {
    await db.sessions.where('status').equals('draft').delete();
  }

  static async deleteDraftReceptionSessions(): Promise<void> {
    await db.sessions.where('status').equals('draft')
      .and(s => s.erpOrder === 'RECEPCION_BORRADOR')
      .delete();
  }

  static async getSyncedCount(): Promise<number> {
    return await db.sessions.where('lastSyncTimestamp').above(0).count();
  }
}

// Forced GitHub sync
