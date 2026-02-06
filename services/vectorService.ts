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
     */
    vectorizeMissingProducts: async (onProgress?: (count: number, total: number) => void) => {
        if (!navigator.onLine) return 0;

        const missing = await db.products.filter(p => !p.embedding).toArray();
        if (missing.length === 0) return 0;

        let count = 0;
        for (const product of missing) {
            const vector = await VectorService.generateEmbedding(product.name);
            if (vector) {
                await db.products.update(product.barcode, { embedding: vector });
                count++;
                onProgress?.(count, missing.length);
            }
            // Throttle para evitar límites de rate
            await new Promise(r => setTimeout(r, 150));
        }
        return count;
    }
};