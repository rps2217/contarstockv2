
import { CountingSession, Product, ScanRecord, ConsolidatedItem } from "../types";
import { getSettings } from "./settings"; 
import { markScansAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { callGas } from "./gasService";
import { cloudApi } from "./cloud/apiClient";
import { aggregateScans } from "./aggregator";
import { createInventoryPayload } from "./cloud/mappers";

export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const isHammerMode = session.sessionType === 'hammer';
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  const consolidatedItems: ConsolidatedItem[] = await aggregateScans(unsynced);
  
  // PRIORIDAD: Modo Martillo -> countsTableName (CONTEOS). Modo Estándar -> consolidatedTableName (CONSOLIDADOS)
  const targetTable = isHammerMode 
    ? (config?.countsTableName || "CONTEOS") 
    : (config?.consolidatedTableName || "CONSOLIDADOS");

  if (onProgress) onProgress(`Enviando a [${targetTable}]...`);

  // Usamos el mappers.ts para garantizar que la estructura sea idéntica en toda la app
  const rows = createInventoryPayload(session, consolidatedItems, 'manual');

  const result = await cloudApi.appendRows(targetTable, rows);

  if (result && result.success) {
      if (result.rows_written === 0 && rows.length > 0) {
          throw new Error("El servidor no pudo escribir las filas. Verifica cabeceras.");
      }
      await markScansAsSynced(unsynced.map(s => s.id));
      if (onProgress) onProgress(`✓ ${result.rows_written} filas en ${targetTable}.`);
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
        "CODIGO": p.barcode,
        "PRODUCTO": p.name,
        "CATEGORIA": p.category,
        "PROVEEDOR": p.supplier,
        "RUT": p.supplierRut
    }));
    const result = await cloudApi.appendRows(config?.productsTableName || "PRODUCTOS", rows);
    if (result && result.success) {
        await markProductsAsSynced(products.map(p => p.barcode));
    } else {
        throw new Error(result?.error || "Fallo al sincronizar productos");
    }
};
