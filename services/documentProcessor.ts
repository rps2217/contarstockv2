import { GoogleGenAI, Type } from "@google/genai";

/**
 * PROCESADOR DE DOCUMENTOS LOGÍSTICOS
 * Utiliza IA para extraer datos de PDFs (Guías) y Fotos (Etiquetas ERP).
 */

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const parseGuidePDF = async (fileBase64: string): Promise<any> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType: "application/pdf" } },
          { text: `Analiza esta guía de despacho/recepción. Extrae:
            1. Número de Orden ERP o Documento.
            2. Lista de productos (SKU/Código, Nombre, Cantidad esperada).
            Devuelve un JSON estructurado.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            erpOrder: { type: Type.STRING },
            items: {
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
          },
          required: ["erpOrder", "items"]
        }
      }
    });

    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("No se pudo procesar el PDF.");
  }
};

export const extractERPFromPhoto = async (imageBase64: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
          { text: `Extrae el número de orden ERP, número de factura o referencia interna de esta etiqueta de envío. 
          Responde ÚNICAMENTE con el código alfanumérico, sin texto adicional, sin etiquetas ni formato. 
          Si no encuentras ningún número que parezca una orden o referencia, responde con "NOT_FOUND".` }
        ]
      }
    });
    const text = response.text ? response.text.trim() : '';
    if (text === 'NOT_FOUND' || !text) return null;
    return text;
  } catch (error) {
    console.error("ERP OCR Error:", error);
    return null;
  }
};
