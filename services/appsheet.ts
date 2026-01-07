
import { CountingSession, Product } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID, normalizeKey } from "./utils";
import { markScansAsSynced, markDraftsAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { sendToAppSheet } from "../infrastructure/api/appsheetClient";
import { SHEET_COLUMNS } from "./constants";
import { logger } from "./logger";
import { aggregateScans } from "./aggregator";

const formatDateTime = (ts: number): string => {
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

// Fix: Added missing parseFlexibleDate function exported for syncManager.ts
/**
 * Intenta convertir una fecha de texto (Excel/AppSheet) a timestamp numérico
 */
export const parseFlexibleDate = (dateVal: any): number => {
    if (!dateVal) return Date.now();
    if (typeof dateVal === 'number') return dateVal;
    
    const parsed = Date.parse(dateVal);
    if (!isNaN(parsed)) return parsed;
    
    try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return d.getTime();
    } catch (e) {}
    
    return Date.now();
};

/**
 * Worker Wrapper para preparación de datos
 */
const prepareSyncPayload = (session: CountingSession, consolidated: any[]): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('../workers/syncPrep.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e) => {
            if (e.data.success) resolve(e.data.rows);
            else reject(new Error(e.data.error));
            worker.terminate();
        };
        worker.postMessage({
            consolidated,
            session,
            timestamp: formatDateTime(Date.now()),
            uuidPrefix: generateUUID().substring(0, 8)
        });
    });
};

const syncRowsIndividually = async (
    config: any, 
    tableName: string, 
    rows: any[], 
    action: "Add" | "Edit",
    onProgress?: (msg: string) => void
): Promise<{ successfulKeys: string[], failedCount: number }> => {
    const successfulKeys: string[] = [];
    let failedCount = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            if (onProgress) onProgress(`[Fila ${i + 1}/${rows.length}] Enviando ${row[SHEET_COLUMNS.BARCODE]}...`);
            await sendToAppSheet(config, tableName, { 
                Action: action, 
                Properties: { Locale: "es-CL", Timezone: "UTC" }, 
                Rows: [row] 
            });
            successfulKeys.push(row[SHEET_COLUMNS.UNIQUE_KEY]);
        } catch (e: any) {
            logger.warn('SyncRow', `Fallo: ${e.message}`);
            failedCount++;
        }
    }
    return { successfulKeys, failedCount };
};

export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.countsTableName) throw new Error("Configuración incompleta.");
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  if (onProgress) onProgress(`Consolidando registros...`);
  const consolidated = await aggregateScans(unsynced);
  
  if (onProgress) onProgress(`Preparando payload en Worker...`);
  const rows = await prepareSyncPayload(session, consolidated);

  try {
      if (onProgress) onProgress(`Enviando ${rows.length} filas...`);
      await sendToAppSheet(config, config.countsTableName, { 
          Action: "Add", 
          Properties: { Locale: "es-CL", Timezone: "UTC" }, 
          Rows: rows 
      });
      await markScansAsSynced(unsynced.map(s => s.id));
  } catch (err: any) {
      if (onProgress) onProgress(`Fallo lote. Recuperando por ítem...`);
      const { successfulKeys, failedCount } = await syncRowsIndividually(config, config.countsTableName, rows, "Edit", onProgress);
      
      const successfulSkus = new Set(successfulKeys.map(k => k.split('_')[2])); 
      const idsToMark = unsynced.filter(s => successfulSkus.has(s.barcode)).map(s => s.id);
      if (idsToMark.length > 0) await markScansAsSynced(idsToMark);
      if (failedCount > 0) throw new Error(`${failedCount} errores.`);
  }
};

export const syncProductsToAppSheet = async (products: Product[], onProgress?: (msg: string) => void) => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.productsTableName) throw new Error("Configuración incompleta.");
  const rows = products.map(p => ({ "COD PRODUCTO": p.barcode, "DESCRIPCION": p.name, "MUNDO": p.category, "PROVEEDOR": p.supplier, "RUT PROVEEDOR": p.supplierRut }));
  try {
      await sendToAppSheet(config, config.productsTableName, { Action: "Add", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: rows });
      await markProductsAsSynced(products.map(p => p.barcode));
  } catch {
      const { successfulKeys } = await syncRowsIndividually(config, config.productsTableName, rows, "Edit", onProgress);
      if (successfulKeys.length > 0) await markProductsAsSynced(successfulKeys);
  }
};

export const fetchCloudData = async (options?: any) => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.countsTableName) return [];
  const res = await sendToAppSheet(config, config.countsTableName, { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: [] });
  return res?.Rows || [];
};

export const fetchProductsFromCloud = async () => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.productsTableName) return [];
  const res = await sendToAppSheet(config, config.productsTableName, { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: [] });
  return res?.Rows || [];
};

export const syncReceptionToAppSheet = async (sessions: CountingSession[], onProgress?: (msg: string) => void) => {
    const config = getSettings().appSheetConfig;
    if (!config?.appId || !config?.accessKey || !config?.receptionTableName) throw new Error("Configuración incompleta.");
    let success = 0, failed = 0;
    for (const s of sessions) {
        const row = { "ID_RECEPCION": String(s.id), "FECHA_HORA": formatDateTime(s.createdAt), "ETIQUETA": String(s.logisticsLabel), "ESTADO": s.status === 'draft' ? 'PENDIENTE' : 'PROCESADO' };
        try {
            await sendToAppSheet(config, config.receptionTableName, { Action: "Add", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: [row] });
            await markDraftsAsSynced([s.id]);
            success++;
        } catch {
            try {
                await sendToAppSheet(config, config.receptionTableName, { Action: "Edit", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: [row] });
                await markDraftsAsSynced([s.id]);
                success++;
            } catch { failed++; }
        }
    }
    return { success, failed };
};
