
import { db } from '../db';
import { fetchCloudData, fetchProductsFromCloud, syncToAppSheet } from './appsheet';
// Added CountingSession import to allow explicit typing
import { CountingSession, Product, SyncConflict } from '../types';
import * as productService from './productService';
import { logger } from './logger';
import { CloudProductSchema } from './schemas';
import { useSyncStore } from '../store/useSyncStore';

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
}

export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
    const groups: Record<string, UploadGroup> = {};
    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    
    if (unsyncedScans.length > 0) {
        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
        // FIX: Explicitly typed Map to ensure session object is not inferred as 'unknown'
        const sessionMap = new Map<string, CountingSession>(sessions.map(s => [s.id, s]));

        for (const scan of unsyncedScans) {
            const session = sessionMap.get(scan.sessionId);
            if (!session) continue;
            // Now session is correctly typed as CountingSession
            const erp = session.erpOrder;
            if (!groups[erp]) groups[erp] = { erpOrder: erp, sessionCount: 0, totalUnits: 0, sessionIds: [], logisticsLabels: [], type: 'inventory' };
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
            if (onProgress) onProgress(`Subiendo bulto ${session.logisticsLabel}...`);
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

/**
 * Descarga y actualiza el catálogo maestro local desde la hoja de Google.
 */
export const importProductsFromAppSheet = async (): Promise<number> => {
    try {
        const rawProducts = await fetchProductsFromCloud();
        if (!rawProducts || rawProducts.length === 0) return 0;

        const products: Product[] = rawProducts.map(rp => {
            try {
                // El CloudProductSchema se encarga de mapear tus columnas
                // PROVEEDOR; MUNDO; COD PRODUCTO; DESCRIPCION; RUT PROVEEDOR
                const validated = CloudProductSchema.parse(rp);
                return {
                    ...validated,
                    syncStatus: 'synced' as const
                };
            } catch (e) {
                return null;
            }
        }).filter(p => p !== null) as Product[];

        if (products.length > 0) {
            await productService.saveProductBatch(products);
        }
        return products.length;
    } catch (e: any) {
        logger.error("SYNC_PRODS_FAIL", e.message);
        throw e;
    }
};
