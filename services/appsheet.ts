
import { CountingSession, Product, ScanRecord, ConsolidatedItem } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { markScansAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { sendToGas, fetchFromGas } from "./gasService";
import { aggregateScans } from "./aggregator";

export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const isHammerMode = session.sessionType === 'hammer';
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  let rows = [];
  let targetTable = "";

  if (isHammerMode) {
      // RUTA MARTILLO -> LOGS DETALLADOS
      targetTable = config?.countsTableName || "CONTEOS";
      if (onProgress) onProgress(`Subiendo LOGS a: ${targetTable}`);
      
      rows = unsynced.map(record => ({
          "ID_REGISTRO": record.id,
          "CLAVE_UNICA": `${session.erpOrder}_${session.logisticsLabel}_${record.barcode}_${record.id.substring(0,4)}`,
          "FECHA": new Date(record.timestamp).toLocaleString(),
          "ERP": session.erpOrder,
          "CODIGO": record.barcode,
          "PRODUCTO": "Audit_Martillo",
          "CANTIDAD": record.quantity,
          "ETIQUETAS": session.logisticsLabel,
          "MM": record.mm || 0,
          "YYYY": record.yyyy || 0,
          "FRC": record.isIncident ? "SI" : ""
      }));
  } else {
      // RUTA ESTÁNDAR -> RESUMEN CONSOLIDADO
      targetTable = config?.consolidatedTableName || "CONSOLIDADOS";
      if (onProgress) onProgress(`Subiendo RESUMEN a: ${targetTable}`);
      
      const consolidated: ConsolidatedItem[] = await aggregateScans(unsynced);
      
      rows = consolidated.map(item => ({
          "ID_CONSOLIDADO": generateUUID().substring(0, 8),
          "CLAVE_UNICA": `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}`,
          "FECHA": new Date().toLocaleString(),
          "ERP": session.erpOrder,
          "ETIQUETA": session.logisticsLabel,
          "CODIGO": item.barcode,
          "PRODUCTO": item.productName,
          "CANTIDAD": item.totalQuantity,
          "INCIDENCIAS": item.isIncident ? "SI" : "NO"
      }));
  }

  const result = await sendToGas({ tableName: targetTable, rows });

  if (result && result.success) {
      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`✓ Sincronización exitosa.`);
  } else {
      throw new Error(result?.error || "Error desconocido en el servidor de Google");
  }
};

export const fetchProductsFromCloud = async (): Promise<any[]> => {
  const config = getSettings().appSheetConfig;
  return await fetchFromGas(config?.productsTableName || "PRODUCTOS", {});
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
    if (result && result.success) {
        await markProductsAsSynced(products.map(p => p.barcode));
    } else {
        throw new Error(result?.error || "Fallo al sincronizar productos");
    }
};
