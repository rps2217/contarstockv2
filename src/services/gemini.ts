
import { GoogleGenAI } from "@google/genai";
import { ConsolidatedItem } from "../types";

export const analyzeConsolidation = async (
 erpOrder: string,
 logisticsLabel: string,
 items: ConsolidatedItem[]
): Promise<string> => {
 try {
 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
 
 // Serialización optimizada para contexto de IA
 const inventorySummary = items.slice(0, 150).map(i => 
 `- SKU: ${i.barcode} | ${i.productName} | Cant: ${i.totalQuantity} | Vence: ${i.mm || 'N/A'}/${i.yyyy || 'N/A'} ${i.isIncident ? '(FRC)' : ''}`
 ).join('\n');

 const prompt = `
 ROL: Auditor Logístico Senior.
 TAREA: Analizar consolidación de inventario físico.
 DATOS:
 - Orden ERP de Referencia: "${erpOrder}"
 - ID de Bulto/Etiqueta: "${logisticsLabel}"
 - Items Detectados:
 ${inventorySummary}

 REQUERIMIENTO:
 Genera un informe técnico en Markdown que incluya:
 1. Resumen de integridad de carga.
 2. Alertas de caducidad si las hay.
 3. Identificación de potenciales discrepancias de picking.
 4. Recomendación inmediata.
 `;

 const response = await ai.models.generateContent({
 model: 'gemini-3-pro-preview',
 contents: prompt,
 });

 return response.text || "Análisis no disponible en este momento.";
 } catch (error: any) {
 console.error("Gemini Analysis Error:", error);
 return "Fallo en la conexión con el motor de inteligencia artificial.";
 }
};

// Forced GitHub sync
