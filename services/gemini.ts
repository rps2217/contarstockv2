
import { GoogleGenAI } from "@google/genai";
import { ConsolidatedItem } from "../types";

export const analyzeConsolidation = async (
  erpOrder: string,
  logisticsLabel: string,
  items: ConsolidatedItem[]
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const inventorySummary = items.slice(0, 100).map(i => 
        `- ${i.productName} (SKU: ${i.barcode}): ${i.totalQuantity} u.`
    ).join('\n');

    const prompt = `
      Analiza esta consolidación logística:
      Orden ERP: "${erpOrder}"
      Bulto: ${logisticsLabel}
      Items:
      ${inventorySummary}

      Genera un reporte ejecutivo en Markdown sobre la calidad del conteo y posibles errores de picking.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    return response.text || "No se pudo generar el análisis.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return "Error al conectar con la IA.";
  }
};
