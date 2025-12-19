
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

    const stuckSyncJobs = await db.syncQueue
        .where('retryCount').above(10)
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
        const stuckJobsCount = await db.syncQueue.where('retryCount').above(5).modify({ retryCount: 0 });
        if (stuckJobsCount) {
            logs.push(`✅ Re-encolados ${stuckJobsCount} trabajos de sincronización.`);
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
