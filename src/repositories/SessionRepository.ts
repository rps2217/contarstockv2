import { db } from '../db';
import { CountingSession } from '../types';
import { CountingSessionSchema } from '../schemas/database';

export class SessionRepository {
  static async save(session: CountingSession): Promise<void> {
    const record = CountingSessionSchema.parse({
      ...session,
      syncStatus: session.syncStatus || 'pending'
    }) as CountingSession;
    await db.sessions.put(record);
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
    return await db.sessions.where('syncStatus').equals('synced').count();
  }

  static async getPendingSyncCount(): Promise<number> {
    return await db.sessions.where('syncStatus').equals('pending').count();
  }

  static async getReceptionHistory(
    searchQuery: string = '',
    limit: number = 50,
    startTime?: number,
    endTime?: number
  ): Promise<CountingSession[]> {
    let collection = db.sessions.where('sessionType').equals('reception');
    
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
    await db.sessions.update(id, { 
      lastSyncTimestamp: timestamp,
      syncStatus: 'synced'
    });
  }

  static async delete(id: string): Promise<void> {
    const session = await db.sessions.get(id);
    if (session) {
      if (session.syncStatus === 'synced' || session.syncStatus === 'error') {
        await db.sessions.update(id, { syncStatus: 'pending_delete' });
      } else {
        await db.sessions.delete(id);
      }
    }
  }

  static async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
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
    await db.sessions.update(id, { 
      status: 'completed', 
      lastSyncTimestamp: Date.now(),
      syncStatus: 'pending'
    });
  }

  static async update(id: string, changes: Partial<CountingSession>): Promise<void> {
    await db.sessions.update(id, {
      ...changes,
      syncStatus: 'pending'
    });
  }

  static async updatePhotoUrl(id: string, photoUrl: string): Promise<void> {
    await db.sessions.update(id, { 
      photoUrl,
      syncStatus: 'pending'
    });
  }
}
