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

export const processLogisticsDocument = async (imageBase64: string, mimeType: string = "image/jpeg"): Promise<any> => {
  try {
    const ai = getAI();
    if (!ai) throw new Error("API de IA no configurada");
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: `INSTRUCCIONES CRÍTICAS PARA EXTRACCIÓN DE DOCUMENTOS LOGÍSTICOS:
            Analiza esta imagen de una FACTURA o GUÍA DE DESPACHO.
            
            1. IDENTIFICACIÓN: Determina si es "factura" o "guia".
            2. CABECERA: Extrae número de documento, fecha, orden de compra, nota de pedido y GUÍA INTERNA (Internal Guide).
            3. TABLA DE PRODUCTOS: Extrae cada fila de la tabla.
               - CODIGOS: El código alfanumérico del producto.
               - NOMBRE: Descripción del producto.
               - LOTE: El número de lote (batch).
               - VENCIMIENTO: La fecha de vencimiento (expiry).
               - CANTIDAD: El número entero de unidades.
            4. IMPORTANTE: Ignora cualquier marca hecha a mano (lapicero, tickets, checkmarks). Extrae solo la información impresa original.
            5. FORMATO: Responde estrictamente en JSON.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentType: { type: Type.STRING, enum: ["factura", "guia"] },
            documentNumber: { type: Type.STRING },
            date: { type: Type.STRING },
            purchaseOrder: { type: Type.STRING },
            orderNote: { type: Type.STRING },
            internalGuide: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  barcode: { type: Type.STRING },
                  name: { type: Type.STRING },
                  batch: { type: Type.STRING },
                  expiry: { type: Type.STRING },
                  quantity: { type: Type.NUMBER }
                },
                required: ["barcode", "name", "quantity"]
              }
            }
          },
          required: ["documentType", "documentNumber", "items"]
        }
      }
    });

    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error: any) {
    console.error("Logistics Document Processing Error:", error);
    throw new Error(`Error de IA: ${error.message || "Error desconocido"}`);
  }
};

export const parseGuidePDF = async (fileBase64: string, mimeType: string = "application/pdf"): Promise<any> => {
  try {
    const ai = getAI();
    if (!ai) throw new Error("API de IA no configurada");
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: fileBase64, mimeType } },
          { text: `INSTRUCCIONES CRÍTICAS PARA PROCESAMIENTO LOGÍSTICO:
            Analiza esta imagen (que puede estar procesada en alto contraste para mejorar legibilidad) o PDF de un documento de transporte.
            
            1. IDENTIFICACIÓN DE ORDEN: Busca el número de folio, número de guía o pedido ERP.
            2. EXTRACCIÓN DE TABLA: Extrae SKU/Barcode, Descripción y Cantidad.
            3. FILTRADO: Ignora logotipos y datos de empresa.` }
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
