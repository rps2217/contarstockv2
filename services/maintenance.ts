
import { db } from '../db';

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
            logs.push(`✅ Eliminados ${orphansToDelete.length} registros huérfanos.`);
        }

        // 2. Clean Stuck Jobs
        const stuckJobs = await db.syncQueue.where('retryCount').above(10).primaryKeys();
        if (stuckJobs.length > 0) {
            await db.syncQueue.bulkDelete(stuckJobs);
            logs.push(`✅ Limpiados ${stuckJobs.length} trabajos de sincronización fallidos.`);
        }

        // 3. Clean Corrupt Products
        const corruptKeys = await db.products.filter(p => !p.barcode || !p.name).primaryKeys();
        if (corruptKeys.length > 0) {
            await db.products.bulkDelete(corruptKeys);
            logs.push(`✅ Eliminados ${corruptKeys.length} productos corruptos.`);
        }

        if (logs.length === 0) {
            logs.push("✨ El sistema ya estaba optimizado. No se requirieron acciones.");
        }

        return logs;

    } catch (e: any) {
        console.error("Maintenance failed", e);
        logs.push(`❌ Error crítico durante la reparación: ${e.message}`);
        return logs;
    }
};
