import { db } from '../db';
import { CountingSession } from '../types';

export class SessionRepository {
  static async save(session: CountingSession): Promise<void> {
    await db.sessions.put(session);
  }

  static async getById(id: string): Promise<CountingSession | undefined> {
    return await db.sessions.get(id);
  }

  static async getByIds(ids: string[]): Promise<CountingSession[]> {
    return await db.sessions.where('id').anyOf(ids).toArray();
  }

  static async getAll(): Promise<CountingSession[]> {
    return await db.sessions.toArray();
  }

  static async getByType(type: string): Promise<CountingSession[]> {
    return await db.sessions.where('sessionType').equals(type).toArray();
  }

  static async getSessionsByType(type: string, query: string = '', limitOptions?: number): Promise<CountingSession[]> {
    let collection = db.sessions.where('sessionType').equals(type);
    let results = await collection.reverse().toArray();
    
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(s => 
        s.id.toLowerCase().includes(q) || 
        (s.erpOrder?.toLowerCase().includes(q) || false) || 
        (s.logisticsLabel?.toLowerCase().includes(q) || false)
      );
    }
    
    if (limitOptions) {
      return results.slice(0, limitOptions);
    }
    return results;
  }

  static async getSyncedCount(): Promise<number> {
    const sessions = await db.sessions.toArray();
    return sessions.filter(s => !!s.lastSyncTimestamp).length;
  }

  static async getReceptionHistory(
    searchQuery: string = '',
    limit: number = 50,
    startTime?: number,
    endTime?: number
  ): Promise<CountingSession[]> {
    let collection = db.sessions.where('sessionType').equals('reception');
    
    if (startTime) {
      // In IndexedDB we can't chain multiple wheres easily without compound indexes,
      // so we filter the remainder below.
      // But we CAN filter here if we don't have indexes. We'll use a JS filter.
    }
    
    // We fetch and then filter to maintain index usage on sessionType
    let results = await collection.reverse().toArray();

    if (startTime || endTime || searchQuery) {
      results = results.filter(s => {
        let match = true;
        if (startTime && s.createdAt < startTime) match = false;
        if (endTime && s.createdAt > endTime) match = false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchesId = s.id.toLowerCase().includes(q);
          const matchesErp = s.erpOrder?.toLowerCase().includes(q) || false;
          const matchesLabel = s.logisticsLabel?.toLowerCase().includes(q) || false;
          if (!matchesId && !matchesErp && !matchesLabel) match = false;
        }
        return match;
      });
    }

    return results.slice(0, limit);
  }

  static async updateSyncTimestamp(id: string, timestamp: number = Date.now()): Promise<void> {
    await db.sessions.update(id, { lastSyncTimestamp: timestamp });
  }

  static async delete(id: string): Promise<void> {
    await db.sessions.delete(id);
  }

  static async deleteMany(ids: string[]): Promise<void> {
    await db.sessions.bulkDelete(ids);
  }

  static async deleteDraftReceptionSessions(): Promise<void> {
    const drafts = await db.sessions
      .where('sessionType')
      .equals('reception')
      .filter(s => s.status === 'draft')
      .toArray();
    const ids = drafts.map(s => s.id);
    if (ids.length > 0) {
      await db.sessions.bulkDelete(ids);
    }
  }

  static async markAsCompleted(id: string): Promise<void> {
    await db.sessions.update(id, { status: 'completed', lastSyncTimestamp: Date.now() });
  }

  static async update(id: string, changes: Partial<CountingSession>): Promise<void> {
    await db.sessions.update(id, changes);
  }
}
