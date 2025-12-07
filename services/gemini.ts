
import { GoogleGenAI } from "@google/genai";
import { ConsolidatedItem } from "../types";

// Initialize the client. The API key is assumed to be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeConsolidation = async (
  erpOrder: string,
  logisticsLabel: string,
  items: ConsolidatedItem[]
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Clave API no configurada. Por favor configure process.env.API_KEY para usar funciones de IA.";
  }

  const inventorySummary = items.map(i => `- ${i.productName} (ID: ${i.barcode}): ${i.totalQuantity} unidades`).join('\n');

  const prompt = `
    Analiza la siguiente consolidación de inventario para la Orden ERP "${erpOrder}" (Etiqueta Logística: ${logisticsLabel}).
    
    Datos del Inventario:
    ${inventorySummary}

    Por favor, proporciona un informe resumen conciso que incluya:
    1. Número total de SKUs (Unidades de Mantenimiento de Stock) distintos.
    2. Total de artículos contados.
    3. Cualquier observación sobre la mezcla de artículos (por ejemplo, si está muy cargado hacia una categoría si es evidente por los nombres).
    4. Una declaración de confirmación profesional adecuada para un manifiesto logístico.
    
    Formatea la respuesta en Markdown limpio y usa español profesional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error comunicándose con el servicio de IA.";
  }
};
