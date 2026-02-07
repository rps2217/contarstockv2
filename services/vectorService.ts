
import { GoogleGenAI, Type } from "@google/genai";
import { db } from "../db";

export const VectorService = {
    /**
     * Genera una firma numérica (embedding) para un nombre de producto.
     * Utiliza un vector de 32 dimensiones para balancear precisión y velocidad offline.
     */
    generateEmbedding: async (text: string): Promise<number[] | null> => {
        if (!navigator.onLine || !process.env.API_KEY || !text) return null;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Genera un vector JSON de 32 números que represente semánticamente este producto: "${text}". Responde solo el array.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER }
                    }
                }
            });

            const vector = JSON.parse(response.text || '[]');
            return Array.isArray(vector) && vector.length > 0 ? vector : null;
        } catch (e) {
            console.warn("[VectorService] Error al generar firma:", text, e);
            return null;
        }
    },

    /**
     * Procesa productos del catálogo que aún no tienen firma semántica.
     * Incluye lógica de Circuit Breaker para detenerse si hay demasiados errores.
     */
    vectorizeMissingProducts: async (onProgress?: (count: number, total: number) => void) => {
        if (!navigator.onLine) throw new Error("Se requiere internet.");

        const missing = await db.products.filter(p => !p.embedding).toArray();
        const total = missing.length;
        if (total === 0) return 0;

        let processed = 0;
        let successCount = 0;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 5;

        for (const product of missing) {
            // Circuit Breaker: Si falla muchas veces seguidas, abortar para no bloquear la UI
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.error("Vectorización abortada: Demasiados errores consecutivos.");
                break;
            }

            try {
                const vector = await VectorService.generateEmbedding(product.name);
                
                if (vector) {
                    await db.products.update(product.barcode, { embedding: vector });
                    successCount++;
                    consecutiveErrors = 0; // Reset error counter on success
                } else {
                    consecutiveErrors++;
                }
            } catch (e) {
                consecutiveErrors++;
            } finally {
                processed++;
                if (onProgress) onProgress(processed, total);
                
                // Throttle optimizado: 50ms es suficiente para Flash 2.0/3.0
                await new Promise(r => setTimeout(r, 50));
            }
        }
        return successCount;
    }
};
