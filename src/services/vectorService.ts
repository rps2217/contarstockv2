
import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../db";
import { Product } from "../types";

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
        console.log("[VectorService] >>> INICIANDO ANÁLISIS DE BASE DE DATOS...");
        
        if (!navigator.onLine) throw new Error("Sin conexión a internet");
        if (!process.env.API_KEY) {
            console.error("[VectorService] CRÍTICO: No se detecta API_KEY de Gemini.");
            throw new Error("API Key no configurada");
        }

        const allProducts = await db.products.toArray();
        console.log(`[VectorService] Total productos en local: ${allProducts.length}`);

        // Diagnóstico de los primeros 3 productos
        if (allProducts.length > 0) {
            console.log("[VectorService] Diagnóstico (Primeros 3):", allProducts.slice(0, 3).map(p => ({
                sku: p.barcode,
                name: p.name,
                hasEmbedding: !!p.embedding,
                embeddingType: typeof p.embedding,
                embeddingLength: Array.isArray(p.embedding) ? p.embedding.length : 'N/A'
            })));
        }

        const missing = allProducts.filter(p => VectorService.needsEmbedding(p));
        const total = missing.length;

        console.log(`[VectorService] Resultado del filtro: ${total} productos pendientes.`);

        if (total === 0) {
            console.warn("[VectorService] No hay nada que procesar. ¿Quizás ya tienen firmas?");
            return 0;
        }

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
                // Pausa para evitar Rate Limit (429)
                if (processed > 0 && processed % 5 === 0) {
                    await new Promise(r => setTimeout(r, 1200));
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
                    console.warn(`[VectorService] Gemini devolvió null para: ${product.name}`);
                }
            } catch (e) {
                consecutiveErrors++;
                console.error(`[VectorService] Error procesando ${product.barcode}:`, e);
            } finally {
                processed++;
                if (onProgress) onProgress(processed, total);
            }
        }

        console.log(`[VectorService] PROCESO FINALIZADO. Exitosos: ${successCount}`);
        return successCount;
    }
};
