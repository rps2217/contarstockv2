/**
 * SessionRepository - Patrón Singleton
 *
 * REEMPLAZA a src/repositories/SessionRepository.ts
 *
 * PATRÓN ACTUAL (v2):
 * - export const sessionRepository - Instancia singleton
 * - export class SessionRepository - Clase con métodos de instancia + estáticos
 *
 * @deprecated Los métodos estáticos serán eliminados en v4
 */

import { db } from '../../db';
import { CountingSession } from '../../types';
import { CountingSessionSchema } from '../../schemas/database';

export class SessionRepository {
  // ============================================================================
  // MÉTODOS ESTÁTICOS (Legacy - para backwards compatibility)
  // ============================================================================
  static async save(session: CountingSession): Promise<void> {
    const record = CountingSessionSchema.parse({
      ...session,
      syncStatus: session.syncStatus || 'pending',
    }) as CountingSession;
    await db.sessions.put(record);
  }

  static async saveBatch(sessions: CountingSession[]): Promise<void> {
    const records = sessions.map(s =>
      CountingSessionSchema.parse({
        ...s,
        syncStatus: s.syncStatus || 'pending',
      })
    ) as CountingSession[];
    await db.sessions.bulkPut(records);
  }

  static async getById(id: string): Promise<CountingSession | undefined> {
    return await db.sessions.get(id);
  }

  static async getAll(): Promise<CountingSession[]> {
    return await db.sessions.toArray();
  }

  static async delete(id: string): Promise<void> {
    await db.sessions.delete(id);
  }

  static async update(id: string, changes: Partial<CountingSession>): Promise<void> {
    await db.sessions.update(id, changes);
  }

  static async getByStatus(status: string): Promise<CountingSession[]> {
    return await db.sessions.where('status').equals(status).toArray();
  }

  static async markAsSynced(ids: string[]): Promise<void> {
    await db.sessions.where('id').anyOf(ids).modify({
      syncStatus: 'synced',
      synced: Date.now(),
    });
  }

  static async getUnsynced(): Promise<CountingSession[]> {
    return await db.sessions.where('syncStatus').equals('pending').toArray();
  }

  static async clearAll(): Promise<void> {
    await db.sessions.clear();
  }

  static async getRecent(limit: number = 50): Promise<CountingSession[]> {
    return await db.sessions.orderBy('createdAt').reverse().limit(limit).toArray();
  }

  static async getActiveSessions(): Promise<CountingSession[]> {
    return await db.sessions.where('status').equals('active').toArray();
  }

  static async getByLocation(locationId: string): Promise<CountingSession[]> {
    return await db.sessions.where('locationId').equals(locationId).toArray();
  }

  static async markAsCompleted(id: string): Promise<void> {
    await db.sessions.update(id, { status: 'completed', syncStatus: 'pending' });
  }

  static async getReceptionHistory(
    startDate: number,
    endDate: number,
    limit: number
  ): Promise<CountingSession[]> {
    return await db.sessions
      .where('createdAt')
      .between(startDate, endDate)
      .reverse()
      .limit(limit)
      .toArray();
  }

  static async getByDateRange(startDate: number, endDate: number): Promise<CountingSession[]> {
    return await db.sessions.where('createdAt').between(startDate, endDate).toArray();
  }

  static async deleteDraftReceptionSessions(receptionId: string): Promise<void> {
    const sessions = await db.sessions
      .where('erpOrder')
      .equals(receptionId)
      .filter(s => s.status === 'draft')
      .toArray();

    if (sessions.length > 0) {
      await db.sessions.bulkDelete(sessions.map(s => s.id));
    }
  }

  static async getDraftReceptionSessions(receptionId: string): Promise<CountingSession[]> {
    return await db.sessions
      .where('erpOrder')
      .equals(receptionId)
      .filter(s => s.status === 'draft')
      .toArray();
  }

