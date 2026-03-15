import { GoogleGenAI, Type } from "@google/genai";

/**
 * PROCESADOR DE DOCUMENTOS LOGÍSTICOS
 * Utiliza IA para extraer datos de PDFs (Guías) y Fotos (Etiquetas ERP).
 */

let aiClient: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY no está configurada.");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

export const parseGuidePDF = async (fileBase64: string, mimeType: string = "application/pdf"): Promise<any> => {
  try {
    const ai = getAI();
    if (!ai) throw new Error("API de IA no configurada");
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType } },
          { text: `INSTRUCCIONES CRÍTICAS PARA PROCESAMIENTO LOGÍSTICO:
            Analiza esta imagen o PDF de un documento de transporte (Guía de Despacho, Factura o Packing List).
            
            1. IDENTIFICACIÓN DE ORDEN: Busca el número de folio, número de guía o pedido ERP. Suele estar en la parte superior derecha o precedido por "N°" o "Folio".
            2. EXTRACCIÓN DE TABLA: Ignora logotipos, direcciones de empresa, términos legales y totales finales. 
            3. FILTRADO DE DATOS: Solo extrae la tabla de productos. 
               - 'barcode': Debe ser el código SKU, EAN o Código de Producto.
               - 'name': Descripción breve del producto.
               - 'expectedQty': Cantidad numérica exacta.
            
            REGLAS DE SEGURIDAD:
            - Si un campo no es legible, usa "N/A".
            - No inventes datos.
            - Devuelve exclusivamente el JSON.` }
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

    const cleanJson = response.text ? response.text.replace(/```json\n?|```/g, "").trim() : null;
    return cleanJson ? JSON.parse(cleanJson) : null;
  } catch (error: any) {
    console.error("PDF Parsing Error:", error);
    const errorMessage = error.message || "Error desconocido";
    throw new Error(`Error de IA: ${errorMessage}`);
  }
};

export const extractERPFromPhoto = async (imageBase64: string): Promise<string | null> => {
  try {
    const ai = getAI();
    if (!ai) throw new Error("API de IA no configurada");

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
