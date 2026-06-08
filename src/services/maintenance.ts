import { db } from '../db';
import { getSettings } from './settings';
import { ScanRepository } from '../repositories/ScanRepository';
import { SessionRepository } from '../repositories/SessionRepository';

export interface HealthReport {
  status: 'healthy' | 'warning' | 'critical';
  totalRecords: number;
  storageUsage: number;
  orphans: number;
}

/**
 * 1. Reparar punteros de sesiones.
 * 2. Limpiar registros antiguos.
 */
export const checkSystemHealth = async (): Promise<HealthReport> => {
  const sessions = await SessionRepository.getAll();
  const sessionIds = new Set(sessions.map(s => s.id));
  const scans = await ScanRepository.getAll();
  
  const orphans = scans.filter(s => !sessionIds.has(s.sessionId)).length;
  const total = sessions.length + scans.length;
  
  // Estimación simple de KB: ~1KB por sesión, ~0.5KB por scan
  const usage = (sessions.length * 1024) + (scans.length * 512);

  return {
    status: orphans > 100 ? 'critical' : orphans > 0 ? 'warning' : 'healthy',
    totalRecords: total,
    storageUsage: usage,
    orphans
  };
};

export const repairSystem = async (): Promise<string[]> => {
  const logs: string[] = [];
  
  // 1. Reparar Metadata de Sesiones
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
};

export const purgeOldData = async (days: number): Promise<number> => {
  const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
  const oldSessions = (await db.sessions.toArray()).filter(s => s.createdAt < threshold && s.status === 'completed');
  const ids = oldSessions.map(s => s.id);
  
  if (ids.length > 0) {
    await db.transaction('rw', [db.sessions, db.scans], async () => {
      await db.scans.where('sessionId').anyOf(ids).delete();
      await db.sessions.bulkDelete(ids);
    });
  }
  
  return ids.length;
};

export const cleanSyncedSessions = async (): Promise<number> => {
  const sessions = await db.sessions.where('lastSyncTimestamp').above(0).toArray();
  const ids = sessions.map(s => s.id);
  if (ids.length > 0) {
    await db.scans.where('sessionId').anyOf(ids).delete();
    await SessionRepository.deleteMany(ids);
  }
  return ids.length;
};
