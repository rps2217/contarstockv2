
import { ConsolidatedItem, CountingSession, Product, ScanRecord } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID, sanitizeBarcode } from "./utils";
import { getUnsyncedScans, markScansAsSynced, addScan, updateSessionStats } from "./sessionService"; 
import { markProductsAsSynced, saveProductBatch } from "./productService";
import { markDraftsAsSynced } from "./storage";
import { db } from "../db";
import { aggregateScans } from "./aggregator";
import { sendToAppSheet, AppSheetPayload } from "../infrastructure/api/appsheetClient";

export const SYNC_ENGINE_VERSION = "6.0.0-BLIND-RECEPTION";

// --- CONFIG & MAPPING ---

export const SHEET_COLUMNS = {
    ID: "ID_REGISTRO",
    UNIQUE_KEY: "CLAVE_UNICA",
    DATE: "FECHA",
    ERP_ORDER: "ERP",
    BARCODE: "CODIGO",
    PRODUCT_NAME: "PRODUCTO",
    QUANTITY: "CANTIDAD",
    LABEL: "ETIQUETAS",
    MONTH: "MM",
    YEAR: "YYYY",
    INCIDENT: "FRC" 
};

// --- HELPERS ---

const parseFlexibleDate = (dateVal: any): number => {
    if (!dateVal) return Date.now();
    if (typeof dateVal === 'number') return dateVal; 
    const s = String(dateVal).trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) { const ts = new Date(s).getTime(); if (!isNaN(ts)) return ts; }
    const parts = s.split(/[\/\-]/);
    if (parts.length === 3) {
        const d = parseInt(parts[0], 10); const m = parseInt(parts[1], 10) - 1; const y = parseInt(parts[2], 10);
        if (d > 0 && d <= 31 && m >= 0 && m <= 11) { const ts = new Date(y, m, d).getTime(); if (!isNaN(ts)) return ts; }
    }
    const ts = new Date(s).getTime(); return isNaN(ts) ? Date.now() : ts;
};

