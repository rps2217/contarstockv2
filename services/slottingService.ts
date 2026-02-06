
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";
import { logger } from "./logger";

/**
 * MOTOR DE SLOTTING INTELIGENTE v1.0
 * Utiliza IA para organizar el almacén de forma lógica.
 */
export const predictIdealLocation = async (product: Product): Promise<string | null> => {
    if (!process.env.API_KEY || !product.name) return null;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
            ROL: Experto en Logística y Almacenamiento.
            TAREA: Sugerir una ubicación de inventario (Slot) para este producto.
            PRODUCTO: "${product.name}"
            CATEGORÍA: "${product.category || 'General'}"
            
            REQUERIMIENTO:
            Sigue un formato de nomenclatura industrial: [ZONA]-[PASILLO]-[ESTANTE]
            Ejemplos: PHARMA-04-B, FRIO-01-A, GENERAL-12-C.
            Responde solo con el código de ubicación en formato JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestion: { type: Type.STRING, description: "Código de ubicación sugerido" },
                        reason: { type: Type.STRING, description: "Breve justificación de la zona" }
                    },
                    required: ["suggestion"]
                }
            }
        });

        const result = JSON.parse(response.text || '{}');
        return result.suggestion || null;
    } catch (error) {
        logger.warn("SLOTTING_AI", "No se pudo obtener sugerencia de ubicación");
        return null;
    }
};
