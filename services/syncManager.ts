
import { db } from '../db';
import { CountingSession, Product } from '../types';
import { logger } from './logger';
import { useSyncStore } from '../store/useSyncStore';
import { saveProductBatch } from './productService';
import { CloudProductSchema } from './schemas';
import { getSettings } from './settings';
import { markScansAsSynced } from './sessionService';
import { aggregateScans } from './aggregator';

// Nuevas capas importadas
import { cloudApi } from './cloud/apiClient';
import { createInventoryPayload } from './cloud/mappers';

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
    type: 'inventory' | 'reception' | 'products' | 'orphans';
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
            
            // CASO: REGISTRO HUÉRFANO
            if (!session) {
                if (!groups['SISTEMA_RESIDUAL']) {
                    groups['SISTEMA_RESIDUAL'] = {
                        erpOrder: 'REGISTROS_HUERFANOS',
                        sessionCount: 1,
                        totalUnits: 0,
                        sessionIds: ['ORPHAN'],
                        logisticsLabels: ['Recuperado de Memoria'],
                        type: 'orphans',
                        isHammer: true
                    };
                }
                groups['SISTEMA_RESIDUAL'].totalUnits += scan.quantity;
                continue;
            }

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
        const config = getSettings().appSheetConfig;
        
        // Manejo especial para huérfanos
        if (group.erpOrder === 'REGISTROS_HUERFANOS') {
            if (onProgress) onProgress("Purgando registros residuales...");
            const unsynced = await db.scans.where('synced').equals(0).toArray();
            const orphanIds = unsynced.filter(s => !s.sessionId || s.sessionId === 'ORPHAN').map(s => s.id);
            await markScansAsSynced(orphanIds);
        } else {
            // PROCESAMIENTO ESTÁNDAR
            for (const sessionId of group.sessionIds) {
                const session = await db.sessions.get(sessionId);
                if (!session) continue;

                if (onProgress) onProgress(`Procesando bulto ${session.logisticsLabel}...`);

                // 1. Obtener datos crudos
                const unsyncedScans = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
                if (unsyncedScans.length === 0) continue;

                // 2. Agregar (Lógica de Negocio)
                const consolidatedItems = await aggregateScans(unsyncedScans);
                
                // 3. Mapear a DTO Cloud (Usando Mapper Compartido)
                const payload = createInventoryPayload(session, consolidatedItems, 'manual');

                // 4. Determinar Tabla Destino
                const targetTable = session.sessionType === 'hammer' 
                    ? (config?.countsTableName || "CONTEOS") 
                    : (config?.consolidatedTableName || "CONSOLIDADO");

                // 5. Enviar (Usando Capa de Transporte)
                const result = await cloudApi.appendRows(targetTable, payload);

                // 6. Actualizar Estado Local
                if (result.success) {
                    await markScansAsSynced(unsyncedScans.map(s => s.id));
                    await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
                    if (onProgress) onProgress(`✓ Subidos ${result.rows_written} registros.`);
                }
            }
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

export const importProductsFromAppSheet = async (): Promise<number> => {
    try {
        const config = getSettings().appSheetConfig;
        const lastSyncTimestamp = localStorage.getItem('last_product_sync_time') || '0';
        
        const response = await cloudApi.fetchTable(config?.productsTableName || "PRODUCTOS", lastSyncTimestamp);
        
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
            localStorage.setItem('last_product_sync_time', response.server_timestamp || String(Date.now()));
        }
        
        return products.length;
    } catch (e: any) {
        logger.error("FETCH_PRODUCTS_FAIL", `Error en Smart Sync: ${e.message}`);
        throw e;
    }
};
