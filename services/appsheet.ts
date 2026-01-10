
import { CountingSession, Product } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { markScansAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { SHEET_COLUMNS } from "./constants";
import { sendToGas, callGas, fetchFromGas } from "./gasService";
import { aggregateScans } from "./aggregator";

/**
 * Sincronización de Sesiones vía Turbo-Sync (GAS)
 */
export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  
  if (unsynced.length === 0) return;

  if (onProgress) onProgress(`Consolidando datos locales...`);
  const consolidated = await aggregateScans(unsynced);
  
  const rows = consolidated.map(item => ({
      [SHEET_COLUMNS.ID]: generateUUID().substring(0,8),
      [SHEET_COLUMNS.UNIQUE_KEY]: `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${item.mm || 0}_${item.yyyy || 0}`,
      [SHEET_COLUMNS.DATE]: new Date().toISOString(),
      [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
      [SHEET_COLUMNS.BARCODE]: item.barcode,
      [SHEET_COLUMNS.PRODUCT_NAME]: item.productName,
      [SHEET_COLUMNS.QUANTITY]: item.totalQuantity,
      [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
      [SHEET_COLUMNS.MONTH]: item.mm || 0,
      [SHEET_COLUMNS.YEAR]: item.yyyy || 0,
      [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "FRC" : ""
  }));

  if (onProgress) onProgress(`Enviando paquete Turbo-Sync...`);
  
  const result = await sendToGas({ 
      tableName: config?.countsTableName || "CONTEOS", 
      rows 
  });

  if (result.success) {
      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`Sincronización Exitosa.`);
  } else {
      throw new Error(result.error || "Fallo en el servidor GAS");
  }
};

/**
 * Descarga de progreso global desde la nube.
 */
export const fetchCloudData = async (params: { erpFilter?: string }): Promise<any[]> => {
  return await fetchFromGas("CONTEOS", params);
};

/**
 * Sincronización de Recepción (Ráfaga)
 */
export const syncReceptionToAppSheet = async (session: CountingSession): Promise<void> => {
    const config = getSettings().appSheetConfig;
    const rows = [{
        "ID_RECEPCION": generateUUID().substring(0, 8),
        "FECHA_HORA": new Date().toISOString(),
        "ETIQUETA": session.logisticsLabel,
        "ESTADO": "RECIBIDO"
    }];
    const result = await sendToGas({ tableName: config?.receptionTableName || "RECEPCION_BULTOS", rows });
    if (!result.success) throw new Error(result.error);
};

/**
 * Gestión de Catálogo Maestro en la Nube
 */
export const syncProductsToAppSheet = async (products: Product[]): Promise<void> => {
    const config = getSettings().appSheetConfig;
    const rows = products.map(p => ({
        "CODIGO": p.barcode,
        "PRODUCTO": p.name,
        "CATEGORIA": p.category,
        "PROVEEDOR": p.supplier,
        "RUT": p.supplierRut
    }));
    const result = await sendToGas({ tableName: config?.productsTableName || "PRODUCTOS", rows });
    if (result.success) {
        await markProductsAsSynced(products.map(p => p.barcode));
    } else {
        throw new Error(result.error);
    }
};

export const fetchProductsFromCloud = async (): Promise<any[]> => {
  return await fetchFromGas("PRODUCTOS", {});
};

export const parseFlexibleDate = (dateStr: any): number => {
    if (!dateStr) return Date.now();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
};
