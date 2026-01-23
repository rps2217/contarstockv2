
import { db } from '../db';
import { syncToAppSheet, fetchProductsFromCloud } from './appsheet';
import { CountingSession, Product, SyncConflict } from '../types';
import { logger } from './logger';
import { useSyncStore } from '../store/useSyncStore';
import { saveProductBatch } from './productService';
import { CloudProductSchema } from './schemas';

let isSyncingInProgress = false;

export const resetSyncLock = () => {
    isSyncingInProgress = false;
    useSyncStore.getState().setSyncing(false);
};

export interface UploadGroup {
    erpOrder: string;
    sessionCount: number;
    totalUnits: number;
    sessionIds: string[];
    logisticsLabels: string[];
    type: 'inventory' | 'reception' | 'products';
    isHammer: boolean; // NUEVO: Flag para visualización
}

export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
    const groups: Record<string, UploadGroup> = {};
    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    
    if (unsyncedScans.length > 0) {
        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
        const sessionMap = new Map<string, CountingSession>(sessions.map(s => [s.id, s]));

        for (const scan of unsyncedScans) {
            const session = sessionMap.get(scan.sessionId);
            if (!session) continue;
            const erp = session.erpOrder;
            if (!groups[erp]) {
                groups[erp] = { 
                    erpOrder: erp, 
                    sessionCount: 0, 
                    totalUnits: 0, 
                    sessionIds: [], 
                    logisticsLabels: [], 
                    type: 'inventory',
                    isHammer: session.sessionType === 'hammer'
                };
            }
            groups[erp].totalUnits += scan.quantity;
            if (!groups[erp].sessionIds.includes(session.id)) {
                groups[erp].sessionIds.push(session.id);
                groups[erp].logisticsLabels.push(session.logisticsLabel);
                groups[erp].sessionCount++;
            }
        }
    }
    return Object.values(groups);
};

export const performBatchUpload = async (group: UploadGroup, onProgress?: (msg: string) => void): Promise<void> => {
    if (isSyncingInProgress) return;
    isSyncingInProgress = true;
    useSyncStore.getState().setSyncing(true);

    try {
        for (const sessionId of group.sessionIds) {
            const session = await db.sessions.get(sessionId);
            if (!session) continue;
            await syncToAppSheet(session, onProgress);
            await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
        }
        useSyncStore.getState().setLastSyncTime(Date.now());
    } catch (e: any) {
        logger.error("SYNC_FAIL", e.message);
        throw e;
    } finally {
        isSyncingInProgress = false;
        useSyncStore.getState().setSyncing(false);
    }
};

// FIX: Added missing exported function required by useProductDatabase hook to resolve 'no exported member' error.
/**
 * Descarga el maestro de productos desde la nube y actualiza la base local.
 * Implementación coordinada para resolver el error de importación en el catálogo.
 */
export const importProductsFromAppSheet = async (): Promise<number> => {
    try {
        // Obtenemos los datos crudos desde el servicio de integración
        const rawProducts = await fetchProductsFromCloud();
        
        // Mapeo y validación de productos mediante esquema robusto definido en schemas.ts
        const products: Product[] = rawProducts
            .map(p => {
                const result = CloudProductSchema.safeParse(p);
                return result.success ? result.data : null;
            })
            .filter((p): p is Product => p !== null)
            .map(p => ({ 
                ...p, 
                syncStatus: 'synced' as const 
            }));

        if (products.length > 0) {
            // Persistencia masiva en IndexedDB
            await saveProductBatch(products);
        }
        
        return products.length;
    } catch (e: any) {
        logger.error("FETCH_PRODUCTS_FAIL", `Error al descargar catálogo: ${e.message}`);
        throw e;
    }
};
