
import { GoogleGenAI, Type } from "@google/genai";
import { ConsolidatedItem } from "../types";

export const detectCountAnomalies = async (item: ConsolidatedItem): Promise<{ isAnomaly: boolean, message: string } | null> => {
 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
 
 try {
 const response = await ai.models.generateContent({
 model: "gemini-3-flash-preview",
 contents: `Analiza este registro de inventario: SKU ${item.barcode}, Nombre: ${item.productName}, Cantidad Contada: ${item.totalQuantity}, Meta Esperada: ${item.expectedQuantity || 'N/A'}. 
 ¿Parece un error humano (ej. exceso masivo o cantidad inusual)? Responde en JSON.`,
 config: {
 responseMimeType: "application/json",
 responseSchema: {
 type: Type.OBJECT,
 properties: {
 isAnomaly: { type: Type.BOOLEAN },
 message: { type: Type.STRING, description: "Breve advertencia para el operario" }
 },
 required: ["isAnomaly", "message"]
 }
 }
 });

 const text = response.text;
 return text ? JSON.parse(text) : null;
 } catch (e) {
 return null;
 }
};