  static async getPaginated(
    page: number,
    pageSize: number
  ): Promise<{ data: CountingSession[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const total = await db.sessions.count();
    const data = await db.sessions.offset(offset).limit(pageSize).toArray();
    return { data, total };
  }

  static async getPaginatedWithCursor(options: {
    cursor?: string | number;
    limit: number;
    sortBy?: string;
    filter?: Record<string, string>;
  }): Promise<{
    items: CountingSession[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    // Apply sorting
    const sortField = options.sortBy || 'createdAt';
    const data = await db.sessions
      .orderBy(sortField)
      .reverse()
      .limit(options.limit + 1)
      .toArray();

    const hasMore = data.length > options.limit;
    const items = hasMore ? data.slice(0, -1) : data;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, hasMore, nextCursor };
  }

  static async markSynced(ids: string[]): Promise<void> {
    const timestamp = Date.now();
    await db.sessions.where('id').anyOf(ids).modify({
      syncStatus: 'synced',
      lastSyncTimestamp: timestamp,
    });
  }

  static async getPendingSync(): Promise<CountingSession[]> {
    return await db.sessions.where('syncStatus').equals('pending').toArray();
  }

  static async getValidForSync(): Promise<CountingSession[]> {
    return await db.sessions
      .where('syncStatus')
      .equals('pending')
      .filter(s => s.status === 'completed')
      .toArray();
  }

  static async getSyncedCount(): Promise<number> {
    return await db.sessions.where('syncStatus').equals('synced').count();
  }

  static async getPendingSyncCount(): Promise<number> {
    return await db.sessions.where('syncStatus').equals('pending').count();
  }

  static async deleteMany(ids: string[]): Promise<void> {
    await db.sessions.bulkDelete(ids);
  }

  static async getByType(type: string): Promise<CountingSession[]> {
    return await db.sessions.where('sessionType').equals(type).toArray();
  }

  static async softDelete(id: string): Promise<void> {
    await db.sessions.update(id, { status: 'deleted', syncStatus: 'pending' });
  }

  static async restore(id: string): Promise<void> {
    await db.sessions.update(id, { status: 'draft', syncStatus: 'pending' });
  }

  // ============================================================================
  // MÉTODOS ESTÁTICOS ADICIONALES (para uso legacy sin argumentos)
  // ============================================================================
  static async getAllDraftReceptionSessions(): Promise<CountingSession[]> {
    return await db.sessions
      .filter(s => s.sessionType === 'reception' && s.status === 'draft')
      .toArray();
  }

  static async deleteAllDraftReceptionSessions(): Promise<void> {
    const sessions = await db.sessions
      .filter(s => s.sessionType === 'reception' && s.status === 'draft')
      .toArray();
    if (sessions.length > 0) {
      await db.sessions.bulkDelete(sessions.map(s => s.id));
    }
  }

  // ============================================================================
  // MÉTODOS DE INSTANCIA (Nuevo patrón)
  // ============================================================================
  private table = () => db.sessions;

  async save(session: CountingSession): Promise<void> {
    const record = CountingSessionSchema.parse({
      ...session,
      syncStatus: session.syncStatus || 'pending',
    }) as CountingSession;
    await this.table().put(record);
  }

  async saveBatch(sessions: CountingSession[]): Promise<void> {
    const records = sessions.map(s =>
      CountingSessionSchema.parse({
        ...s,
        syncStatus: s.syncStatus || 'pending',
      })
    ) as CountingSession[];
    await this.table().bulkPut(records);
  }

  async getById(id: string): Promise<CountingSession | undefined> {
    return await this.table().get(id);
  }

  async getByIds(ids: string[]): Promise<CountingSession[]> {
    return await this.table().where('id').anyOf(ids).toArray();
  }

  async getAll(): Promise<CountingSession[]> {
    return await this.table().toArray();
  }

  async get(id: string): Promise<CountingSession | null> {
    return (await this.table().get(id)) ?? null;
  }

  async getByType(type: string): Promise<CountingSession[]> {
    return await this.table().where('sessionType').equals(type).toArray();
  }

  async getSessionsByType(
    type: string,
    query: string = '',
    limitOptions?: number
  ): Promise<CountingSession[]> {
    let collection = this.table().where('sessionType').equals(type);
    let results = await collection.reverse().toArray();

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        s =>
          s.id.toLowerCase().includes(q) ||
          s.erpOrder?.toLowerCase().includes(q) ||
          false ||
          s.logisticsLabel?.toLowerCase().includes(q) ||
          false
      );
    }

    if (limitOptions && limitOptions > 0) {
      results = results.slice(0, limitOptions);
    }

