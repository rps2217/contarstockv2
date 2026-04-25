import { db } from '../db';
import { logger } from '../services/logger';

export class SystemRepository {
  /**
   * Obtiene estadísticas de ocupación de las tablas locales
   */
  static async getStorageStats() {
    const stats = {
      scans: await db.scans.count(),
      sessions: await db.sessions.count(),
      products: await db.products.count(),
      logs: await db.logs.count(),
      dynamicData: await db.dynamic_data.count(),
      expectedOrders: await db.expectedOrders.count()
    };
    return stats;
  }

  /**
   * Realiza una limpieza de logs antiguos excediendo el límite
   */
  static async purgeLogs(limit = 1000) {
    const count = await db.logs.count();
    if (count > limit) {
      const toDelete = count - limit;
      const oldKeys = await db.logs.orderBy('timestamp').limit(toDelete).primaryKeys();
      await db.logs.bulkDelete(oldKeys);
      logger.info('SYSTEM', `Purgados ${toDelete} registros de log antiguos.`);
      return toDelete;
    }
    return 0;
  }

  /**
   * Detecta anomalías en las cantidades escaneadas (ej. saltos de cantidad sospechosos)
   */
  static async detectAnomalies(threshold = 50) {
    const scans = await db.scans.where('quantity').above(threshold).toArray();
    return scans.map(s => ({
      id: s.id,
      barcode: s.barcode,
      quantity: s.quantity,
      timestamp: s.timestamp
    }));
  }

  /**
   * Verifica la integridad referencial básica
   * (Scans sin sesión existente)
   */
  static async checkIntegrity() {
    const scans = await db.scans.toArray();
    const sessionIds = new Set((await db.sessions.toArray()).map(s => s.id));
    
    const orphans = scans.filter(s => !sessionIds.has(s.sessionId));
    return {
      orphanScans: orphans.length,
      orphanIds: orphans.map(o => o.id)
    };
  }

  /**
   * Elimina registros huérfanos detectados
   */
  static async fixIntegrity(orphanIds: string[]) {
    if (orphanIds.length > 0) {
      await db.scans.bulkDelete(orphanIds);
      logger.warn('SYSTEM', `Eliminados ${orphanIds.length} registros huérfanos.`);
    }
  }
}
