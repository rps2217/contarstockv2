
import { CountingSession, Product } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { markScansAsSynced, markDraftsAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { sendToAppSheet } from "../infrastructure/api/appsheetClient";
import { SHEET_COLUMNS } from "./constants";
import { logger } from "./logger";
import { aggregateScans } from "./aggregator";

// Fixed: Exporting SHEET_COLUMNS so it can be correctly imported by other modules like syncManager
export { SHEET_COLUMNS };

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

export const syncToAppSheet = async (session: CountingSession): Promise<void> => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.countsTableName) throw new Error("Config incompleta.");
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  const consolidated = await aggregateScans(unsynced);
  const rows = consolidated.map(item => ({
      [SHEET_COLUMNS.ID]: generateUUID(),
      [SHEET_COLUMNS.UNIQUE_KEY]: `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${item.mm || 0}_${item.yyyy || 0}`,
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

  await sendToAppSheet(config, config.countsTableName, { Action: "Add", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: rows });
  await markScansAsSynced(unsynced.map(s => s.id));
  logger.success('Sync', `Subidos ${rows.length} registros para ${session.erpOrder}`);
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

// Fixed: Added options parameter to satisfy call in syncManager.ts
export const fetchCloudData = async (options?: any) => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.countsTableName) throw new Error("Config incompleta.");
  const res = await sendToAppSheet(config, config.countsTableName, { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: [] });
  return res?.Rows || [];
};

// Fixed: Added options parameter to satisfy call in syncManager.ts
export const fetchReceptionData = async (options?: any) => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.receptionTableName) throw new Error("Config incompleta.");
  const res = await sendToAppSheet(config, config.receptionTableName, { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: [] });
  return res?.Rows || [];
};

export const fetchProductsFromCloud = async () => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.productsTableName) throw new Error("Config incompleta.");
  const res = await sendToAppSheet(config, config.productsTableName, { Action: "Find", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: [] });
  return res?.Rows || [];
};

export const syncProductsToAppSheet = async (products: Product[]) => {
  const config = getSettings().appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.productsTableName) throw new Error("Config incompleta.");
  const rows = products.map(p => ({ "COD PRODUCTO": p.barcode, "DESCRIPCION": p.name, "MUNDO": p.category, "PROVEEDOR": p.supplier, "RUT PROVEEDOR": p.supplierRut }));
  try { await sendToAppSheet(config, config.productsTableName, { Action: "Add", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: rows }); }
  catch { await sendToAppSheet(config, config.productsTableName, { Action: "Edit", Properties: { Locale: "es-CL", Timezone: "UTC" }, Rows: rows }); }
  await markProductsAsSynced(products.map(p => p.barcode));
};
