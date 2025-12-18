import { db } from '../db';
import { fetchCloudData, fetchReceptionData, fetchProductsFromCloud, syncToAppSheet, syncReceptionToAppSheet, SHEET_COLUMNS, parseFlexibleDate } from './appsheet';
import { CountingSession, ScanRecord, Product, ConsolidatedItem } from '../types';
import * as sessionService from './sessionService';
import * as productService from './productService';
import { generateCompositeKey, normalizeKey, sanitizeBarcode, generateUUID } from './utils';
import { logger } from './logger';
import { CloudInventoryRowSchema, CloudProductSchema, CloudReceptionRowSchema } from './schemas';

export { SYNC_ENGINE_VERSION } from './constants';

// --- TYPES ---

export interface UploadGroup {
    erpOrder: string;
    sessionCount: number;
    totalUnits: number;
    sessionIds: string[];
    logisticsLabels: string[];
    type: 'inventory' | 'reception';
}

// ==========================================
// 1. UPLOAD MANAGEMENT (Local -> Cloud)
// ==========================================

export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
    const groups: Record<string, UploadGroup> = {};

    const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
    
    if (unsyncedScans.length > 0) {
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

    const pendingDrafts = await db.sessions
        .where('status').equals('draft')
        .and(s => !s.lastSyncTimestamp)
        .toArray();

    if (pendingDrafts.length > 0) {
        const receptionKey = "BITÁCORA RECEPCIÓN";
        groups[receptionKey] = {
            erpOrder: receptionKey,
            sessionCount: pendingDrafts.length,
            totalUnits: 0, 
            sessionIds: pendingDrafts.map(d => d.id),
            logisticsLabels: pendingDrafts.map(d => d.logisticsLabel),
            type: 'reception'
        };
    }

    return Object.values(groups);
};

export const performBatchUpload = async (group: UploadGroup): Promise<void> => {
    if (group.type === 'reception') {
        const drafts = await db.sessions.where('id').anyOf(group.sessionIds).toArray();
        if (drafts.length === 0) return;
        const result = await syncReceptionToAppSheet(drafts);
        if (result.failed > 0) {
            const errStr = result.errors.slice(0, 3).join('; ');
            throw new Error(`Fallo parcial: ${result.failed} errores. Info: ${errStr}`);
        }
        return;
    }

    const virtualSession: CountingSession = {
        id: 'BATCH_UPLOAD_' + Date.now(),
        erpOrder: group.erpOrder,
        logisticsLabel: group.logisticsLabels.join(', '),
        createdAt: Date.now(),
        status: 'completed'
    };

    await syncToAppSheet(virtualSession);
    await db.sessions.where('id').anyOf(group.sessionIds).modify({ lastSyncTimestamp: Date.now() });
};

// ==========================================
// 2. DOWNLOAD & RESTORE (Cloud -> Local)
// ==========================================

export const importProductsFromAppSheet = async (): Promise<number> => {
    const rawRows = await fetchProductsFromCloud();
    const validProducts: Product[] = [];
    for (const row of rawRows) {
        const result = CloudProductSchema.safeParse(row);
        if (result.success) {
            const p = result.data;
            validProducts.push({
                barcode: sanitizeBarcode(p.barcode),
                name: p.name,
                category: p.category,
                supplier: p.supplier,
                supplierRut: p.supplierRut,
                syncStatus: 'synced'
            });
        }
    }
    if (validProducts.length > 0) await productService.saveProductBatch(validProducts);
    return validProducts.length;
};

/**
 * Recupera logs de recepción desde AppSheet y los mapea a la cola local.
 */
export const restoreReceptionFromCloud = async (options?: { dateRange?: { start: string, end: string } }): Promise<number> => {
    const rawRows = await fetchReceptionData(options);
    let restoredCount = 0;

    for (const row of rawRows) {
        const result = CloudReceptionRowSchema.safeParse(row);
        if (!result.success) continue;

        const data = result.data;
        const cloudId = data.ID_RECEPCION;
        const label = sanitizeBarcode(data.ETIQUETA);
        const cloudStatus = data.ESTADO; // PENDIENTE o PROCESADO
        
        if (!label) continue;

        // 1. Verificar si ya existe por ID exacto
        const localSession = await db.sessions.get(cloudId);
        
        if (localSession) {
            // Si en la nube ya está PROCESADO pero aquí sigue en DRAFT, actualizamos estado
            if (cloudStatus === 'PROCESADO' && localSession.status === 'draft') {
                await db.sessions.update(cloudId, { status: 'completed' });
            }
            continue; 
        }

        // 2. Verificar por etiqueta si no hay ID (Búsqueda por bultos manuales)
        const duplicateLabel = await db.sessions.where('logisticsLabel').equals(label).first();
        if (duplicateLabel) continue;

        // 3. Crear registro local
        const localStatus = cloudStatus === 'PENDIENTE' ? 'draft' : 'completed';
        
        let localAudit: 'verified' | 'warning' | 'failed' | 'pending' = 'pending';
        if (data.ESTADO_AUDITORIA === 'VERIFICADO_OK') localAudit = 'verified';
        else if (data.ESTADO_AUDITORIA === 'CON_DIFERENCIAS') localAudit = 'warning';
        else if (data.ESTADO_AUDITORIA === 'RECHAZADO') localAudit = 'failed';

        await db.sessions.add({
            id: cloudId || generateUUID(),
            erpOrder: 'PENDIENTE', // Por defecto hasta que se inicie el conteo
            logisticsLabel: label,
            createdAt: data.FECHA_HORA ? parseFlexibleDate(data.FECHA_HORA) : Date.now(),
            status: localStatus,
            totalUnits: 0,
            totalSKUs: 0,
            lastSyncTimestamp: Date.now(), // Marcamos como sincronizado para no volver a subirlo
            auditStatus: localAudit
        });
        restoredCount++;
    }
    return restoredCount;
};

