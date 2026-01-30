import { CountingSession, Product, ScanRecord, ConsolidatedItem } from "../types";
import { getSettings } from "./settings"; 
import { generateUUID } from "./utils";
import { markScansAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { sendToGas, callGas } from "./gasService";
import { aggregateScans } from "./aggregator";
import { SHEET_COLUMNS } from "./constants";

/**
 * MOTOR DE SINCRONIZACIÓN CLOUD v10
 * Implementa atomicidad y verificación de servidor.
 */
export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const isHammerMode = session.sessionType === 'hammer';
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  const consolidatedItems: ConsolidatedItem[] = await aggregateScans(unsynced);
  const expectedMap = new Map<string, number>();
  if (session.expectedItems) {
      session.expectedItems.forEach(item => expectedMap.set(item.barcode, item.expectedQty));
  }

  const targetTable = isHammerMode ? (config?.countsTableName || "CONTEOS") : (config?.consolidatedTableName || "CONSOLIDADOS");
  if (onProgress) onProgress(`Sincronizando ${consolidatedItems.length} SKUs en ${targetTable}...`);

  const rows = consolidatedItems.map(item => {
      const physical = item.totalQuantity;
      const expected = expectedMap.get(item.barcode) || 0;
      return {
          [SHEET_COLUMNS.ID]: generateUUID(),
          [SHEET_COLUMNS.UNIQUE_KEY]: `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}`,
          [SHEET_COLUMNS.DATE]: new Date().toLocaleString(),
          [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
          [SHEET_COLUMNS.BARCODE]: item.barcode,
          [SHEET_COLUMNS.PRODUCT_NAME]: item.productName,
          [SHEET_COLUMNS.QUANTITY]: physical,
          [SHEET_COLUMNS.EXPECTED]: expected,
          [SHEET_COLUMNS.DIFF]: physical - expected,
          [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
          [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "SI" : "NO"
      };
  });

  // Envío con compresión automática si es masivo
  const result = await sendToGas({ tableName: targetTable, rows });

  if (result && result.success) {
      // Verificación de integridad: El servidor debe confirmar cuántas filas escribió
      if (result.rows_written === 0 && rows.length > 0) {
          throw new Error("El servidor no confirmó la escritura de datos.");
      }
      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`✓ Confirmado por servidor: ${result.rows_written} registros.`);
  } else {
      throw new Error(result?.error || "Fallo crítico de comunicación.");
  }
};

export const fetchProductsFromCloud = async (): Promise<any[]> => {
  const config = getSettings().appSheetConfig;
  const res = await callGas('fetch_rows', { tableName: config?.productsTableName || "PRODUCTOS" });
  return res.success ? res.rows : [];
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