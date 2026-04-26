import { db } from '../db';
import { ScanRepository } from './ScanRepository';
import { SessionRepository } from './SessionRepository';

export const systemRepository = {
  async getStorageStats() {
    const stats = {
      products: await db.products.count(),
      sessions: await db.sessions.count(),
      scans: await db.scans.count(),
      logs: await db.logs.count(),
    };
    return stats;
  },

  async clearDiskData(): Promise<void> {
    await db.transaction('rw', [db.products, db.sessions, db.scans, db.logs, db.expectedOrders], async () => {
      await db.products.clear();
      await db.sessions.clear();
      await db.scans.clear();
      await db.logs.clear();
      await db.expectedOrders.clear();
    });
  },

  async repairDatabase(): Promise<string[]> {
    const logs: string[] = [];
    try {
      // 1. Verificar integridad de sesiones vs scans
      const sessions = await SessionRepository.getAll();
      for (const session of sessions) {
        const scans = await ScanRepository.getBySession(session.id);
        const totalUnits = scans.reduce((acc, s) => acc + (s.quantity || 1), 0);
        const totalSKUs = new Set(scans.map(s => s.barcode)).size;
        
        if (session.totalUnits !== totalUnits || session.totalSKUs !== totalSKUs) {
          await SessionRepository.save({
            ...session,
            totalUnits,
            totalSKUs
          });
          logs.push(`🔧 Reparada sesión ${session.id}: Sincronizadas unidades (${totalUnits}) y SKUs (${totalSKUs}).`);
        }
      }

      // 2. Limpiar scans huérfanos
      const sessionIds = new Set(sessions.map(s => s.id));
      const allScans = await ScanRepository.getAll();
      const orphanedScans = allScans.filter(s => !sessionIds.has(s.sessionId));
      
      if (orphanedScans.length > 0) {
        await ScanRepository.deleteBySessions(orphanedScans.map(s => s.sessionId));
        logs.push(`🔧 Eliminados ${orphanedScans.length} registros de escaneo huérfanos.`);
      }

      return logs;
    } catch (error: any) {
      logs.push(`❌ Error durante reparación: ${error.message}`);
      return logs;
    }
  },

  async purgeOldData(daysThreshold: number): Promise<number> {
    const dateLimit = Date.now() - (daysThreshold * 24 * 60 * 60 * 1000);
    const oldSessions = (await db.sessions.toArray()).filter(s => s.createdAt < dateLimit && s.status === 'completed');
    const ids = oldSessions.map(s => s.id);
    
    if (ids.length === 0) return 0;

    await db.transaction('rw', [db.sessions, db.scans], async () => {
      await db.scans.where('sessionId').anyOf(ids).delete();
      await db.sessions.bulkDelete(ids);
    });

    return ids.length;
  },

  async cleanOrphanedScans(): Promise<number> {
    const sessions = await db.sessions.toArray();
    const sessionIds = new Set(sessions.map(s => s.id));
    const scans = await db.scans.toArray();
    
    const orphanIds = scans.filter(s => !sessionIds.has(s.sessionId)).map(s => s.id);
    
    if (orphanIds.length > 0) {
      await db.scans.bulkDelete(orphanIds);
    }
    
    return orphanIds.length;
  }
};
