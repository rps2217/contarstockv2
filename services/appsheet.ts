
import { CountingSession, Product, ScanRecord, ConsolidatedItem } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { markScansAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { sendToGas, fetchFromGas } from "./gasService";
import { aggregateScans } from "./aggregator";
import { SHEET_COLUMNS } from "./constants";

/**
 * MOTOR DE SINCRONIZACIÓN CLOUD
 * Rutea datos según el tipo de sesión.
 */
export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const isHammerMode = session.sessionType === 'hammer';
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  let rows = [];
  let targetTable = "";

  // --- PREPARACIÓN DE DATOS (CONSOLIDACIÓN) ---
  const consolidatedItems: ConsolidatedItem[] = await aggregateScans(unsynced);

  if (isHammerMode) {
      // --- MODO MARTILLO ---
      targetTable = config?.countsTableName || "CONTEOS";
      if (onProgress) onProgress(`Consolidando Martillo en: ${targetTable}`);
      
      rows = consolidatedItems.map(item => {
          const physical = item.totalQuantity;
          // Nota: Actualmente el modo martillo post-migración no retiene el esperado localmente en scans,
          // por lo que se envía 0 por defecto si no está disponible, permitiendo rellenarlo en el Excel después si es necesario.
          const expected = item.expectedQuantity || 0; 
          const difference = physical - expected;

          return {
              [SHEET_COLUMNS.ID]: generateUUID(),
              [SHEET_COLUMNS.UNIQUE_KEY]: `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}`,
              [SHEET_COLUMNS.DATE]: new Date().toLocaleString(),
              [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
              [SHEET_COLUMNS.BARCODE]: item.barcode,
              [SHEET_COLUMNS.PRODUCT_NAME]: item.productName,
              [SHEET_COLUMNS.QUANTITY]: physical,
              [SHEET_COLUMNS.EXPECTED]: expected, // Nueva Columna
              [SHEET_COLUMNS.DIFF]: difference,   // Nueva Columna
              [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
              [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "SI" : "NO"
          };
      });

  } else {
      // --- MODO ESTÁNDAR ---
      targetTable = config?.consolidatedTableName || "CONSOLIDADOS";
      if (onProgress) onProgress(`Subiendo RESUMEN a: ${targetTable}`);
      
      rows = consolidatedItems.map(item => {
          const physical = item.totalQuantity;
          const expected = item.expectedQuantity || 0;
          const difference = physical - expected;

          return {
            "ID_CONSOLIDADO": generateUUID().substring(0, 8),
            [SHEET_COLUMNS.UNIQUE_KEY]: `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}`,
            [SHEET_COLUMNS.DATE]: new Date().toLocaleString(),
            [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
            [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
            [SHEET_COLUMNS.BARCODE]: item.barcode,
            [SHEET_COLUMNS.PRODUCT_NAME]: item.productName,
            [SHEET_COLUMNS.QUANTITY]: physical,
            // Agregamos también al consolidado por consistencia
            [SHEET_COLUMNS.EXPECTED]: expected, 
            [SHEET_COLUMNS.DIFF]: difference,
            "INCIDENCIAS": item.isIncident ? "SI" : "NO"
          };
      });
  }

  // Envío al motor Turbo de Google
  const result = await sendToGas({ tableName: targetTable, rows });

  if (result && result.success) {
      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`✓ Sincronización exitosa.`);
  } else {
      throw new Error(result?.error || `Fallo en comunicación con ${targetTable}. Verifique que la hoja tenga los encabezados correctos.`);
  }
};

export const fetchProductsFromCloud = async (): Promise<any[]> => {
  const config = getSettings().appSheetConfig;
  return await fetchFromGas(config?.productsTableName || "PRODUCTOS", {});
};

export const syncProductsToAppSheet = async (products: Product[]): Promise<void> => {
    const config = getSettings().appSheetConfig;
    const rows = products.map(p => ({
        [SHEET_COLUMNS.BARCODE]: p.barcode,
        [SHEET_COLUMNS.PRODUCT_NAME]: p.name,
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
