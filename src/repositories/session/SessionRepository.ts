/**
 * SessionRepository - Patrón Singleton
 *
 * REEMPLAZA a src/repositories/SessionRepository.ts
 *
 * PATRÓN ACTUAL (v2):
 * - export const sessionRepository - Instancia singleton
 * - export class SessionRepository - Clase con métodos de instancia
 *
 * @deprecated Los métodos estáticos serán eliminados en v4
 */

import { db } from '../../db';
import { CountingSession } from '../../types';
import { CountingSessionSchema } from '../../schemas/database';

export class SessionRepository {
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
