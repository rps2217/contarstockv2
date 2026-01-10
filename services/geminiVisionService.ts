
import { GoogleGenAI, Type } from "@google/genai";
import { ConsolidatedItem } from "../types";

/**
 * Realiza un análisis visual de una fotografía de carga para estimar cantidades.
 */
export const auditWithVision = async (
    imageBase64: string,
    currentConsolidated: ConsolidatedItem[]
): Promise<{ 
    estimatedItems: { barcode: string, name: string, qty: number }[],
    summary: string 
}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const inventoryContext = currentConsolidated.map(i => 
        `SKU: ${i.barcode}, Nombre: ${i.productName}, Cantidad actual: ${i.totalQuantity}`
    ).join('\n');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
                    { text: `Actúa como un auditor de almacén experto. Analiza la fotografía adjunta. 
                             Tu misión es contar los objetos visibles y compararlos con el conteo manual actual:
                             
                             CONTEO MANUAL:
                             ${inventoryContext}
                             
                             REQUERIMIENTOS:
                             1. Identifica los productos en la foto.
                             2. Estima la cantidad de cada uno.
                             3. Si ves algo que no está en el conteo manual, identifícalo.
                             4. Responde en formato JSON con 'estimatedItems' (array de objetos con barcode, name, qty) y 'summary' (texto explicativo de discrepancias).` 
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
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
                        },
                        summary: { type: Type.STRING }
                    },
                    required: ["estimatedItems", "summary"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No se obtuvo respuesta de la IA.");
        return JSON.parse(text);
    } catch (error: any) {
        console.error("[VisionAudit] Error:", error);
        throw new Error("El análisis visual falló: " + error.message);
    }
};
