import { db } from '../db';
// Fix: Removed fetchFromGas as it is not exported from ./appsheet
import { syncToAppSheet } from './appsheet';
import { CountingSession, Product } from '../types';
import { logger } from './logger';
import { useSyncStore } from '../store/useSyncStore';
import { saveProductBatch } from './productService';
import { CloudProductSchema } from './schemas';
// Fix: Added fetchFromGas to imports from ./gasService
import { callGas, fetchFromGas } from './gasService';

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
    isHammer: boolean;
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

/**
 * SMART SYNC v10: Descarga incremental de productos.
 * Solo descarga lo modificado desde la última sincronización.
 */
export const importProductsFromAppSheet = async (): Promise<number> => {
    try {
        // Recuperamos el timestamp de la última descarga exitosa de LocalStorage
        const lastSyncTimestamp = localStorage.getItem('last_product_sync_time') || '0';
        
        // Llamamos a GAS con el filtro de fecha (Sincronización Delta)
        const response = await callGas('fetch_rows', { 
            tableName: "PRODUCTOS", 
            since: lastSyncTimestamp 
        });

        if (!response.success) throw new Error(response.error);
        
        const rawProducts = response.rows || [];
        if (rawProducts.length === 0) return 0;

        const products: Product[] = rawProducts
            .map((p: any) => {
                const result = CloudProductSchema.safeParse(p);
                return result.success ? result.data : null;
            })
            .filter((p): p is Product => p !== null)
            .map(p => ({ ...p, syncStatus: 'synced' as const }));

        if (products.length > 0) {
            await saveProductBatch(products);
            // Actualizamos la marca de tiempo con lo que devuelva el servidor
            localStorage.setItem('last_product_sync_time', response.server_timestamp || String(Date.now()));
        }
        
        return products.length;
    } catch (e: any) {
        logger.error("FETCH_PRODUCTS_FAIL", `Error en Smart Sync: ${e.message}`);
        throw e;
    }
};