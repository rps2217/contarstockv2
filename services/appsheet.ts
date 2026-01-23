
import { CountingSession, Product, ScanRecord, ConsolidatedItem } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { markScansAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { sendToGas, fetchFromGas } from "./gasService";
import { aggregateScans } from "./aggregator";

/**
 * MOTOR DE SINCRONIZACIÓN CLOUD
 * Rutea datos según el tipo de sesión: 'hammer' (Logs) o 'standard' (Consolidado).
 */
export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const isHammerMode = session.sessionType === 'hammer';
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  let rows = [];
  let targetTable = "";

  if (isHammerMode) {
      // --- FLUJO MARTILLO: CADA ESCANEO ES UNA FILA EN "CONTEOS" ---
      targetTable = config?.countsTableName || "CONTEOS";
      if (onProgress) onProgress(`Subiendo LOGS a: ${targetTable}`);
      
      rows = unsynced.map(record => {
          const dateObj = new Date(record.timestamp);
          // Estas llaves deben ser idénticas a las del Script de Google
          return {
              "ID_REGISTRO": record.id,
              "CLAVE_UNICA": `${session.erpOrder}_${session.logisticsLabel}_${record.barcode}_${record.id.substring(0,6)}`,
              "FECHA": dateObj.toLocaleString(),
              "ERP": session.erpOrder,
              "CODIGO": record.barcode,
              "PRODUCTO": "Audit_Martillo", 
              "CANTIDAD": record.quantity,
              "ETIQUETAS": session.logisticsLabel,
              "FRC": record.isIncident ? "SI" : "NO"
          };
      });
  } else {
      // --- FLUJO ESTÁNDAR: RESUMEN AGRUPADO EN "CONSOLIDADOS" ---
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

  // Envío al motor Turbo de Google
  const result = await sendToGas({ tableName: targetTable, rows });

  if (result && result.success) {
      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`✓ Sincronización exitosa.`);
  } else {
      throw new Error(result?.error || `Fallo en comunicación con ${targetTable}`);
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
