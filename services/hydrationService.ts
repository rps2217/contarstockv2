import { db } from '../db';
import { logger } from './logger';

export interface AppSnapshot {
  timestamp: number;
  lastSync: number | null;
  productCount: number;
  sessionCount: number;
  lastSessionId: string | null;
  pendingSyncCount: number;
}

const STORAGE_KEY = 'logicount_app_snapshot';

export const HydrationService = {
  /**
   * Captura un resumen rápido del estado actual de la base de datos.
   */
  persist: async (): Promise<void> => {
    try {
      const [productCount, sessionCount, pendingSyncCount] = await Promise.all([
        db.products.count(),
        db.sessions.count(),
        db.dynamic_data.where('syncStatus').equals('pending').count()
      ]);

      const lastSession = await db.sessions.orderBy('startTime').last();
      const lastSyncStr = localStorage.getItem('logicount_last_sync');

      const snapshot: AppSnapshot = {
        timestamp: Date.now(),
        lastSync: lastSyncStr ? parseInt(lastSyncStr) : null,
        productCount,
        sessionCount,
        lastSessionId: lastSession?.id || null,
        pendingSyncCount
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      logger.warn('HYDRATION', 'No se pudo persistir el snapshot', e);
    }
  },

  /**
   * Obtiene el último snapshot guardado para hidratación inmediata de la UI.
   */
  getSnapshot: (): AppSnapshot | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
};
