
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
     * Genera una firma numérica (embedding) usando EXCLUSIVAMENTE el motor local.
     */
    generateEmbedding: async (text: string): Promise<number[] | null> => {
        return await localBrain.embed(text);
    },

    /**
     * Procesa productos que requieren entrenamiento.
     */
    vectorizeMissingProducts: async (onProgress?: (count: number, total: number) => void) => {
        await localBrain.init();

        const allProducts = await db.products.toArray();
        const missing = allProducts.filter(p => VectorService.needsEmbedding(p));
        const total = missing.length;

        if (total === 0) return 0;

        let processed = 0;
        let successCount = 0;

        const BATCH_SIZE = 5;
        
        for (let i = 0; i < missing.length; i += BATCH_SIZE) {
            const batch = missing.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (product) => {
                try {
                    const vector = await localBrain.embed(product.name);
                    if (vector) {
                        // CRITICO: Cambiamos syncStatus a 'edit' para que aparezca en el botón de nube
                        await db.products.update(product.barcode, { 
                            embedding: vector,
                            syncStatus: 'edit' 
                        });
                        successCount++;
                    }
                } catch (e) {
                    console.error(`Error en producto ${product.barcode}`, e);
                }
            }));

            processed += batch.length;
            if (onProgress) onProgress(Math.min(processed, total), total);
            await new Promise(r => setTimeout(r, 20));
        }

        return successCount;
    }
};
