
import { GoogleGenAI, Type } from "@google/genai";
import { ExpectedItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Convierte un File a base64
 */
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

export const parseOrderDocument = async (files: File[]): Promise<ExpectedItem[]> => {
    if (files.length === 0) return [];

    try {
        const parts: any[] = [];
        
        for (const file of files) {
            const base64 = await fileToBase64(file);
            parts.push({
                inlineData: {
                    data: base64,
                    mimeType: file.type
                }
            });
        }

        parts.push({
            text: `Analiza estos documentos de orden de compra/recepción. 
            Extrae la tabla de productos y devuelve ÚNICAMENTE un JSON array de objetos con las propiedades:
            - barcode: (string) código de barras o SKU.
            - name: (string) descripción del producto.
            - expectedQty: (number) cantidad solicitada/pendiente.
            
            Reglas:
            - Si el código tiene letras, mantenlas.
            - Limpia espacios innecesarios.
            - No devuelvas explicaciones, solo el JSON puro.`
        });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            barcode: { type: Type.STRING },
                            name: { type: Type.STRING },
                            expectedQty: { type: Type.NUMBER }
                        },
                        required: ["barcode", "name", "expectedQty"]
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("Gemini no devolvió resultados.");
        
        return JSON.parse(text) as ExpectedItem[];
    } catch (error: any) {
        console.error("Gemini Parsing Error:", error);
        throw new Error("No se pudo procesar el documento: " + error.message);
    }
};
