
import { db } from '../db';
import { fetchCloudData, syncToAppSheet, syncReceptionToAppSheet, SHEET_COLUMNS, parseFlexibleDate } from './appsheet';
import { CountingSession, ScanRecord } from '../types';
import * as sessionService from './sessionService';
import { generateCompositeKey, normalizeKey } from './utils';
import { restoreFromCloud, restoreReceptionFromCloud, importProductsFromAppSheet } from './syncBridge';

export { SYNC_ENGINE_VERSION } from './constants';

// --- TYPES ---

export interface UploadGroup {
    erpOrder: string;
    sessionCount: number;
    totalUnits: number;
    sessionIds: string[];
    logisticsLabels: string[];
    type: 'inventory' | 'reception'; // Added type discriminator
}

export interface CloudItem {
    erpOrder: string;
    label: string;
    date: Date;
    totalQty: number;
    status: 'new' | 'exists_identical' | 'exists_different';
    rawRow: any;
}

// --- UPLOAD LOGIC ---

/**
 * Agrupa todos los escaneos pendientes por Orden ERP.
 * Y AHORA TAMBIÉN: Agrupa los bultos recepcionados (Check-in) pendientes.
 */
export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
    const groups: Record<string, UploadGroup> = {};

    // 1. INVENTORY: Get all unsynced scans (Normal Counting)
    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    
    if (unsyncedScans.length > 0) {
        // Get involved sessions
        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
        
        const sessionMap = new Map<string, CountingSession>();
        sessions.forEach(s => sessionMap.set(s.id, s));

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
                    type: 'inventory'
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

    // 2. RECEPTION: Get pending drafts (Check-in Logs)
    // We look for status 'draft' that hasn't been synced (lastSyncTimestamp is 0 or undefined)
    const pendingDrafts = await db.sessions
        .where('status').equals('draft')
        .and(s => !s.lastSyncTimestamp)
        .toArray();

    if (pendingDrafts.length > 0) {
        const receptionKey = "BITÁCORA RECEPCIÓN";
        
        groups[receptionKey] = {
            erpOrder: receptionKey,
            sessionCount: pendingDrafts.length,
            totalUnits: 0, // Not relevant for reception usually, or implies 1 unit per label
            sessionIds: pendingDrafts.map(d => d.id),
            logisticsLabels: pendingDrafts.map(d => d.logisticsLabel),
            type: 'reception'
        };
    }

    return Object.values(groups);
};

/**
 * Ejecuta la subida consolidada.
 * Detecta si es Inventario (Conteos) o Recepción (Logs) y usa el servicio adecuado.
 */
export const performBatchUpload = async (group: UploadGroup): Promise<void> => {
    
    // CASE A: RECEPTION LOGS
    if (group.type === 'reception') {
        const drafts = await db.sessions.where('id').anyOf(group.sessionIds).toArray();
        if (drafts.length === 0) return;

        // Use the specific service for Reception.
        // It handles marking synced internally row-by-row to ensure partial success.
        await syncReceptionToAppSheet(drafts);
        
        return;
    }

    // CASE B: INVENTORY COUNTS
    // 1. Create a Virtual Session for the payload
    const virtualSession: CountingSession = {
        id: 'BATCH_UPLOAD_' + Date.now(),
        erpOrder: group.erpOrder,
        logisticsLabel: group.logisticsLabels.join(', '), // Audit trail
        createdAt: Date.now(),
        status: 'completed'
    };

    // 2. Send to AppSheet
    await syncToAppSheet(virtualSession);

    // 3. Mark all involved sessions as synced locally
    await db.sessions.where('id').anyOf(group.sessionIds).modify({ lastSyncTimestamp: Date.now() });
};

// --- CENTRALIZED DOWNLOAD LOGIC ---

/**
 * Central Hub for downloading different types of data.
 * Includes logging callback for UI feedback.
 */
export const executeDownload = async (
    type: 'inventory' | 'reception' | 'products',
    dateRange?: { start: string, end: string },
    log?: (msg: string) => void
) => {
    const logger = log || console.log;

    try {
        if (type === 'inventory') {
            logger(`[Inventario] Solicitando datos (${dateRange?.start} - ${dateRange?.end})...`);
            const res = await restoreFromCloud({ 
                dateRange: dateRange, 
                skipExisting: true 
            });
            logger(`[Inventario] Procesamiento finalizado.`);
            return { success: true, message: `Se importaron ${res.sessions} bultos y ${res.items} items.` };
        } 
        
        else if (type === 'reception') {
            logger(`[Bitácora] Solicitando logs (${dateRange?.start} - ${dateRange?.end})...`);
            const count = await restoreReceptionFromCloud({ dateRange });
            logger(`[Bitácora] Finalizado.`);
            return { success: true, message: `${count} registros de recepción importados.` };
        } 
        
        else if (type === 'products') {
            logger(`[Maestro] Solicitando catálogo completo...`);
            const count = await importProductsFromAppSheet();
            logger(`[Maestro] Guardando en base de datos local...`);
            return { success: true, message: `${count} productos actualizados/creados.` };
        }

        return { success: false, message: "Tipo de descarga desconocido." };

    } catch (error: any) {
        logger(`[ERROR] ${error.message}`);
        throw error;
    }
};

/**
 * Descarga datos de la nube y los compara con lo local.
 */
export const analyzeCloudDifferences = async (startDate: string, endDate: string): Promise<CloudItem[]> => {
    const cloudRows = await fetchCloudData({ dateRange: { start: startDate, end: endDate } });
    if (cloudRows.length === 0) return [];

    const localSessions = await db.sessions.toArray();
    const localSignatures = new Set(localSessions.map(s => generateCompositeKey(s.erpOrder, s.logisticsLabel)));

    const results: CloudItem[] = [];
    const processedKeys = new Set<string>();

    for (const row of cloudRows) {
        const erp = row[SHEET_COLUMNS.ERP_ORDER];
        const label = row[SHEET_COLUMNS.LABEL];
        const key = generateCompositeKey(erp, label);

        if (normalizeKey(erp).length === 0 || processedKeys.has(key)) continue;
        processedKeys.add(key);

        const existsLocal = localSignatures.has(key);
        
        results.push({
            erpOrder: String(erp).trim(),
            label: String(label || 'GENERAL').trim(),
            date: new Date(parseFlexibleDate(row[SHEET_COLUMNS.DATE])),
            totalQty: 0, 
            status: existsLocal ? 'exists_identical' : 'new',
            rawRow: row
        });
    }

    return results;
};
