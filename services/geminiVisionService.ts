
import { GoogleGenAI, Type } from "@google/genai";
import { ConsolidatedItem } from "../types";

/**
 * EXTRACTOR PHARMA OCR
 * Analiza una imagen de una caja de medicamento y extrae Lote y Fecha.
 */
export const extractPharmaData = async (imageBase64: string): Promise<{ batch: string, mm: number, yyyy: number } | null> => {
 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
 
 try {
 const response = await ai.models.generateContent({
 model: "gemini-3-flash-preview",
 contents: {
 parts: [
 { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
 { text: `Analiza la imagen de la caja. Extrae el número de LOTE (Batch/Lot) y la FECHA DE VENCIMIENTO (Expiry). 
 Responde estrictamente en JSON.` }
 ]
 },
 config: {
 responseMimeType: "application/json",
 responseSchema: {
 type: Type.OBJECT,
 properties: {
 batch: { type: Type.STRING, description: "Número de lote detectado" },
 mm: { type: Type.NUMBER, description: "Mes de vencimiento (1-12)" },
 yyyy: { type: Type.NUMBER, description: "Año de vencimiento (4 dígitos)" }
 },
 required: ["batch", "mm", "yyyy"]
 }
 }
 });

 const text = response.text;
 return text ? JSON.parse(text) : null;
 } catch (error) {
 console.error("Pharma OCR Error:", error);
 return null;
 }
};

/**
 * AUDITOR VISUAL IA
 * Compara la carga física real (vía foto) contra el conteo del sistema.
 */
export const auditWithVision = async (imageBase64: string, currentItems: ConsolidatedItem[]): Promise<{ summary: string, estimatedItems: { barcode: string, name: string, qty: number }[] } | null> => {
 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
 
 const inventorySummary = currentItems.map(i => 
 `- SKU: ${i.barcode} | ${i.productName} | Contado: ${i.totalQuantity}`
 ).join('\n');

 try {
 const response = await ai.models.generateContent({
 model: "gemini-3-pro-preview",
 contents: {
 parts: [
 { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
 { text: `ROL: Auditor Logístico.
 TAREA: Compara la foto con los datos registrados.
 DATOS REGISTRADOS:
 ${inventorySummary}
 
 REQUERIMIENTO:
 Identifica discrepancias visuales. Si ves productos no registrados o cantidades que no cuadran, repórtalo.` }
 ]
 },
 config: {
 responseMimeType: "application/json",
 responseSchema: {
 type: Type.OBJECT,
 properties: {
 summary: { type: Type.STRING, description: "Resumen del veredicto de auditoría" },
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

 const text = response.text;
 return text ? JSON.parse(text) : null;
 } catch (error: any) {
 console.error("Vision Audit Error:", error);
 throw new Error("Fallo en inspección visual de IA.");
 }
};
