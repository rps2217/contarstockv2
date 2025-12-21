
import { GoogleGenAI, Type } from "@google/genai";
import { ExpectedItem } from "../types";

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
    });
};

export const parseOrderDocument = async (files: File[]): Promise<ExpectedItem[]> => {
    if (files.length === 0) return [];

    // Inicialización estandarizada
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

        parts.push({ text: "Analiza este documento logístico. Extrae todos los productos incluyendo código de barras (SKU), nombre descriptivo y la cantidad solicitada (expectedQty)." });

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
                            barcode: { type: Type.STRING, description: "Código SKU o EAN" },
                            name: { type: Type.STRING, description: "Nombre del producto" },
                            expectedQty: { type: Type.NUMBER, description: "Cantidad total esperada" }
                        },
                        required: ["barcode", "name", "expectedQty"]
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("La IA no devolvió contenido.");
        
        return JSON.parse(text) as ExpectedItem[];
    } catch (error: any) {
        console.error("Gemini Parser Critical Failure:", error);
        throw new Error(`Error en análisis de documento: ${error.message}`);
    }
};
