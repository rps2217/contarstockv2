
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
 * MOTOR DE SINCRONIZACIÓN INTELIGENTE v8.0
 * Decide el destino y el formato según el origen de la sesión.
 */
export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  
  // 1. Determinar si es Modo Martillo
  const isHammerMode = session.erpOrder.startsWith("MARTILLO_") || session.erpOrder === "MODO_MARTILLO";
  
  // Obtenemos los registros pendientes
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  let rows = [];
  let targetTable = "";

  if (isHammerMode) {
      // --- FLUJO MARTILLO: LOG DETALLADO 1:1 ---
      targetTable = config?.countsTableName || "CONTEOS";
      if (onProgress) onProgress(`Preparando LOG DETALLADO para ${targetTable}...`);
      
      rows = unsynced.map(record => ({
          [SHEET_COLUMNS.ID]: record.id.substring(0, 12),
          [SHEET_COLUMNS.UNIQUE_KEY]: `${session.erpOrder}_${session.logisticsLabel}_${record.barcode}_${record.id.substring(0,6)}`,
          [SHEET_COLUMNS.DATE]: new Date(record.timestamp).toISOString(),
          [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
          [SHEET_COLUMNS.BARCODE]: record.barcode,
          [SHEET_COLUMNS.PRODUCT_NAME]: "Industrial_Hammer_Log",
          [SHEET_COLUMNS.QUANTITY]: record.quantity,
          [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
          [SHEET_COLUMNS.MONTH]: record.mm || 0,
          [SHEET_COLUMNS.YEAR]: record.yyyy || 0,
          [SHEET_COLUMNS.INCIDENT]: record.isIncident ? "FRC" : ""
      }));
  } else {
      // --- FLUJO NUEVA CARGA: CONSOLIDADO POR SKU ---
      targetTable = "CONSOLIDADO";
      if (onProgress) onProgress(`Agregando productos para ${targetTable}...`);
      
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
          "TOTAL_ESCANEOS": item.scans,
          "INCIDENCIAS": item.isIncident ? "SI" : "NO"
      }));
  }

  if (onProgress) onProgress(`Subiendo ${rows.length} filas a ${targetTable}...`);
  
  const result = await sendToGas({ 
      tableName: targetTable, 
      rows 
  });

  if (result.success) {
      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`Sincronización en ${targetTable} finalizada.`);
  } else {
      throw new Error(result.error || "Fallo en el servidor GAS");
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
