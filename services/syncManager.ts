
import { db } from '../db';
import { fetchCloudData, syncToAppSheet, SHEET_COLUMNS, parseFlexibleDate } from './appsheet';
import { CountingSession, ScanRecord } from '../types';
import * as sessionService from './sessionService';

// --- TYPES ---

export interface UploadGroup {
    erpOrder: string;
    sessionCount: number;
    totalUnits: number;
    sessionIds: string[];
    logisticsLabels: string[];
}

export interface CloudItem {
    erpOrder: string;
    label: string;
    date: Date;
    totalQty: number;
    status: 'new' | 'exists_identical' | 'exists_different';
    rawRow: any;
}

// --- HELPER ---
const normalizeKey = (str: any) => String(str || '').trim().toUpperCase();
const generateCompositeKey = (erp: any, label: any) => {
    // Handle default/empty label logic consistently
    const l = (!label || String(label).trim() === "") ? "GENERAL" : String(label).trim();
    return `${normalizeKey(erp)}_${normalizeKey(l)}`;
};

// --- UPLOAD LOGIC ---

/**
 * Agrupa todos los escaneos pendientes por Orden ERP.
 * Esto permite subir múltiples sesiones de una misma orden en un solo request consolidado.
 */
export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
    // 1. Get all unsynced scans
    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    if (unsyncedScans.length === 0) return [];

    // 2. Get involved sessions
    const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
    const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
    
    // Explicitly type and build the map to avoid type inference issues
    const sessionMap = new Map<string, CountingSession>();
    sessions.forEach(s => sessionMap.set(s.id, s));

    // 3. Group by ERP
    const groups: Record<string, UploadGroup> = {};

    for (const scan of unsyncedScans) {
        const session = sessionMap.get(scan.sessionId);
        if (!session) continue; // Should not happen

        const erp = session.erpOrder;
        
        if (!groups[erp]) {
            groups[erp] = {
                erpOrder: erp,
                sessionCount: 0,
                totalUnits: 0,
                sessionIds: [],
                logisticsLabels: []
            };
        }

        groups[erp].totalUnits += scan.quantity;
        if (!groups[erp].sessionIds.includes(session.id)) {
            groups[erp].sessionIds.push(session.id);
            groups[erp].logisticsLabels.push(session.logisticsLabel);
            groups[erp].sessionCount++;
        }
    }

    return Object.values(groups);
};

/**
 * Ejecuta la subida consolidada de una Orden ERP completa.
 * Crea una "Sesión Virtual" que representa la suma de todos los bultos pendientes para esa orden.
 */
export const performBatchUpload = async (group: UploadGroup): Promise<void> => {
    // 1. Create a Virtual Session for the payload
    // We join labels (e.g., "Bulto1, Bulto2") to show traceability in AppSheet
    const virtualSession: CountingSession = {
        id: 'BATCH_UPLOAD_' + Date.now(),
        erpOrder: group.erpOrder,
        logisticsLabel: group.logisticsLabels.join(', '), // Audit trail of all labels
        createdAt: Date.now(),
        status: 'completed'
    };

    // 2. Send to AppSheet (The existing service handles aggregation of scans)
    // Note: sessionService.getUnsyncedScans filters by ERP, so it picks up exactly what we need
    await syncToAppSheet(virtualSession);

    // 3. Mark all involved sessions as synced locally
    await db.sessions.where('id').anyOf(group.sessionIds).modify({ lastSyncTimestamp: Date.now() });
};

// --- DOWNLOAD LOGIC ---

/**
 * Descarga datos de la nube y los compara con lo local para detectar duplicados.
 * No guarda nada en DB todavía, solo analiza.
 */
export const analyzeCloudDifferences = async (startDate: string, endDate: string): Promise<CloudItem[]> => {
    // 1. Fetch from Cloud
    const cloudRows = await fetchCloudData({ dateRange: { start: startDate, end: endDate } });
    if (cloudRows.length === 0) return [];

    // 2. Get Local Sessions for comparison
    // We fetch all to ensure we don't miss anything due to case sensitivity in specific queries
    const localSessions = await db.sessions.toArray();
    const localSignatures = new Set(localSessions.map(s => generateCompositeKey(s.erpOrder, s.logisticsLabel)));

    // 3. Process and Compare
    const results: CloudItem[] = [];
    const processedKeys = new Set<string>(); // To avoid duplicates in the list if cloud has multiple rows per session

    for (const row of cloudRows) {
        const erp = row[SHEET_COLUMNS.ERP_ORDER];
        const label = row[SHEET_COLUMNS.LABEL];
        const key = generateCompositeKey(erp, label);

        // Skip invalid rows or already processed sessions within this batch
        if (!erp || processedKeys.has(key)) continue;
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
