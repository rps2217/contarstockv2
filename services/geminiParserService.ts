
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

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const parts: any[] = [];
        for (const file of files) {
            const base64 = await fileToBase64(file);
            parts.push({ inlineData: { data: base64, mimeType: file.type } });
        }

        parts.push({ text: "Extrae productos de esta orden de compra." });

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

        return JSON.parse(response.text || "[]") as ExpectedItem[];
    } catch (error: any) {
        console.error("Gemini Error:", error);
        throw new Error("Fallo en el análisis del documento.");
    }
};
