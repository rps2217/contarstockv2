
import { CountingSession, Product, ScanRecord, ConsolidatedItem } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { markScansAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { SHEET_COLUMNS } from "./constants";
import { sendToGas, fetchFromGas } from "./gasService";
import { aggregateScans } from "./aggregator";

/**
 * MOTOR DE SINCRONIZACIÓN INDUSTRIAL v11.0
 * Independencia de canales:
 * 1. Nueva Carga -> Cloud Consolidado (Sumarizado)
 * 2. Martillo -> Cloud Conteos (Log Detallado por evento)
 */
export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const isHammerMode = session.sessionType === 'hammer';
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  let rows = [];
  let targetTable = "";

  if (isHammerMode) {
      // CANAL MARTILLO: Enviamos el historial exacto del operario (Log de Auditoría)
      targetTable = config?.countsTableName || "CONTEOS";
      if (onProgress) onProgress(`Enviando LOG DETALLADO a: ${targetTable}`);
      
      rows = unsynced.map(record => ({
          [SHEET_COLUMNS.ID]: record.id,
          [SHEET_COLUMNS.UNIQUE_KEY]: `${session.erpOrder}_${session.logisticsLabel}_${record.barcode}_${record.id.substring(0,4)}`,
          [SHEET_COLUMNS.DATE]: new Date(record.timestamp).toISOString(),
          [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
          [SHEET_COLUMNS.BARCODE]: record.barcode,
          [SHEET_COLUMNS.PRODUCT_NAME]: "Martillo_Log_Puro",
          [SHEET_COLUMNS.QUANTITY]: record.quantity,
          [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
          [SHEET_COLUMNS.MONTH]: record.mm || 0,
          [SHEET_COLUMNS.YEAR]: record.yyyy || 0,
          [SHEET_COLUMNS.INCIDENT]: record.isIncident ? "SI" : ""
      }));
  } else {
      // CANAL ESTÁNDAR: Enviamos el resumen sumado por SKU (Eficiencia de Datos)
      targetTable = config?.consolidatedTableName || "CONSOLIDADO";
      if (onProgress) onProgress(`Enviando RESUMEN SUMARIZADO a: ${targetTable}`);
      
      const consolidated: ConsolidatedItem[] = await aggregateScans(unsynced);
      
      rows = consolidated.map(item => ({
          "ID_CONSOLIDADO": generateUUID().substring(0, 8),
          "CLAVE_UNICA": `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}`,
          "FECHA": new Date().toISOString(),
          "ERP": session.erpOrder,
          "ETIQUETA": session.logisticsLabel,
          "CODIGO": item.barcode,
          "PRODUCTO": item.productName,
          "CANTIDAD": item.totalQuantity,
          "INCIDENCIAS": item.isIncident ? "SI" : "NO"
      }));
  }

  const result = await sendToGas({ tableName: targetTable, rows });

  if (result.success) {
      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`✓ Canal ${targetTable} sincronizado.`);
  } else {
      throw new Error(result.error || `Fallo crítico en canal ${targetTable}`);
  }
};

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

export const fetchProductsFromCloud = async (): Promise<any[]> => {
  return await fetchFromGas("PRODUCTOS", {});
};

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

export const fetchCloudData = async (params: { erpFilter?: string }): Promise<any[]> => {
  return await fetchFromGas("CONTEOS", params);
};
