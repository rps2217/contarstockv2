
import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../db";

export const VectorService = {
    /**
     * Genera una firma numérica (embedding) para un nombre de producto.
     */
    generateEmbedding: async (text: string): Promise<number[] | null> => {
        if (!navigator.onLine || !process.env.API_KEY || !text) return null;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Genera un vector JSON de 32 números que represente semánticamente este producto: "${text}". Responde solo el array de números.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER }
                    }
                }
            });

            const textResponse = response.text;
            if (!textResponse) return null;

            const vector = JSON.parse(textResponse);
            return Array.isArray(vector) && vector.length > 0 ? vector : null;
        } catch (e) {
            console.error("[VectorService] Error en API Gemini:", text, e);
            return null;
        }
    },

    /**
     * Procesa productos que requieren entrenamiento.
     */
    vectorizeMissingProducts: async (onProgress?: (count: number, total: number) => void) => {
        if (!navigator.onLine) throw new Error("Sin conexión a internet");
        if (!process.env.API_KEY) {
            console.error("[VectorService] CRÍTICO: No se detecta API_KEY de Gemini en el entorno.");
            throw new Error("API Key no configurada");
        }

        // Mejora del filtro: Detectar undefined, null o arrays vacíos
        const allProducts = await db.products.toArray();
        const missing = allProducts.filter(p => 
            p.embedding === undefined || 
            p.embedding === null || 
            (Array.isArray(p.embedding) && p.embedding.length === 0)
        );

        const total = missing.length;
        console.log(`[VectorService] Iniciando entrenamiento. Pendientes: ${total} de un total de ${allProducts.length} productos.`);

        if (total === 0) return 0;

        let processed = 0;
        let successCount = 0;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 5;

        for (const product of missing) {
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.warn("[VectorService] Abortando por exceso de errores consecutivos.");
                break;
            }

            try {
                // Pequeña pausa para evitar Rate Limit (429) de la API gratuita
                if (processed > 0 && processed % 5 === 0) {
                    await new Promise(r => setTimeout(r, 1000));
                }

                const vector = await VectorService.generateEmbedding(product.name);
                
                if (vector) {
                    await db.products.update(product.barcode, { 
                        embedding: vector,
                        syncStatus: product.syncStatus === 'synced' ? 'edit' : product.syncStatus 
                    });
                    successCount++;
                    consecutiveErrors = 0;
                } else {
                    consecutiveErrors++;
                    console.warn(`[VectorService] No se pudo generar vector para: ${product.name}`);
                }
            } catch (e) {
                consecutiveErrors++;
                console.error(`[VectorService] Error procesando ${product.barcode}:`, e);
            } finally {
                processed++;
                if (onProgress) onProgress(processed, total);
            }
        }

        console.log(`[VectorService] Entrenamiento finalizado. Exitosos: ${successCount}, Procesados: ${processed}`);
        return successCount;
    }
};