export const restoreFromCloud = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string }, skipExisting?: boolean }): Promise<{ sessions: number, items: number }> => {
  const rawRows = await fetchCloudData(options);
  if (rawRows.length === 0) return { sessions: 0, items: 0 };

  const allLocalSessions = await db.sessions.toArray();
  const localSessionMap = new Map<string, CountingSession>();
  allLocalSessions.forEach(s => localSessionMap.set(generateCompositeKey(s.erpOrder, s.logisticsLabel), s));

  const validRows = [];
  for (const r of rawRows) {
      const parsed = CloudInventoryRowSchema.safeParse(r);
      if (parsed.success) validRows.push(parsed.data);
  }

  let rowsToProcess = options?.skipExisting 
    ? validRows.filter(row => !localSessionMap.has(generateCompositeKey(row[SHEET_COLUMNS.ERP_ORDER], row[SHEET_COLUMNS.LABEL])))
    : validRows;

  if (rowsToProcess.length === 0) return { sessions: 0, items: 0 };

  const sessionsMap = new Map<string, typeof validRows>();
  rowsToProcess.forEach(row => {
    const key = generateCompositeKey(row[SHEET_COLUMNS.ERP_ORDER], row[SHEET_COLUMNS.LABEL]);
    if (normalizeKey(row[SHEET_COLUMNS.ERP_ORDER]).length > 0) {
        if (!sessionsMap.has(key)) sessionsMap.set(key, []);
        sessionsMap.get(key)?.push(row);
    }
  });

  let sessionsProcessed = 0;
  let itemsRestored = 0;

  for (const [key, sessionRows] of sessionsMap.entries()) {
    const firstRow = sessionRows[0];
    const erp = firstRow[SHEET_COLUMNS.ERP_ORDER].trim();
    const label = (firstRow[SHEET_COLUMNS.LABEL] || "GENERAL").trim();
    let sessionId: string;
    let isNewSession = false;
    let existingSession = localSessionMap.get(key);

    if (existingSession) {
        sessionId = existingSession.id;
        await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
    } else {
        sessionId = generateUUID();
        isNewSession = true;
        sessionsProcessed++;
    }

    // Agregación de nube
    const cloudAggregated = new Map<string, any>();
    for (const row of sessionRows) {
        const barcode = sanitizeBarcode(row[SHEET_COLUMNS.BARCODE]);
        if (!barcode) continue;
        const dateKey = `${barcode}_${Number(row[SHEET_COLUMNS.MONTH]) || 0}_${Number(row[SHEET_COLUMNS.YEAR]) || 0}`;
        if (cloudAggregated.has(dateKey)) {
            cloudAggregated.get(dateKey).qty += row[SHEET_COLUMNS.QUANTITY];
        } else {
            cloudAggregated.set(dateKey, { qty: row[SHEET_COLUMNS.QUANTITY], name: row[SHEET_COLUMNS.PRODUCT_NAME], mm: row[SHEET_COLUMNS.MONTH], yyyy: row[SHEET_COLUMNS.YEAR] });
        }
    }

    const scansToAdd: ScanRecord[] = [];
    for (const [dateKey, data] of cloudAggregated.entries()) {
        const [barcode] = dateKey.split('_');
        scansToAdd.push({
            id: generateUUID(),
            sessionId,
            barcode,
            quantity: data.qty,
            timestamp: Date.now(),
            mm: data.mm,
            yyyy: data.yyyy,
            synced: 1
        });
        itemsRestored += data.qty;
    }

    if (isNewSession) {
        await db.sessions.add({
            id: sessionId,
            erpOrder: erp,
            logisticsLabel: label,
            createdAt: parseFlexibleDate(firstRow[SHEET_COLUMNS.DATE]),
            status: 'completed',
            totalUnits: sessionRows.reduce((a, b) => a + b[SHEET_COLUMNS.QUANTITY], 0),
            totalSKUs: cloudAggregated.size,
            lastSyncTimestamp: Date.now()
        });
    }
    if (scansToAdd.length > 0) await db.scans.bulkAdd(scansToAdd);
  }
  return { sessions: sessionsProcessed, items: itemsRestored };
};

export const executeDownload = async (
    type: 'inventory' | 'reception' | 'products',
    dateRange?: { start: string, end: string },
    log?: (msg: string) => void
) => {
    const loggerFunc = log || console.log;
    try {
        if (type === 'inventory') {
            loggerFunc(`[Inventario] Descargando bloque...`);
            const res = await restoreFromCloud({ dateRange, skipExisting: true });
            return { success: true, message: `Importados ${res.sessions} bultos.` };
        } 
        else if (type === 'reception') {
            loggerFunc(`[Recepción] Solicitando bitácora de nube...`);
            const count = await restoreReceptionFromCloud({ dateRange });
            return { success: true, message: `${count} bultos agregados a la cola.` };
        } 
        else if (type === 'products') {
            const count = await importProductsFromAppSheet();
            return { success: true, message: `${count} productos actualizados.` };
        }
        return { success: false, message: "Tipo desconocido." };
    } catch (error: any) {
        loggerFunc(`[ERROR] ${error.message}`);
        throw error;
    }
};

export const processSyncQueue = async () => {
    const jobs = await db.syncQueue.where('status').equals('pending').toArray();
    for (const job of jobs) { 
        try { 
            await syncToAppSheet(job.session); 
            if (job.id) await db.syncQueue.delete(job.id); 
        } catch (e: any) { 
            if (job.id) await db.syncQueue.update(job.id, { retryCount: job.retryCount + 1, status: job.retryCount >= 5 ? 'failed' : 'pending' }); 
        } 
    }
};