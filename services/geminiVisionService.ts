import { GoogleGenAI, Type } from "@google/genai";
import { ConsolidatedItem } from "../types";

/**
 * EXTRACTOR PHARMA OCR
 * Analiza una imagen de una caja de medicamento y extrae Lote y Fecha.
 */
export const extractPharmaData = async (imageBase64: string): Promise<{ batch: string, mm: number, yyyy: number } | null> => {
    // Correct initialization using process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
                    { text: `Extrae de la imagen el número de LOTE (Batch/Lot) y la FECHA DE VENCIMIENTO (Expiry). 
                             Responde estrictamente en JSON con este formato: {"batch": "string", "mm": number, "yyyy": number}. 
                             Si no encuentras uno, usa null.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        batch: { type: Type.STRING },
                        mm: { type: Type.NUMBER },
                        yyyy: { type: Type.NUMBER }
                    }
                }
            }
        });

        // Using .text property directly
        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
    } catch (error) {
        console.error("Pharma OCR Error:", error);
        return null;
    }
};

/**
 * AUDITOR VISUAL IA (Fix: Added missing export auditWithVision)
 * Compara el inventario físico (vía foto) contra los registros locales.
 */
export const auditWithVision = async (imageBase64: string, currentItems: ConsolidatedItem[]): Promise<{ summary: string, estimatedItems: { barcode: string, name: string, qty: number }[] } | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const inventorySummary = currentItems.map(i => 
        `- SKU: ${i.barcode} | ${i.productName} | Cant: ${i.totalQuantity}`
    ).join('\n');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
                    { text: `ROL: Auditor de Inventario Visual.
                             TAREA: Compara la foto de la carga real contra el inventario registrado.
                             INVENTARIO REGISTRADO:
                             ${inventorySummary}
                             
                             REQUERIMIENTO:
                             1. Identifica los productos visibles en la foto.
                             2. Estima las cantidades visualmente.
                             3. Genera un resumen ejecutivo breve del veredicto.
                             
                             Responde estrictamente en JSON con este formato: 
                             {
                               "summary": "string",
                               "estimatedItems": [{"barcode": "string", "name": "string", "qty": number}]
                             }` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        estimatedItems: { 
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    barcode: { type: Type.STRING },
                                    name: { type: Type.STRING },
                                    qty: { type: Type.NUMBER }
                                },
                                required: ["barcode", "name", "qty"]
                            }
                        }
                    },
                    required: ["summary", "estimatedItems"]
                }
            }
        });

        // Using .text property directly
        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
    } catch (error: any) {
        console.error("Vision Audit Error:", error);
        throw new Error("Error en el análisis visual de IA: " + error.message);
    }
};