    return results;
  }

  async getSyncedCount(): Promise<number> {
    return await this.table().where('syncStatus').equals('synced').count();
  }

  async getPendingSyncCount(): Promise<number> {
    return await this.table().where('syncStatus').equals('pending').count();
  }

  async getReceptionHistory(
    startDate: number,
    endDate: number,
    limit: number
  ): Promise<CountingSession[]> {
    return await this.table()
      .where('createdAt')
      .between(startDate, endDate)
      .reverse()
      .limit(limit)
      .toArray();
  }

  async updateSyncTimestamp(id: string, timestamp: number): Promise<void> {
    await this.table().update(id, { lastSyncTimestamp: timestamp, syncStatus: 'synced' });
  }

  async delete(id: string): Promise<void> {
    await this.table().delete(id);
  }

  async deleteMany(ids: string[]): Promise<void> {
    await this.table().bulkDelete(ids);
  }

  async softDelete(id: string): Promise<void> {
    await this.table().update(id, { status: 'deleted', syncStatus: 'pending' });
  }

  async restore(id: string): Promise<void> {
    await this.table().update(id, { status: 'draft', syncStatus: 'pending' });
  }

  async permanentDelete(id: string): Promise<void> {
    await this.table().delete(id);
  }

  async deleteDraftReceptionSessions(receptionId: string): Promise<void> {
    const sessions = await this.table()
      .where('erpOrder')
      .equals(receptionId)
      .filter(s => s.status === 'draft')
      .toArray();

    if (sessions.length > 0) {
      await this.table().bulkDelete(sessions.map(s => s.id));
    }
  }

  async getDraftReceptionSessions(receptionId: string): Promise<CountingSession[]> {
    return await this.table()
      .where('erpOrder')
      .equals(receptionId)
      .filter(s => s.status === 'draft')
      .toArray();
  }

  async markAsCompleted(id: string): Promise<void> {
    await this.table().update(id, { status: 'completed', syncStatus: 'pending' });
  }

  async update(session: Partial<CountingSession> & { id: string }): Promise<void> {
    await this.table().update(session.id, session);
  }

  async updatePhotoUrl(id: string, photoUrl: string): Promise<void> {
    await this.table().update(id, { photoUrl, syncStatus: 'pending' });
  }

  async getActive(): Promise<CountingSession[]> {
    return await this.table().where('status').anyOf(['active', 'in_progress']).toArray();
  }

  async getByStatus(status: string): Promise<CountingSession[]> {
    return await this.table().where('status').equals(status).toArray();
  }

  async getByOperator(operatorId: string): Promise<CountingSession[]> {
    return await this.table()
      .filter(s => s.operatorId === operatorId)
      .toArray();
  }

  async getRecent(limit: number = 10): Promise<CountingSession[]> {
    return await this.table().orderBy('createdAt').reverse().limit(limit).toArray();
  }

  async getByDateRange(startDate: number, endDate: number): Promise<CountingSession[]> {
    return await this.table().where('createdAt').between(startDate, endDate).toArray();
  }

  async getPaginated(
    page: number,
    pageSize: number
  ): Promise<{ data: CountingSession[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const total = await this.table().count();
    const data = await this.table().offset(offset).limit(pageSize).toArray();
    return { data, total };
  }

  async updateAudit(id: string, audit: Record<string, unknown>): Promise<void> {
    await this.table().update(id, { audit, syncStatus: 'pending' });
  }

  async markSynced(ids: string[]): Promise<void> {
    const timestamp = Date.now();
    await this.table().where('id').anyOf(ids).modify({
      syncStatus: 'synced',
      lastSyncTimestamp: timestamp,
    });
  }

  async getValidForSync(): Promise<CountingSession[]> {
    return await this.table()
      .where('syncStatus')
      .equals('pending')
      .filter(s => s.status === 'completed')
      .toArray();
  }

  async getPendingSync(): Promise<CountingSession[]> {
    return await this.table().where('syncStatus').equals('pending').toArray();
  }
}

// ============================================================================
// EXPORT - SINGLETON
// ============================================================================

export const sessionRepository = new SessionRepository();

// ============================================================================
// EXPORT LEGACY (Deprecated - para backwards compatibility)
// ============================================================================

export const SessionRepositoryLegacy = {
  save: (session: CountingSession) => sessionRepository.save(session),
  saveBatch: (sessions: CountingSession[]) => sessionRepository.saveBatch(sessions),
  getById: (id: string) => sessionRepository.getById(id),
  getByIds: (ids: string[]) => sessionRepository.getByIds(ids),
  getAll: () => sessionRepository.getAll(),
  get: (id: string) => sessionRepository.get(id),
  getByType: (type: string) => sessionRepository.getByType(type),
  getSessionsByType: (type: string, query?: string, limit?: number) =>
    sessionRepository.getSessionsByType(type, query, limit),
  getSyncedCount: () => sessionRepository.getSyncedCount(),
  getPendingSyncCount: () => sessionRepository.getPendingSyncCount(),
  getReceptionHistory: (start: number, end: number, limit: number) =>
    sessionRepository.getReceptionHistory(start, end, limit),
  updateSyncTimestamp: (id: string, ts: number) => sessionRepository.updateSyncTimestamp(id, ts),
  delete: (id: string) => sessionRepository.delete(id),
  deleteMany: (ids: string[]) => sessionRepository.deleteMany(ids),
  softDelete: (id: string) => sessionRepository.softDelete(id),
  restore: (id: string) => sessionRepository.restore(id),
  permanentDelete: (id: string) => sessionRepository.permanentDelete(id),
  deleteDraftReceptionSessions: (id: string) => sessionRepository.deleteDraftReceptionSessions(id),
  getDraftReceptionSessions: (id: string) => sessionRepository.getDraftReceptionSessions(id),
  markAsCompleted: (id: string) => sessionRepository.markAsCompleted(id),
  update: (session: Partial<CountingSession> & { id: string }) => sessionRepository.update(session),
  updatePhotoUrl: (id: string, url: string) => sessionRepository.updatePhotoUrl(id, url),
  getActive: () => sessionRepository.getActive(),
  getByStatus: (status: string) => sessionRepository.getByStatus(status),
  getByOperator: (id: string) => sessionRepository.getByOperator(id),
  getRecent: (limit?: number) => sessionRepository.getRecent(limit),
  getByDateRange: (start: number, end: number) => sessionRepository.getByDateRange(start, end),
  getPaginated: (page: number, size: number) => sessionRepository.getPaginated(page, size),
  updateAudit: (id: string, audit: Record<string, unknown>) =>
    sessionRepository.updateAudit(id, audit),
  markSynced: (ids: string[]) => sessionRepository.markSynced(ids),
  getValidForSync: () => sessionRepository.getValidForSync(),
  getPendingSync: () => sessionRepository.getPendingSync(),
};
