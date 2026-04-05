
import { CountingSession, Product, ConsolidatedItem } from "../types";
import { getSettings } from "./settings"; 
import { markScansAsSynced } from "./sessionService"; 
import { markProductsAsSynced } from "./productService";
import { db } from "../db";
import { firebaseSyncService } from "./firebaseSyncService";
import { createProductsPayload } from "./cloud/mappers";

/**
 * RESPALDO DE INTELIGENCIA COLECTIVA (UPSERT)
 * Envía el catálogo con firmas IA en lotes pequeños para evitar Timeouts.
 */
export const syncProductsToAppSheet = async (products: Product[]): Promise<void> => {
 const config = getSettings().appSheetConfig;
 if (!products.length) return;

 // Lotes de 50 para manejar el peso de los vectores (embeddings)
 const BATCH_SIZE = 50;
 const totalBatches = Math.ceil(products.length / BATCH_SIZE);

 for (let i = 0; i < totalBatches; i++) {
 const batch = products.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
 const rows = createProductsPayload(batch);
 
 console.log(`[CloudSync] Subiendo lote IA ${i+1}/${totalBatches}...`);

 const result = await firebaseSyncService.pushBatch(config?.productsTableName || "PRODUCTOS", rows);
 
 if (result && result.success) {
 await markProductsAsSynced(batch.map(p => p.barcode));
 } else {
 throw new Error(result?.error || "Error al respaldar firmas IA en lote " + (i+1));
 }
 }
};

// Forced GitHub sync
