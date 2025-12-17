import { db } from '../db';
import { logger } from './logger';

export interface HealthReport {
    status: 'healthy' | 'warning' | 'critical';
    orphanScans: number;
    stuckSyncJobs: number;
    corruptProducts: number;
    storageUsage: number; // in bytes
    totalRecords: number;
}

/**
 * Analiza la integridad referencial de la base de datos local.
 * Detecta registros sin padre, colas atascadas y datos corruptos.
 */
export const checkSystemHealth = async (): Promise<HealthReport> => {
    // 1. Get all valid Session IDs
    const sessionIds = new Set(await db.sessions.toCollection().primaryKeys());
    
    // 2. Count orphans (Scans pointing to non-existent sessions)
    // We iterate keys for speed instead of loading objects
    let orphanScans = 0;
    await db.scans.each(scan => {
        if (!sessionIds.has(scan.sessionId)) {
            orphanScans++;
        }
    });

    // 3. Check Sync Queue for dead jobs
    const stuckSyncJobs = await db.syncQueue
        .where('retryCount').above(10)
        .count();

    // 4. Check for Corrupt Products (Empty barcode or name)
    const corruptProducts = await db.products
        .filter(p => !p.barcode || !p.name)
        .count();

    // 5. Storage Estimate
    let storageUsage = 0;
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        storageUsage = estimate.usage || 0;
    }

    // 6. Total Volume
    const totalRecords = (await db.scans.count()) + (await db.sessions.count());

    // Determine Status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (orphanScans > 0 || stuckSyncJobs > 0) status = 'warning';
    if (corruptProducts > 0) status = 'critical';

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
 * Ejecuta acciones correctivas sobre la base de datos.
 */
export const repairSystem = async (): Promise<string[]> => {
    const logs: string[] = [];
    
    try {
        // 1. Clean Orphans
        const sessionIds = new Set(await db.sessions.toCollection().primaryKeys());
        const orphansToDelete: string[] = [];
        await db.scans.each(scan => {
            if (!sessionIds.has(scan.sessionId)) {
                orphansToDelete.push(scan.id);
            }
        });
        
        if (orphansToDelete.length > 0) {
            await db.scans.bulkDelete(orphansToDelete);
            const msg = `✅ Eliminados ${orphansToDelete.length} registros huérfanos.`;
            logs.push(msg);
            logger.warn('Maintenance', msg);
        }

        // 2. Clean Stuck Jobs
        const stuckJobs = await db.syncQueue.where('retryCount').above(10).primaryKeys();
        if (stuckJobs.length > 0) {
            await db.syncQueue.bulkDelete(stuckJobs);
            const msg = `✅ Limpiados ${stuckJobs.length} trabajos de sincronización fallidos.`;
            logs.push(msg);
            logger.warn('Maintenance', msg);
        }

        // 3. Clean Corrupt Products
        const corruptKeys = await db.products.filter(p => !p.barcode || !p.name).primaryKeys();
        if (corruptKeys.length > 0) {
            await db.products.bulkDelete(corruptKeys);
            const msg = `✅ Eliminados ${corruptKeys.length} productos corruptos.`;
            logs.push(msg);
            logger.warn('Maintenance', msg);
        }

        if (logs.length === 0) {
            logs.push("✨ El sistema ya estaba optimizado. No se requirieron acciones.");
        } else {
            logger.success('Maintenance', 'Reparación del sistema ejecutada.', { actions: logs });
        }

        return logs;

    } catch (e: any) {
        console.error("Maintenance failed", e);
        const err = `❌ Error crítico durante la reparación: ${e.message}`;
        logs.push(err);
        logger.error('Maintenance', 'Reparación fallida', e);
        return logs;
    }
};