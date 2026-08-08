
import { db } from "../db";
import { Product } from "../types";
import { localBrain } from "./localBrain";
import { logger } from "./logger";

export const VectorService = {
 /**
 * Helper centralizado para determinar si a un producto le falta la firma IA.
 */
 needsEmbedding: (p: Product): boolean => {
 if (!p.embedding) return true;
 if (!Array.isArray(p.embedding)) return true;
 if (p.embedding.length === 0) return true;
 return false;
 },

 /**
 * Genera una firma numérica (embedding) usando EXCLUSIVAMENTE el motor local.
 */
 generateEmbedding: async (text: string): Promise<number[] | null> => {
 return await localBrain.embed(text);
 },

 /**
 * Procesa productos que requieren entrenamiento.
 * Lógica optimizada para CPU (sin espera de red tras la carga inicial).
 */
 vectorizeMissingProducts: async (onProgress?: (count: number, total: number) => void) => {
 // Aseguramos que el cerebro esté cargado antes de empezar el bucle
 await localBrain.init();

 const allProducts = await db.products.toArray();
 const missing = allProducts.filter(p => VectorService.needsEmbedding(p));
 const total = missing.length;

 logger.debug('vector', `Pendientes de vectorización local: ${total}`);

 if (total === 0) return 0;

 // Check if localBrain is disabled (lowEndMode)
 const testVector = await localBrain.embed("test");
 if (testVector === null) {
   logger.info('vector', 'Motor IA deshabilitado. Abortando vectorización.');
   return 0;
 }

 let processed = 0;
 let successCount = 0;

 // Procesamiento en lotes pequeños para no congelar la UI
 const BATCH_SIZE = 5;
 
 for (let i = 0; i < missing.length; i += BATCH_SIZE) {
 const batch = missing.slice(i, i + BATCH_SIZE);
 
 await Promise.all(batch.map(async (product) => {
 try {
 const vector = await localBrain.embed(product.name);
 if (vector) {
 await db.products.update(product.barcode, { 
 embedding: vector,
 // Marcamos como 'edit' para sincronizar este aprendizaje a la nube después
 syncStatus: product.syncStatus === 'synced' ? 'edit' : product.syncStatus 
 });
 successCount++;
 }
 } catch (e) {
 logger.error('VectorService', `Error en producto ${product.barcode}`, e instanceof Error ? e.message : String(e));
 }
 }));

 processed += batch.length;
 if (onProgress) onProgress(Math.min(processed, total), total);
 
 // Pausa técnica para liberar el hilo principal de JS y que la barra de progreso se pinte
 await new Promise(r => setTimeout(r, 20));
 }

 return successCount;
 }
};

