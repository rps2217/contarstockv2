
import { GoogleGenAI } from "@google/genai";
import { ConsolidatedItem } from "../types";

// Initialize the client strictly following environment variable rules
// We create the instance lazily or safely to ensure process.env is ready
const getAiClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API Key not found in environment variables");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeConsolidation = async (
  erpOrder: string,
  logisticsLabel: string,
  items: ConsolidatedItem[]
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Summary of the inventory for the prompt
    // Limit to top 50 items to avoid token limits if the list is huge, 
    // or format concisely.
    const inventorySummary = items.slice(0, 100).map(i => 
        `- ${i.productName} (SKU: ${i.barcode}): ${i.totalQuantity} u.`
    ).join('\n');

    const prompt = `
      Actúa como un Analista Logístico Senior. Analiza la siguiente consolidación de inventario:
      
      CONTEXTO:
      - Orden ERP: "${erpOrder}"
      - Etiqueta Logística (Bulto): ${logisticsLabel}
      
      DATOS DEL INVENTARIO (Muestra):
      ${inventorySummary}
      ${items.length > 100 ? `... y otros ${items.length - 100} items más.` : ''}

      TAREA:
      Genera un reporte ejecutivo en Markdown profesional (español) que incluya:
      1. **Resumen Ejecutivo**: Total de SKUs y unidades totales.
      2. **Análisis de Mezcla**: Observaciones sobre el tipo de productos (ej. "Predominan lácteos", "Mezcla heterogénea de abarrotes"). Detecta patrones.
      3. **Alertas de Calidad**: Si ves items con pocas unidades (1 o 2) que podrían ser merma o errores de picking.
      4. **Certificación**: Una frase formal de cierre indicando que el conteo ha sido procesado digitalmente.

      Mantén el tono técnico, conciso y útil para un jefe de bodega.
    `;

    // Use gemini-3-pro-preview for advanced reasoning on logistics data
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    return response.text || "No se pudo generar el análisis.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("API Key")) {
        return "⚠️ Error de Configuración: Falta la API KEY de Gemini.";
    }
    return "El servicio de IA no está disponible en este momento.";
  }
};
