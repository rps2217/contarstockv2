
import { GoogleGenAI } from "@google/genai";
import { db } from "../db";

/**
 * Analiza el patrón de escaneo actual para precargar datos de productos probables.
 */
export const predictNextSkus = async (lastBarcodes: string[]): Promise<string[]> => {
    if (lastBarcodes.length < 3) return [];

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            Dada esta secuencia de escaneos de inventario: [${lastBarcodes.join(', ')}]
            ¿Cuál es la probabilidad de los siguientes 3 SKUs? 
            Responde solo con los códigos en formato JSON array.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const text = response.text;
        return text ? JSON.parse(text) : [];
    } catch {
        return [];
    }
};