const aggregateScansForSync = async (session: CountingSession, scans: ScanRecord[]): Promise<any[]> => {
    const grouped: Record<string, any> = {};
    const productNames: Record<string, string> = {};

    const uniqueBarcodes = Array.from(new Set(scans.map(s => s.barcode)));
    const products = await db.products.where('barcode').anyOf(uniqueBarcodes).toArray();
    products.forEach(p => productNames[p.barcode] = p.name);

    const sessionLabelMap = new Map<string, string>();
    const sessionIds = Array.from(new Set(scans.map(s => s.sessionId)));
    const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
    sessions.forEach(s => sessionLabelMap.set(s.id, s.logisticsLabel));

    scans.forEach(scan => {
        const mm = scan.mm || 0; const yyyy = scan.yyyy || 0; let dateKeySuffix = "SIN_FECHA";
        if (mm && yyyy) { const lastDay = new Date(yyyy, mm, 0); const dStr = String(lastDay.getDate()).padStart(2, '0'); const mStr = String(mm).padStart(2, '0'); dateKeySuffix = `${yyyy}${mStr}${dStr}`; }
        const label = sessionLabelMap.get(scan.sessionId) || session.logisticsLabel;
        const uniqueKey = `${session.erpOrder}_${label}_${scan.barcode}_${dateKeySuffix}`;
        const incidentStatus = scan.isIncident ? "FRC" : "";

        if (grouped[uniqueKey]) {
            grouped[uniqueKey][SHEET_COLUMNS.QUANTITY] += scan.quantity;
            if (scan.isIncident) grouped[uniqueKey][SHEET_COLUMNS.INCIDENT] = "FRC"; 
        } else {
            grouped[uniqueKey] = {
                [SHEET_COLUMNS.ID]: generateUUID(), [SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey, [SHEET_COLUMNS.DATE]: new Date(session.createdAt).toISOString().split('T')[0],
                [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder, [SHEET_COLUMNS.BARCODE]: scan.barcode, [SHEET_COLUMNS.PRODUCT_NAME]: productNames[scan.barcode] || "Desconocido",
                [SHEET_COLUMNS.QUANTITY]: scan.quantity, [SHEET_COLUMNS.LABEL]: label, [SHEET_COLUMNS.MONTH]: scan.mm || "", [SHEET_COLUMNS.YEAR]: scan.yyyy || "", [SHEET_COLUMNS.INCIDENT]: incidentStatus
            };
        }
    });
    return Object.values(grouped);
};

// --- MAIN ACTIONS (UPLOAD) ---

export const syncToAppSheet = async (session: CountingSession, _ignoredItems?: ConsolidatedItem[]): Promise<void> => {
  const settings = getSettings(); const config = settings.appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.countsTableName) throw new Error("Error Config: Falta AppID o Tabla Consolidados.");
  const unsyncedScans = await getUnsyncedScans(session.erpOrder);
  if (unsyncedScans.length === 0) { console.log("[Sync] Nada nuevo."); return; }
  try {
    const aggregatedRows = await aggregateScansForSync(session, unsyncedScans);
    const selector = `[${SHEET_COLUMNS.ERP_ORDER}] = '${session.erpOrder}'`;
    const existingData = await sendToAppSheet(config, config.countsTableName, { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC", Selector: selector }, Rows: [] });
    const existingMap = new Map<string, {id: string, qty: number}>();
    if (Array.isArray(existingData)) { existingData.forEach((r: any) => { if (r[SHEET_COLUMNS.UNIQUE_KEY]) existingMap.set(r[SHEET_COLUMNS.UNIQUE_KEY], { id: r[SHEET_COLUMNS.ID], qty: Number(r[SHEET_COLUMNS.QUANTITY]) || 0 }); }); }
    const batchAdd: any[] = []; const batchEdit: any[] = [];
    aggregatedRows.forEach(row => {
        const key = row[SHEET_COLUMNS.UNIQUE_KEY]; const existing = existingMap.get(key);
        if (existing) { row[SHEET_COLUMNS.ID] = existing.id; row[SHEET_COLUMNS.QUANTITY] += existing.qty; batchEdit.push(row); } else { batchAdd.push(row); }
    });
    if (batchAdd.length > 0) await sendToAppSheet(config, config.countsTableName, { Action: "Add", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: batchAdd });
    if (batchEdit.length > 0) await sendToAppSheet(config, config.countsTableName, { Action: "Edit", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: batchEdit });
    await markScansAsSynced(unsyncedScans.map(s => s.id));
    console.log(`[Sync] Exitosa.`);
  } catch (error: any) { console.error("[Sync] Error:", error); throw error; }
};

export const syncProductsToAppSheet = async (products: Product[]): Promise<void> => {
    const settings = getSettings(); const config = settings.appSheetConfig;
    if (!config?.appId || !config?.accessKey || !config?.productsTableName) throw new Error("Config incompleta.");
    const adds: any[] = []; const edits: any[] = []; const addIds: string[] = []; const editIds: string[] = [];
    products.forEach(p => {
        if (!p.barcode) return;
        const row = { "COD PRODUCTO": p.barcode, "COD_PRODUCTO": p.barcode, "CODIGO": p.barcode, "SKU": p.barcode, "ID": p.barcode, "DESCRIPCION": p.name, "PROVEEDOR": p.supplier || "RUT PENDIENTES", "RUT PROVEEDOR": p.supplierRut || "123456789", "MUNDO": p.category || "GENERAL" };
        if (p.syncStatus === 'edit') { edits.push(row); editIds.push(p.barcode); } else { adds.push(row); addIds.push(p.barcode); }
    });
    if (adds.length > 0) { await sendToAppSheet(config, config.productsTableName, { Action: "Add", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: adds }); await markProductsAsSynced(addIds); }
    if (edits.length > 0) { await sendToAppSheet(config, config.productsTableName, { Action: "Edit", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: edits }); await markProductsAsSynced(editIds); }
};

export const syncReceptionToAppSheet = async (sessions: CountingSession[]): Promise<void> => {
    const settings = getSettings(); const config = settings.appSheetConfig;
    if (!config?.appId || !config?.accessKey || !config?.receptionTableName) throw new Error("Config incompleta: Falta nombre de tabla de Recepción.");
    
    // Only upload drafts (status 'draft') or sessions that were drafts recently
    // We map fields: ID_RECEPCION, FECHA_HORA, ETIQUETA, ESTADO
    
    const rows = sessions.map(s => ({
        "ID_RECEPCION": s.id,
        "FECHA_HORA": new Date(s.createdAt).toISOString(),
        "ETIQUETA": s.logisticsLabel,
        "ESTADO": s.status === 'draft' ? 'PENDIENTE' : 'PROCESADO'
    }));

    if (rows.length > 0) {
        await sendToAppSheet(config, config.receptionTableName, { 
            Action: "Add", 
            Properties: { Locale: "es-CL", Timezone: "UTC" }, 
            Rows: rows 
        });
        await markDraftsAsSynced(sessions.map(s => s.id));
    }
};

export const fetchReceptionData = async (): Promise<any[]> => {
    const settings = getSettings();
    const config = settings.appSheetConfig;
    if (!config?.receptionTableName) throw new Error("Falta configurar la Tabla de Recepción en Ajustes.");
    
    const result = await sendToAppSheet(config, config.receptionTableName, {
        Action: "Find",
        Properties: { Locale: "es-CL", Timezone: "UTC" },
        Rows: []
    });
    return Array.isArray(result) ? result : [];
};

export const fetchProductsFromCloud = async (): Promise<any[]> => {
    const settings = getSettings(); const config = settings.appSheetConfig;
    if (!config?.productsTableName) throw new Error("Falta tabla de productos.");
    const result = await sendToAppSheet(config, config.productsTableName, { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: [] });
    return Array.isArray(result) ? result : [];
};

export const fetchCloudData = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string } }): Promise<any[]> => {
  const settings = getSettings(); const config = settings.appSheetConfig;
  if (!config?.countsTableName) throw new Error("Falta tabla de consolidados.");
  let selector = "";
  if (options?.erpFilter) { selector = `[${SHEET_COLUMNS.ERP_ORDER}] = '${options.erpFilter}'`; } 
  else if (options?.dateRange) {
      const formatDateForLocale = (isoDate: string) => { const [y, m, d] = isoDate.split('-'); return `${d}/${m}/${y}`; };
      const startLatam = formatDateForLocale(options.dateRange.start); const endLatam = formatDateForLocale(options.dateRange.end);
      selector = `AND([${SHEET_COLUMNS.DATE}] >= "${startLatam}", [${SHEET_COLUMNS.DATE}] <= "${endLatam}")`;
  }
  const payload: AppSheetPayload = { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC", Selector: selector || undefined }, Rows: [] };
  const result = await sendToAppSheet(config, config.countsTableName, payload);
  return Array.isArray(result) ? result : [];
};

export const queueSync = async (session: CountingSession, items: ConsolidatedItem[]) => { await db.syncQueue.add({ session, items, createdAt: Date.now(), status: 'pending', retryCount: 0 }); };
export const processSyncQueue = async () => {
    const jobs = await db.syncQueue.where('status').equals('pending').toArray();
    for (const job of jobs) { try { await syncToAppSheet(job.session); if (job.id) await db.syncQueue.delete(job.id); } catch (e: any) { if (job.id) await db.syncQueue.update(job.id, { retryCount: job.retryCount + 1 }); } }
};
