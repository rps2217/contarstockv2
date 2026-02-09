
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

            let textResponse = response.text;
            if (!textResponse) return null;

            // Limpieza robusta de Markdown por si el modelo ignora responseMimeType
            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            const vector = JSON.parse(textResponse);
            return Array.isArray(vector) && vector.length > 0 ? vector : null;
        } catch (e) {
            console.warn("[VectorService] Error en API Gemini para:", text, e);
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
        const missing = allProducts.filter(p => VectorService.needsEmbedding(p));
        const total = missing.length;

        console.log(`[VectorService] Pendientes de vectorización: ${total}`);

        if (total === 0) return 0;

        let processed = 0;
        let successCount = 0;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 5;
        let lastError: any = null;

        for (const product of missing) {
            // Circuit Breaker
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                const msg = `Vectorización abortada: Demasiados errores consecutivos. Último error: ${lastError?.message || 'Desconocido'}`;
                console.error(msg);
                throw new Error(msg); // Lanzamos error para que la UI lo muestre
            }

            try {
                // Rate Limit Throttling: Pausa incremental
                // Si hubo errores recientes, pausamos más tiempo (Backoff)
                const delay = consecutiveErrors > 0 ? 2000 : (processed > 0 && processed % 5 === 0 ? 1200 : 100);
                await new Promise(r => setTimeout(r, delay));

                const vector = await VectorService.generateEmbedding(product.name);
                
                if (vector) {
                    await db.products.update(product.barcode, { 
                        embedding: vector,
                        syncStatus: product.syncStatus === 'synced' ? 'edit' : product.syncStatus 
                    });
                    successCount++;
                    consecutiveErrors = 0;
                    lastError = null;
                } else {
                    consecutiveErrors++;
                    lastError = new Error("Modelo retornó vector vacío o inválido");
                    console.warn(`[VectorService] Fallo silencioso para: ${product.name}`);
                }
            } catch (e: any) {
                consecutiveErrors++;
                lastError = e;
                console.error(`[VectorService] Excepción procesando ${product.barcode}:`, e);
            } finally {
                processed++;
                if (onProgress) onProgress(processed, total);
            }
        }

        console.log(`[VectorService] PROCESO FINALIZADO. Exitosos: ${successCount}`);
        return successCount;
    }
};
