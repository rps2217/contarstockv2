import { ConsolidatedItem, CountingSession, Product, ScanRecord } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { getUnsyncedScans, markScansAsSynced, markDraftsAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { sendToAppSheet, AppSheetPayload } from "../infrastructure/api/appsheetClient";
import { SHEET_COLUMNS, SYNC_ENGINE_VERSION } from "./constants";

export { SYNC_ENGINE_VERSION, SHEET_COLUMNS };

// --- HELPERS ---

// Robust date formatter for AppSheet (DD/MM/YYYY HH:mm:ss) 
// Fixed: Changed from ISO YYYY-MM-DD to DD/MM/YYYY to ensure compatibility with Google Sheets 'es-CL' Locale.
const formatDateTimeForAppSheet = (timestamp: number): string => {
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    // Using UTC methods because we send Timezone: "UTC" in the payload properties
    // DD/MM/YYYY HH:mm:ss
    return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

export const parseFlexibleDate = (dateVal: any): number => {
    if (!dateVal) return Date.now();
    if (typeof dateVal === 'number') {
        // Excel serial date check (years > 1982)
        if (dateVal > 30000 && dateVal < 60000) {
            return new Date((dateVal - (25567 + 2)) * 86400 * 1000).getTime();
        }
        return dateVal; 
    }
    
    const s = String(dateVal).trim();
    
    // ISO Format YYYY-MM-DD
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) { 
        const ts = new Date(s.replace(/-/g, '/')).getTime(); 
        if (!isNaN(ts)) return ts; 
    }
    
    // Latam Format DD/MM/YYYY or DD-MM-YYYY
    const parts = s.split(/[\/\-]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) {
             // YYYY/MM/DD
             const y = parseInt(parts[0], 10); const m = parseInt(parts[1], 10) - 1; const d = parseInt(parts[2], 10);
             const ts = new Date(y, m, d).getTime(); if (!isNaN(ts)) return ts;
        } else {
             // DD/MM/YYYY
             const d = parseInt(parts[0], 10); const m = parseInt(parts[1], 10) - 1; const y = parseInt(parts[2], 10);
             const ts = new Date(y, m, d).getTime(); if (!isNaN(ts)) return ts;
        }
    }
    
    const ts = new Date(s).getTime(); 
    return isNaN(ts) ? Date.now() : ts;
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
        const mm = scan.mm || 0; 
        const yyyy = scan.yyyy || 0; 
        let dateKeySuffix = "SIN_FECHA";
        
        if (mm && yyyy) { 
            const lastDay = new Date(yyyy, mm, 0); 
            const dStr = String(lastDay.getDate()).padStart(2, '0'); 
            const mStr = String(mm).padStart(2, '0'); 
            dateKeySuffix = `${yyyy}${mStr}${dStr}`; 
        }
        
        const label = sessionLabelMap.get(scan.sessionId) || session.logisticsLabel;
        const uniqueKey = `${session.erpOrder}_${label}_${scan.barcode}_${dateKeySuffix}`;
        const incidentStatus = scan.isIncident ? "FRC" : "";
        const safeQty = Number(scan.quantity) || 0;

        if (grouped[uniqueKey]) {
            grouped[uniqueKey][SHEET_COLUMNS.QUANTITY] += safeQty;
            if (scan.isIncident) grouped[uniqueKey][SHEET_COLUMNS.INCIDENT] = "FRC"; 
        } else {
            grouped[uniqueKey] = {
                [SHEET_COLUMNS.ID]: generateUUID(), 
                [SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey, 
                [SHEET_COLUMNS.DATE]: new Date(session.createdAt).toISOString().split('T')[0], // For counts table, ISO is usually fine as column is often Text
                [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder, 
                [SHEET_COLUMNS.BARCODE]: scan.barcode, 
                [SHEET_COLUMNS.PRODUCT_NAME]: productNames[scan.barcode] || "Desconocido",
                [SHEET_COLUMNS.QUANTITY]: safeQty, 
                [SHEET_COLUMNS.LABEL]: label, 
                [SHEET_COLUMNS.MONTH]: scan.mm || "", 
                [SHEET_COLUMNS.YEAR]: scan.yyyy || "", 
                [SHEET_COLUMNS.INCIDENT]: incidentStatus
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
    const safeErp = session.erpOrder.replace(/'/g, "");
    const selector = `[${SHEET_COLUMNS.ERP_ORDER}] = '${safeErp}'`;
    
    const existingData = await sendToAppSheet(config, config.countsTableName, { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC", Selector: selector }, Rows: [] });
    const existingMap = new Map<string, {id: string, qty: number}>();
    if (Array.isArray(existingData)) { existingData.forEach((r: any) => { if (r[SHEET_COLUMNS.UNIQUE_KEY]) existingMap.set(r[SHEET_COLUMNS.UNIQUE_KEY], { id: r[SHEET_COLUMNS.ID], qty: Number(r[SHEET_COLUMNS.QUANTITY]) || 0 }); }); }
    
    const batchAdd: any[] = []; const batchEdit: any[] = [];
    
    aggregatedRows.forEach(row => {
        const key = row[SHEET_COLUMNS.UNIQUE_KEY]; const existing = existingMap.get(key);
        if (existing) { 
            row[SHEET_COLUMNS.ID] = existing.id; 
            row[SHEET_COLUMNS.QUANTITY] += existing.qty; 
            batchEdit.push(row); 
        } else { 
            batchAdd.push(row); 
        }
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
    if (!config?.appId || !config?.accessKey) throw new Error("Configuración incompleta: Faltan credenciales.");
    if (!config?.receptionTableName) throw new Error("Falta configurar la 'Tabla de Recepción' en Ajustes > AppSheet.");
    
    const rows = sessions.map(s => {
        // Translate local audit status to business terms for Excel/Sheet
        let auditState = "PENDIENTE";
        if (s.auditStatus === 'verified') auditState = "VERIFICADO_OK";
        else if (s.auditStatus === 'warning') auditState = "CON_DIFERENCIAS";
        else if (s.auditStatus === 'failed') auditState = "RECHAZADO";

        return {
            "ID_RECEPCION": s.id,
            "FECHA_HORA": formatDateTimeForAppSheet(s.createdAt),
            "ETIQUETA": s.logisticsLabel,
            "ESTADO": s.status === 'draft' ? 'BORRADOR' : 'PROCESADO',
            "ESTADO_AUDITORIA": auditState, 
            "PUNTAJE_AUDITORIA": s.auditScore || 0 
        };
    });

    if (rows.length > 0) {
        console.log(`[Sync Reception] Sending ${rows.length} rows to ${config.receptionTableName}`);
        // Action: "Add" is appropriate for Logs. 
        // Using "es-CL" Locale combined with DD/MM/YYYY date format ensures sheets parses it correctly.
        await sendToAppSheet(config, config.receptionTableName, { 
            Action: "Add", 
            Properties: { Locale: "es-CL", Timezone: "UTC" }, 
            Rows: rows 
        });
        
        // Only mark as synced if the API call didn't throw an error
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
  if (options?.erpFilter) { 
      selector = `[${SHEET_COLUMNS.ERP_ORDER}] = '${options.erpFilter.replace(/'/g, "")}'`; 
  }
  
  console.log("[AppSheet] Fetching with selector:", selector || "ALL (Client-side filtering enabled)");

  const payload: AppSheetPayload = { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC", Selector: selector || undefined }, Rows: [] };
  const result = await sendToAppSheet(config, config.countsTableName, payload);
  
  if (!Array.isArray(result)) return [];

  if (options?.dateRange) {
      console.log(`[AppSheet] Filtering ${result.length} rows by date locally...`);
      const startTs = parseFlexibleDate(options.dateRange.start);
      const endTs = parseFlexibleDate(options.dateRange.end) + (24 * 60 * 60 * 1000) - 1; 

      return result.filter(row => {
          const rowDateRaw = row[SHEET_COLUMNS.DATE];
          if (!rowDateRaw) return false;
          const rowTs = parseFlexibleDate(rowDateRaw);
          return rowTs >= startTs && rowTs <= endTs;
      });
  }

  return result;
};

export const queueSync = async (session: CountingSession, items: ConsolidatedItem[]) => { await db.syncQueue.add({ session, items, createdAt: Date.now(), status: 'pending', retryCount: 0 }); };
export const processSyncQueue = async () => {
    const jobs = await db.syncQueue.where('status').equals('pending').toArray();
    for (const job of jobs) { try { await syncToAppSheet(job.session); if (job.id) await db.syncQueue.delete(job.id); } catch (e: any) { if (job.id) await db.syncQueue.update(job.id, { retryCount: job.retryCount + 1 }); } }
};