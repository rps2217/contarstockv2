
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
        if (!navigator.onLine) {
            console.warn("[VectorService] Offline. Saltando vectorización.");
            return null;
        }
        if (!process.env.API_KEY) {
            console.error("[VectorService] API_KEY no configurada.");
            return null;
        }
        if (!text || text.trim().length < 2) {
            console.warn("[VectorService] Texto muy corto para vectorizar:", text);
            return null;
        }

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
            if (!textResponse) {
                console.warn("[VectorService] Respuesta vacía del modelo.");
                return null;
            }

            // Limpieza robusta de Markdown
            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            let vector;
            try {
                vector = JSON.parse(textResponse);
            } catch (e) {
                console.error("[VectorService] Error parseando JSON:", textResponse);
                return null;
            }

            if (Array.isArray(vector) && vector.length > 0) {
                return vector;
            } else {
                console.warn("[VectorService] Formato de vector inválido:", vector);
                return null;
            }
        } catch (e: any) {
            // Logging detallado del error de API para diagnóstico
            const status = e.status || e.response?.status;
            const msg = e.message || 'Error desconocido';
            console.error(`[VectorService] API Error (${status}): ${msg} para producto "${text}"`);
            
            // Si es un error de cuota (429), lanzamos excepción para activar el backoff en el loop principal
            if (status === 429 || msg.includes('429') || msg.includes('Quota') || msg.includes('Resource has been exhausted')) {
                throw new Error("RATE_LIMIT");
            }
            return null;
        }
    },

    /**
     * Procesa productos que requieren entrenamiento.
     */
    vectorizeMissingProducts: async (onProgress?: (count: number, total: number) => void) => {
        console.log("[VectorService] >>> INICIANDO ANÁLISIS DE BASE DE DATOS...");
        
        if (!navigator.onLine) throw new Error("Sin conexión a internet");
        
        // Verificación visual de la API Key (segura)
        const key = process.env.API_KEY;
        if (!key || key.includes('T') || key.length < 10) {
            console.error("[VectorService] CRÍTICO: API Key corrupta o no válida.");
            throw new Error("API Key inválida. Verifique configuración.");
        }

        const allProducts = await db.products.toArray();
        const missing = allProducts.filter(p => VectorService.needsEmbedding(p));
        const total = missing.length;

        console.log(`[VectorService] Pendientes de vectorización: ${total}`);

        if (total === 0) return 0;

        let processed = 0;
        let successCount = 0;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 10; // Aumentado para mayor tolerancia
        let lastError: any = null;

        for (const product of missing) {
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                const msg = `Vectorización abortada: ${consecutiveErrors} errores consecutivos. Revise la consola para detalles.`;
                console.error(msg);
                throw new Error(msg);
            }

            try {
                // Backoff Exponencial ante errores
                let delay = 100;
                if (consecutiveErrors > 0) {
                    delay = Math.min(1000 * Math.pow(2, consecutiveErrors), 15000); // Max 15s espera
                    console.log(`[VectorService] Backoff activo: Esperando ${delay}ms...`);
                } else if (processed > 0 && processed % 10 === 0) {
                    delay = 1000; // Pausa de cortesía cada 10 items
                }
                
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
                    lastError = new Error("Vector nulo");
                }
            } catch (e: any) {
                consecutiveErrors++;
                lastError = e;
                if (e.message === "RATE_LIMIT") {
                    console.warn("[VectorService] Rate Limit detectado. Aumentando backoff.");
                    // Forzamos un delay extra si fue rate limit
                    await new Promise(r => setTimeout(r, 5000));
                } else {
                    console.error(`[VectorService] Excepción procesando ${product.barcode}:`, e);
                }
            } finally {
                processed++;
                if (onProgress) onProgress(processed, total);
            }
        }

        console.log(`[VectorService] PROCESO FINALIZADO. Exitosos: ${successCount}/${total}`);
        return successCount;
    }
};
