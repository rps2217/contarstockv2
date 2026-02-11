
import { CountingSession, Product, ConsolidatedItem } from "../types";
import { getSettings } from "./settings"; 
import { markScansAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { callGas } from "./gasService";
import { cloudApi } from "./cloud/apiClient";
import { aggregateScans } from "./aggregator";
import { createInventoryPayload, createProductsPayload } from "./cloud/mappers";

export const syncToAppSheet = async (session: CountingSession, onProgress?: (msg: string) => void): Promise<void> => {
  const config = getSettings().appSheetConfig;
  const isHammerMode = session.sessionType === 'hammer';
  
  const unsynced = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
  if (unsynced.length === 0) return;

  const consolidatedItems: ConsolidatedItem[] = await aggregateScans(unsynced);
  
  const targetTable = isHammerMode 
    ? (config?.countsTableName || "CONTEOS") 
    : (config?.consolidatedTableName || "CONSOLIDADOS");

  if (onProgress) onProgress(`Enviando a [${targetTable}]...`);

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

/**
 * SINCRONIZACIÓN DE INTELIGENCIA (UPSERT)
 * Envía el catálogo local a la nube. Si el producto ya tiene firma IA local, 
 * se actualizará en el Excel para que otros dispositivos la hereden.
 */
export const syncProductsToAppSheet = async (products: Product[]): Promise<void> => {
    const config = getSettings().appSheetConfig;
    if (!products.length) return;

    // Usamos el mapper que incluye FIRMA_IA
    const rows = createProductsPayload(products);
    
    // Cambiamos 'append_rows' por 'upsert_products' (Nueva acción en GAS)
    const result = await cloudApi.post('upsert_products', { 
        tableName: config?.productsTableName || "PRODUCTOS",
        rows 
    }, true); // Forzamos compresión porque los vectores son pesados
    
    if (result && result.success) {
        await markProductsAsSynced(products.map(p => p.barcode));
    } else {
        throw new Error(result?.error || "Fallo al sincronizar inteligencia de productos");
    }
};
