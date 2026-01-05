
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

export const parseFlexibleDate = (v: any): number => {
    if (!v) return Date.now();
    if (typeof v === 'number') return (v > 30000 && v < 60000) ? new Date((v - 25569) * 86400 * 1000).getTime() : v;
    const s = String(v).trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(s.replace(/-/g, '/')).getTime();
    const ts = new Date(s).getTime();
    return isNaN(ts) ? Date.now() : ts;
};

/**
 * Helper para intentar subir filas una por una si falla el lote
 */
const syncRowsIndividually = async (config: any, tableName: string, rows: any[], action: "Add" | "Edit"): Promise<{ successfulKeys: string[], failedCount: number }> => {
    const successfulKeys: string[] = [];
    let failedCount = 0;

    for (const row of rows) {
        try {
            await sendToAppSheet(config, tableName, { 
                Action: action, 
                Properties: { Locale: "es-CL", Timezone: "UTC" }, 
                Rows: [row] 
            });
            successfulKeys.push(row[SHEET_COLUMNS.UNIQUE_KEY] || row["COD PRODUCTO"]);
        } catch (e) {
            failedCount++;
        }
    }
    return { successfulKeys, failedCount };
};

export const syncToAppSheet = async (session: CountingSession): Promise<void> => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.countsTableName) throw new Error("Config incompleta.");
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  const consolidated = await aggregateScans(unsynced);
  const rows = consolidated.map(item => ({
      [SHEET_COLUMNS.ID]: generateUUID(),
      [SHEET_COLUMNS.UNIQUE_KEY]: `${normalizeKey(session.erpOrder)}_${normalizeKey(session.logisticsLabel)}_${item.barcode}_${item.mm || 0}_${item.yyyy || 0}`,
      [SHEET_COLUMNS.DATE]: formatDateTime(Date.now()),
      [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
      [SHEET_COLUMNS.BARCODE]: item.barcode,
      [SHEET_COLUMNS.PRODUCT_NAME]: item.productName,
      [SHEET_COLUMNS.QUANTITY]: item.totalQuantity,
      [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
      [SHEET_COLUMNS.MONTH]: item.mm || 0,
      [SHEET_COLUMNS.YEAR]: item.yyyy || 0,
      [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "FRC" : ""
  }));

  try {
      // Intento 1: Lote completo (Add)
      await sendToAppSheet(config, config.countsTableName, { 
          Action: "Add", 
          Properties: { Locale: "es-CL", Timezone: "UTC" }, 
          Rows: rows 
      });
      await markScansAsSynced(unsynced.map(s => s.id));
  } catch (err: any) {
      // Intento 2: Si el lote falla, procesar uno por uno para no bloquear
      logger.warn('Sync', `Fallo lote en ${session.erpOrder}. Recuperando por fila...`);
      
      const { successfulKeys, failedCount } = await syncRowsIndividually(config, config.countsTableName, rows, "Edit");
      
      // Marcar como sincronizados solo los que tuvieron éxito (basado en la clave única)
      const successfulSkus = new Set(successfulKeys.map(k => k.split('_')[2])); 
      const idsToMark = unsynced.filter(s => successfulSkus.has(s.barcode)).map(s => s.id);
      
      if (idsToMark.length > 0) await markScansAsSynced(idsToMark);
      if (failedCount > 0) throw new Error(`${failedCount} SKUs rechazados por la nube.`);
  }
};

export const syncProductsToAppSheet = async (products: Product[]) => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.productsTableName) throw new Error("Config incompleta.");
  
  const rows = products.map(p => ({ 
      "COD PRODUCTO": p.barcode, 
      "DESCRIPCION": p.name, 
      "MUNDO": p.category, 
      "PROVEEDOR": p.supplier, 
      "RUT PROVEEDOR": p.supplierRut 
  }));

  try {
      await sendToAppSheet(config, config.productsTableName, { Action: "Add", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: rows });
      await markProductsAsSynced(products.map(p => p.barcode));
  } catch {
      const { successfulKeys, failedCount } = await syncRowsIndividually(config, config.productsTableName, rows, "Edit");
      if (successfulKeys.length > 0) await markProductsAsSynced(successfulKeys);
      if (failedCount > 0) throw new Error(`${failedCount} productos no pudieron actualizarse.`);
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

export const syncReceptionToAppSheet = async (sessions: CountingSession[]) => {
    const config = getSettings().appSheetConfig;
    if (!config?.appId || !config?.accessKey || !config?.receptionTableName) throw new Error("Config incompleta.");
    
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
