
import { VisualGuide } from "../../types";

// Lazy loading de google genai
let genaiModule: { GoogleGenAI: any; Type: any } | null = null;

async function loadGenAI() {
  if (!genaiModule) {
    genaiModule = await import("@google/genai");
  }
  return genaiModule;
}

// Inicialización diferida para evitar errores si la API KEY no está lista al cargar el módulo
let aiInstance: any = null;

const getAI = async () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API de IA no configurada. Por favor, agrega GEMINI_API_KEY en los Secrets.");
    }
    const { GoogleGenAI } = await loadGenAI();
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

/**
 * MOTOR DE VISIÓN v1.0
 * Utiliza Gemini 3 Flash para extraer datos estructurados de guías físicas.
 */
export const visionService = {
  async processGuidePhoto(base64Image: string): Promise<Partial<VisualGuide>> {
    const { Type } = await loadGenAI();
    const ai = await getAI();
    
    // Limpiar el prefijo data:image/jpeg;base64, si existe
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        },
        {
          text: `Analiza esta fotografía de una guía de despacho industrial. 
          Extrae con precisión:
          1. El número de guía (Guide Number).
          2. El ID de la orden ERP relacionada.
          3. El listado de productos, incluyendo código de barras (si existe), nombre del producto y cantidad solicitada.
          
          Si el código de barras no es legible, intenta inferirlo o deja el campo vacío.
          Devuelve los datos estrictamente en el formato JSON solicitado.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            guideNumber: { type: Type.STRING, description: "Número identificador de la guía física" },
            erpOrderId: { type: Type.STRING, description: "ID de la orden ERP que agrupa las guías" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  barcode: { type: Type.STRING, description: "Código de barras o SKU del producto" },
                  name: { type: Type.STRING, description: "Descripción o nombre del producto" },
                  expectedQty: { type: Type.NUMBER, description: "Cantidad total a pickear según la guía" },
                },
                required: ["name", "expectedQty"],
              },
            },
          },
          required: ["guideNumber", "erpOrderId", "items"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("La IA no devolvió ninguna respuesta.");

    try {
      const result = JSON.parse(text);
      return {
        id: `guide_${Date.now()}`,
        guideNumber: result.guideNumber,
        erpOrderId: result.erpOrderId,
        items: result.items.map((item: any) => ({
          barcode: item.barcode || `SKU-${Math.random().toString(36).substr(2, 9)}`,
          name: item.name,
          expectedQty: item.expectedQty,
          pickedQty: 0,
          status: 'pending'
        })),
        status: 'active',
        createdAt: Date.now(),
      };
    } catch (e) {
      console.error("Error parsing vision response:", e, text);
      throw new Error("Error al interpretar los datos de la guía. Por favor, intenta con una foto más clara.");
    }
  }
};

