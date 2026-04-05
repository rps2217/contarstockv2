
import { db } from '../db';
import { logger } from './logger';

export interface HealthReport {
 status: 'healthy' | 'warning' | 'critical';
 orphanScans: number;
 stuckSyncJobs: number;
 corruptProducts: number;
 storageUsage: number; 
 totalRecords: number;
}

/**
 * Analiza la integridad referencial y el estado físico de la base de datos.
 */
export const checkSystemHealth = async (): Promise<HealthReport> => {
 const sessionIds = new Set(await db.sessions.toCollection().primaryKeys());
 
 let orphanScans = 0;
 await db.scans.each(scan => {
 if (!sessionIds.has(scan.sessionId)) {
 orphanScans++;
 }
 });

 const stuckSyncJobs = await db.dynamic_data
 .where('syncStatus').equals('error')
 .count();

 const corruptProducts = await db.products
 .filter(p => !p.barcode || !p.name)
 .count();

 let storageUsage = 0;
 if (navigator.storage && navigator.storage.estimate) {
 const estimate = await navigator.storage.estimate();
 storageUsage = estimate.usage || 0;
 }

 const totalRecords = (await db.scans.count()) + (await db.sessions.count());

 let status: 'healthy' | 'warning' | 'critical' = 'healthy';
 if (orphanScans > 0 || stuckSyncJobs > 0) status = 'warning';
 if (corruptProducts > 0 || storageUsage > 100 * 1024 * 1024) status = 'critical';

 return {
 status,
 orphanScans,
 stuckSyncJobs,
 corruptProducts,
 storageUsage,
 totalRecords
 };
};

/**
 * PURGE OLD DATA (Step 5): Cold Storage Purging
 * Elimina sesiones completadas hace más de 30 días de IndexedDB.
 * Se asume que ya están en Firebase.
 */
export const purgeOldData = async (days: number = 30): Promise<string[]> => {
 const logs: string[] = [];
 const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);

 try {
 // 1. Purgar Sesiones de Conteo
 const oldSessions = await db.sessions
 .where('status').equals('completed')
 .and(s => s.createdAt < threshold)
 .toArray();

 if (oldSessions.length > 0) {
 const sessionIds = oldSessions.map(s => s.id);
 
 // Eliminar escaneos asociados
 const scansToDelete = await db.scans
 .where('sessionId').anyOf(sessionIds)
 .primaryKeys();
 
 await db.transaction('rw', [db.sessions, db.scans], async () => {
 await db.scans.bulkDelete(scansToDelete);
 await db.sessions.bulkDelete(sessionIds);
 });

 logs.push(`❄️ Archivado Frío: Eliminadas ${oldSessions.length} sesiones de conteo (> ${days} días).`);
 }

 // 2. Purgar Sesiones ERP y Guías Visuales
 const oldErpSessions = await db.erpSessions
 .where('status').equals('completed')
 .and(s => s.createdAt < threshold)
 .toArray();

 if (oldErpSessions.length > 0) {
 const erpIds = oldErpSessions.map(s => s.id);
 const erpOrderIds = oldErpSessions.map(s => s.erpOrderId);

 // Eliminar guías visuales asociadas
 const guidesToDelete = await db.visualGuides
 .where('erpOrderId').anyOf(erpOrderIds)
 .primaryKeys();

 await db.transaction('rw', [db.erpSessions, db.visualGuides], async () => {
 await db.visualGuides.bulkDelete(guidesToDelete);
 await db.erpSessions.bulkDelete(erpIds);
 });

 logs.push(`❄️ Archivado Frío: Eliminadas ${oldErpSessions.length} recepciones ERP (> ${days} días).`);
 }

 // 3. Limpieza de Logs (Mantener solo 7 días de logs operativos)
 const logThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000);
 const oldLogs = await db.logs.where('timestamp').below(logThreshold).primaryKeys();
 if (oldLogs.length > 0) {
 await db.logs.bulkDelete(oldLogs);
 logs.push(`🧹 Limpieza: Purgados ${oldLogs.length} logs antiguos.`);
 }

 if (logs.length > 0) {
 logger.info('Maintenance', 'Archivado automático completado.', { actions: logs });
 }

 return logs;
 } catch (e: any) {
 logger.error('Maintenance', 'Error en purgado automático', e);
 return [`❌ Error Purge: ${e.message}`];
 }
};

/**
 * Ejecuta DEEP VACUUM: Purgado de huérfanos y compactación lógica.
 */
export const repairSystem = async (): Promise<string[]> => {
 const logs: string[] = [];
 
 try {
 // 1. Eliminar Huérfanos
 const sessionIds = new Set(await db.sessions.toCollection().primaryKeys());
 const orphansToDelete: string[] = [];
 await db.scans.each(scan => {
 if (!sessionIds.has(scan.sessionId)) {
 orphansToDelete.push(scan.id);
 }
 });
 
 if (orphansToDelete.length > 0) {
 await db.scans.bulkDelete(orphansToDelete);
 logs.push(`✅ Eliminados ${orphansToDelete.length} escaneos huérfanos.`);
 }

 // 2. Limpieza de Logs Antiguos (Mantener solo últimos 500)
 const totalLogs = await db.logs.count();
 if (totalLogs > 500) {
 const keysToDelete = await db.logs.orderBy('timestamp').limit(totalLogs - 500).primaryKeys();
 await db.logs.bulkDelete(keysToDelete);
 logs.push(`✅ Vacuum: Purgados ${keysToDelete.length} logs antiguos.`);
 }

 // 3. Reset de Sincronizaciones Fallidas (Reintento forzado)
 const stuckJobsCount = await db.dynamic_data.where('syncStatus').equals('error').modify({ syncStatus: 'pending', retryCount: 0 });
 if (stuckJobsCount) {
 logs.push(`✅ Re-encolados ${stuckJobsCount} registros de datos dinámicos.`);
 }

 if (logs.length === 0) {
 logs.push("✨ Sistema optimizado. No se requiere acción.");
 } else {
 logger.success('Maintenance', 'Deep Vacuum completado.', { actions: logs });
 }

 return logs;

 } catch (e: any) {
 logger.error('Maintenance', 'Fallo en reparación profunda', e);
 return [`❌ Error: ${e.message}`];
 }
};

// Forced GitHub sync
