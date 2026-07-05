import { db } from '../db';
import { CountingSession } from '../types';
import { CountingSessionSchema } from '../schemas/database';
import { IdValidator } from '../services/cloud/IdValidator';

/**
 * Repository para CountingSession
 * Maneja sesiones de conteo/inventario
 */
export class SessionRepository {
  // Metodos estaticos para compatibilidad hacia atras
  static async save(session: CountingSession): Promise<void> {
    const record = CountingSessionSchema.parse({
      ...session,
      syncStatus: session.syncStatus || 'pending'
    }) as CountingSession;
    await db.sessions.put(record);
  }

  static async saveBatch(sessions: CountingSession[]): Promise<void> {
    const records = sessions.map(s => CountingSessionSchema.parse({
      ...s,
      syncStatus: s.syncStatus || 'pending'
    })) as CountingSession[];
    await db.sessions.bulkPut(records);
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

  static async get(id: string): Promise<CountingSession | null> {
    return (await db.sessions.get(id)) ?? null;
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

  static async softDelete(id: string): Promise<CountingSession | null> {
    // Guarda una copia antes de marcar para eliminar
    const session = await db.sessions.get(id);
    if (!session) return null;
    
    await db.sessions.update(id, { syncStatus: 'pending_delete' });
    return session;
  }

  static async restore(id: string): Promise<void> {
    await db.sessions.update(id, { syncStatus: 'synced' });
  }

  static async permanentDelete(id: string): Promise<void> {
    await db.sessions.delete(id);
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

  static async getDraftReceptionSessions(limit: number = 50): Promise<CountingSession[]> {
    return await db.sessions
      .where('erpOrder')
      .equals('RECEPCION_BORRADOR')
      .reverse()
      .limit(limit)
      .toArray();
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

  static async getActive(): Promise<CountingSession[]> {
    return await db.sessions.where('status').equals('active').toArray();
  }

  static async getByStatus(status: CountingSession['status']): Promise<CountingSession[]> {
    return await db.sessions.where('status').equals(status).toArray();
  }

  static async getByOperator(operatorId: string): Promise<CountingSession[]> {
    return await db.sessions.where('operatorId').equals(operatorId).toArray();
  }

  static async getRecent(limit: number = 50): Promise<CountingSession[]> {
    return await db.sessions.orderBy('createdAt').reverse().limit(limit).toArray();
  }

  // Paginación con cursor para mejor performance
  static async getPaginated(options: {
    cursor?: string;
    limit: number;
    sortBy?: 'createdAt' | 'erpOrder';
    filter?: { sessionType?: string; status?: string };
  }): Promise<{
    items: CountingSession[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const { cursor, limit, sortBy = 'createdAt', filter } = options;
    
    let query = db.sessions.orderBy(sortBy);
    let results = await query.reverse().toArray();

    // Aplicar filtros
    if (filter?.sessionType) {
      results = results.filter(s => s.sessionType === filter.sessionType);
    }
    if (filter?.status) {
      results = results.filter(s => s.status === filter.status);
    }

    // Cursor-based pagination
    if (cursor) {
      const cursorIndex = results.findIndex(s => s.id === cursor);
      if (cursorIndex !== -1) {
        results = results.slice(cursorIndex + 1);
      }
    }

    const hasMore = results.length > limit;
    const items = results.slice(0, limit);
    
    return {
      items,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : undefined,
      hasMore,
    };
  }

  static async getByDateRange(startDate: number, endDate: number): Promise<CountingSession[]> {
    return await db.sessions
      .filter(s => s.createdAt >= startDate && s.createdAt <= endDate)
      .toArray();
  }

  static async updateAudit(id: string, auditStatus: CountingSession['auditStatus'], score: number): Promise<void> {
    await db.sessions.update(id, {
      auditStatus,
      auditScore: score,
      auditTimestamp: Date.now()
    });
  }

  static async markSynced(id: string): Promise<void> {
    await db.sessions.update(id, { lastSyncTimestamp: Date.now(), syncStatus: 'synced' });
  }

  /**
   * Valida y filtra sesiones antes de sincronización
   * Remueve sesiones con IDs problemáticos que causarían errores 406
   */
  static async getValidForSync(): Promise<CountingSession[]> {
    const sessions = await db.sessions.toArray();
    const { valid, invalid } = IdValidator.filterValidIds(
      sessions.map(s => s.id),
      'SESSIONS'
    );

    if (invalid.length > 0) {
      console.warn(`[SessionRepository] Filtradas ${invalid.length} sesiones con IDs inválidos`);
    }

    const validSet = new Set(valid);
    return sessions.filter(s => validSet.has(s.id));
  }

  /**
   * Obtiene sesiones pendientes de sync con IDs válidos
   */
  static async getPendingSync(): Promise<CountingSession[]> {
    const allSessions = await this.getValidForSync();
    return allSessions.filter(s => s.syncStatus === 'pending');
  }
}

// Singleton para nuevo codigo
export const sessionRepository = {
  save: SessionRepository.save,
  saveBatch: SessionRepository.saveBatch,
  getById: SessionRepository.getById,
  getByIds: SessionRepository.getByIds,
  getAll: SessionRepository.getAll,
  get: SessionRepository.get,
  getByType: SessionRepository.getByType,
  getSessionsByType: SessionRepository.getSessionsByType,
  getSyncedCount: SessionRepository.getSyncedCount,
  getPendingSyncCount: SessionRepository.getPendingSyncCount,
  getReceptionHistory: SessionRepository.getReceptionHistory,
  updateSyncTimestamp: SessionRepository.updateSyncTimestamp,
  delete: SessionRepository.delete,
  deleteMany: SessionRepository.deleteMany,
  softDelete: SessionRepository.softDelete,
  restore: SessionRepository.restore,
  permanentDelete: SessionRepository.permanentDelete,
  deleteDraftReceptionSessions: SessionRepository.deleteDraftReceptionSessions,
  getDraftReceptionSessions: SessionRepository.getDraftReceptionSessions,
  markAsCompleted: SessionRepository.markAsCompleted,
  update: SessionRepository.update,
  updatePhotoUrl: SessionRepository.updatePhotoUrl,
  getActive: SessionRepository.getActive,
  getByStatus: SessionRepository.getByStatus,
  getByOperator: SessionRepository.getByOperator,
  getRecent: SessionRepository.getRecent,
  getByDateRange: SessionRepository.getByDateRange,
  getPaginated: SessionRepository.getPaginated,
  updateAudit: SessionRepository.updateAudit,
  markSynced: SessionRepository.markSynced,
  getValidForSync: SessionRepository.getValidForSync,
  getPendingSync: SessionRepository.getPendingSync,
};
