
import { db } from "../db";
import { Product } from "../types";
import { localBrain } from "./localBrain";

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
     * Genera una firma numérica (embedding) usando el motor local del dispositivo.
     * NO consume API Key, NO consume datos (tras carga inicial), NO tiene Rate Limit.
     */
    generateEmbedding: async (text: string): Promise<number[] | null> => {
        return await localBrain.embed(text);
    },

    /**
     * Procesa productos que requieren entrenamiento.
     * Ahora es mucho más rápido porque no hay latencia de red.
     */
    vectorizeMissingProducts: async (onProgress?: (count: number, total: number) => void) => {
        // Inicializamos el cerebro primero para cargar el modelo en memoria
        console.log("[VectorService] Calentando motores neurales...");
        await localBrain.init();

        const allProducts = await db.products.toArray();
        const missing = allProducts.filter(p => VectorService.needsEmbedding(p));
        const total = missing.length;

        console.log(`[VectorService] Pendientes de vectorización local: ${total}`);

        if (total === 0) return 0;

        let processed = 0;
        let successCount = 0;

        // Procesamiento en lotes para no congelar la UI
        const BATCH_SIZE = 10;
        
        for (let i = 0; i < missing.length; i += BATCH_SIZE) {
            const batch = missing.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (product) => {
                try {
                    const vector = await localBrain.embed(product.name);
                    if (vector) {
                        await db.products.update(product.barcode, { 
                            embedding: vector,
                            // Marcamos como 'edit' para que el SyncManager suba este vector a la nube
                            // y otros dispositivos puedan aprovechar este cálculo.
                            syncStatus: product.syncStatus === 'synced' ? 'edit' : product.syncStatus 
                        });
                        successCount++;
                    }
                } catch (e) {
                    console.error(`Error en producto ${product.barcode}`, e);
                }
            }));

            processed += batch.length;
            if (onProgress) onProgress(Math.min(processed, total), total);
            
            // Pequeña pausa para dejar respirar al Event Loop de la UI
            await new Promise(r => setTimeout(r, 10));
        }

        console.log(`[VectorService] PROCESO FINALIZADO. Exitosos: ${successCount}/${total}`);
        return successCount;
    }
};
