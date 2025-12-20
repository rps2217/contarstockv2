
import { GoogleGenAI, Type } from "@google/genai";
import { ExpectedItem } from "../types";

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

    // Instantiate with the API key directly from process.env.API_KEY
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

        parts.push({
            text: `Analiza estos documentos de orden de compra. Extrae la tabla de productos y devuelve un JSON array de objetos: barcode (string), name (string), expectedQty (number). ÚNICAMENTE devuelve el JSON.`
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
        if (!text) throw new Error("Sin respuesta del modelo.");
        return JSON.parse(text) as ExpectedItem[];
    } catch (error: any) {
        console.error("Gemini Error:", error);
        throw new Error("Error al procesar: " + error.message);
    }
};
