import { db } from '../db';
import { supabaseSyncService } from './supabaseSyncService';
import { getSettings } from './settings';
import { logger } from './logger';

export const sessionService = {
  /**
   * Crea una nueva sesión.
   */
  startSession: async (erpOrder: string, logisticsLabel: string, sessionType: 'erp' | 'standard' = 'standard') => {
    const id = crypto.randomUUID();
    const session = {
      id,
      erpOrder: erpOrder.toUpperCase(),
      logisticsLabel: logisticsLabel.toUpperCase(),
      sessionType,
      status: 'active' as const,
      createdAt: Date.now()
    };
    
    await db.sessions.add(session);
    logger.info('SESSION_START', `Sesión ${id} iniciada`);
    return id;
  },

  /**
   * Cierra y guarda una sesión con sus escaneos.
   */
  saveSession: async (session: any, scans: any[]) => {
    try {
      const settings = getSettings();
      const targetTable = settings.sessionType === 'erp' ? 'ENTREGAS_LOGISTICA' : 'SESIONES_CONTEO';
      
      // 1. Guardar localmente
      await db.sessions.put(session);
      
      // 2. Sincronización inmediata (Fondo)
      supabaseSyncService.pushBatch(targetTable, [session]).then(res => {
        if (res.success) {
          db.sessions.update(session.id, { lastSyncTimestamp: Date.now() });
        }
      });

      // 2. Transacción de Items
      const records = scans.map(s => ({
        ...s,
        sessionId: session.id,
        synced: 0
      }));

      await (db as any).transaction('rw', db.scans, db.sessions, async () => {
        await db.scans.bulkAdd(records);
      });

      logger.info('SESSION_SAVE', `Sesión ${session.id} guardada con ${scans.length} items`);
      return session.id;
    } catch (error: any) {
      logger.error('SESSION_SAVE_FAIL', error.message);
      throw error;
    }
  },

  /**
   * Obtiene todas las sesiones locales.
   */
  getSessions: async () => {
    return await db.sessions.toArray();
  },

  /**
   * Busca una sesión por ID.
   */
  getSession: async (id: string) => {
    return await db.sessions.get(id);
  },

  /**
   * Elimina una sesión y sus escaneos.
   */
  deleteSession: async (id: string) => {
    await (db as any).transaction('rw', db.scans, db.sessions, async () => {
      await db.scans.where('sessionId').equals(id).delete();
      await db.sessions.delete(id);
    });
    logger.info('SESSION_DELETE', ` Sesión ${id} eliminada`);
  },

  /**
   * Limpia sesiones sincronizadas.
   */
  cleanSynced: async () => {
    const sessions = await db.sessions.where('lastSyncTimestamp').above(0).toArray();
    const ids = sessions.map(s => s.id);
    if (ids.length > 0) {
      await (db as any).transaction('rw', db.scans, db.sessions, async () => {
        await db.scans.where('sessionId').anyOf(ids).delete();
        await db.sessions.bulkDelete(ids);
      });
    }
    return ids.length;
  }
};
