
import { ConsolidatedItem, CountingSession, Product, ScanRecord } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { getUnsyncedScans, markScansAsSynced, markDraftsAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { sendToAppSheet, AppSheetPayload } from "../infrastructure/api/appsheetClient";
import { SHEET_COLUMNS, SYNC_ENGINE_VERSION } from "./constants";
import { logger } from "./logger";
import { aggregateScans } from "./aggregator";

export { SYNC_ENGINE_VERSION, SHEET_COLUMNS };

// --- HELPERS ---

const formatDateTimeForAppSheet = (timestamp: number): string => {
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};

export const parseFlexibleDate = (dateVal: any): number => {
    if (!dateVal) return Date.now();
    if (typeof dateVal === 'number') {
        if (dateVal > 30000 && dateVal < 60000) {
            return new Date((dateVal - (25567 + 2)) * 86400 * 1000).getTime();
        }
        return dateVal; 
    }
    
    const s = String(dateVal).trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}/)) { 
        const ts = new Date(s.replace(/-/g, '/')).getTime(); 
        if (!isNaN(ts)) return ts; 
    }
    
    const ts = new Date(s).getTime(); 
    return isNaN(ts) ? Date.now() : ts;
};

// ==========================================
// CORE SYNC LOGIC (ANTI-DUPLICATE)
// ==========================================

export const syncToAppSheet = async (session: CountingSession): Promise<void> => {
  const settings = getSettings(); 
  const config = settings.appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.countsTableName) throw new Error("Config incompleta.");
  
  // 1. CRITICAL: Only fetch scans that HAVE NOT been synced yet (synced = 0)
  const unsyncedScans = await db.scans
    .where('sessionId').equals(session.id)
    .filter(s => s.synced === 0)
    .toArray();

  if (unsyncedScans.length === 0) {
      logger.info('Sync', `Sesión ${session.logisticsLabel} ya está al día. Nada que subir.`);
      return;
  }

  // 2. Aggregate only the new scans
  const consolidated = await aggregateScans(unsyncedScans);

  // 3. Prepare rows with Idempotency Key (CLAVE_UNICA)
  // AppSheet can use this column to prevent duplicate rows if configured as key
  const rows = consolidated.map(item => {
    const mm = item.mm || 0;
    const yyyy = item.yyyy || 0;
    // Composite ID to prevent cloud duplication: ERP_LABEL_SKU_MM_YYYY
    const idempotencyKey = `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${mm}_${yyyy}`;

    return {
      [SHEET_COLUMNS.ID]: generateUUID(),
      [SHEET_COLUMNS.UNIQUE_KEY]: idempotencyKey, // Map to a 'Key' column in AppSheet
      [SHEET_COLUMNS.DATE]: formatDateTimeForAppSheet(Date.now()), // Use current sync time
      [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
      [SHEET_COLUMNS.BARCODE]: item.barcode,
      [SHEET_COLUMNS.PRODUCT_NAME]: item.productName,
      [SHEET_COLUMNS.QUANTITY]: item.totalQuantity,
      [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
      [SHEET_COLUMNS.MONTH]: mm,
      [SHEET_COLUMNS.YEAR]: yyyy,
      [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "FRC" : ""
    };
  });

  // 4. Execute Cloud Write
  await sendToAppSheet(config, config.countsTableName, {
    Action: "Add",
    Properties: { Locale: "es-CL", Timezone: "UTC" },
    Rows: rows
  });

  // 5. Mark only THESE scans as synced in local DB
  const syncedIds = unsyncedScans.map(s => s.id);
  await markScansAsSynced(syncedIds);
  
  logger.success('Sync', `Subidos ${rows.length} registros nuevos para ${session.erpOrder}`);
};

export const syncReceptionToAppSheet = async (sessions: CountingSession[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    const settings = getSettings(); 
    const config = settings.appSheetConfig;
    
    if (!config?.appId || !config?.accessKey || !config?.receptionTableName) {
        throw new Error("Falta configurar la 'Tabla de Recepción' en Ajustes.");
    }
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const session of sessions) {
        // Idempotent Header Sync: Uses session.id as ID_RECEPCION
        const row = {
            "ID_RECEPCION": String(session.id),
            "FECHA_HORA": formatDateTimeForAppSheet(session.createdAt),
            "ETIQUETA": String(session.logisticsLabel),
            "ESTADO": session.status === 'draft' ? 'PENDIENTE' : 'PROCESADO'
        };

        try {
            await sendToAppSheet(config, config.receptionTableName, { 
                Action: "Add", 
                Properties: { Locale: "es-CL", Timezone: "UTC" }, 
                Rows: [row] 
            });
            await markDraftsAsSynced([session.id]);
            successCount++;
        } catch (addError: any) {
            // If Add fails (usually because ID already exists), try Edit to update status
            try {
                await sendToAppSheet(config, config.receptionTableName, { 
                    Action: "Edit", 
                    Properties: { Locale: "es-CL", Timezone: "UTC" }, 
                    Rows: [row] 
                });
                await markDraftsAsSynced([session.id]);
                successCount++;
            } catch (editError: any) {
                failCount++;
                errors.push(`${session.logisticsLabel}: ${editError.message}`);
            }
        }
    }
    
    return { success: successCount, failed: failCount, errors };
};

export const fetchCloudData = async (options?: { erpFilter?: string; dateRange?: { start: string, end: string } }): Promise<any[]> => {
  const settings = getSettings();
  const config = settings.appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.countsTableName) throw new Error("Configuración incompleta.");
  const result = await sendToAppSheet(config, config.countsTableName, { 
    Action: "Find", 
    Properties: { Locale: "es-CL", Timezone: "UTC" }, 
    Rows: [] 
  });
  return result?.Rows || [];
};

export const fetchReceptionData = async (options?: { dateRange?: { start: string, end: string } }): Promise<any[]> => {
  const settings = getSettings();
  const config = settings.appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.receptionTableName) throw new Error("Configuración incompleta.");
  const result = await sendToAppSheet(config, config.receptionTableName, { 
    Action: "Find", 
    Properties: { Locale: "es-CL", Timezone: "UTC" }, 
    Rows: [] 
  });
  return result?.Rows || [];
};

export const fetchProductsFromCloud = async (): Promise<any[]> => {
  const settings = getSettings();
  const config = settings.appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.productsTableName) throw new Error("Configuración incompleta.");
  const result = await sendToAppSheet(config, config.productsTableName, { 
    Action: "Find", 
    Properties: { Locale: "es-CL", Timezone: "UTC" }, 
    Rows: [] 
  });
  return result?.Rows || [];
};

export const syncProductsToAppSheet = async (products: Product[]): Promise<void> => {
  const settings = getSettings();
  const config = settings.appSheetConfig;
  if (!config?.appId || !config?.accessKey || !config?.productsTableName) throw new Error("Configuración incompleta.");
  
  const rows = products.map(p => ({
    "COD PRODUCTO": p.barcode,
    "DESCRIPCION": p.name,
    "MUNDO": p.category,
    "PROVEEDOR": p.supplier,
    "RUT PROVEEDOR": p.supplierRut
  }));

  try {
      await sendToAppSheet(config, config.productsTableName, { 
        Action: "Add", 
        Properties: { Locale: "es-CL", Timezone: "UTC" }, 
        Rows: rows 
      });
  } catch (e) {
      await sendToAppSheet(config, config.productsTableName, { 
        Action: "Edit", 
        Properties: { Locale: "es-CL", Timezone: "UTC" }, 
        Rows: rows 
      });
  }
  
  await markProductsAsSynced(products.map(p => p.barcode));
};
