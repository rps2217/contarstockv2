
import JSZip from 'jszip';

/**
 * MOTOR DE IDENTIDAD LOGÍSTICA (DRY)
 * Única fuente de verdad para normalizar SKUs y Cabeceras en toda la app.
 */
export const sanitizeBarcode = (code: string): string => {
 if (!code) return "";
 return String(code)
 .trim()
 .toUpperCase()
 .replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, "")
 .replace(/[\s\.]+/g, "") // Remueve espacios y puntos
 .replace(/^0+/, ""); 
};

export const normalizeSku = (val: string): string => sanitizeBarcode(val);

/**
 * NORMALIZACIÓN DE CABECERAS EXCEL (Protocolo Industrial)
 * Elimina espacios, acentos, caracteres especiales y convierte a mayúsculas.
 * Esto hace que "Cód. Producto" y "COD_PRODUCTO" sean lo mismo para el motor.
 */
export const normalizeHeader = (h: string): string => 
 String(h || "")
 .trim()
 .toUpperCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
 .replace(/[^A-Z0-9]/g, ""); // Deja solo letras y números

export const generateUUID = (): string => {
 if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
 return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
 const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
 return v.toString(16);
 });
};

export const compressData = async (data: any): Promise<string> => {
 const zip = new JSZip();
 zip.file("payload.json", JSON.stringify(data));
 return await zip.generateAsync({ 
 type: "base64", 
 compression: "DEFLATE",
 compressionOptions: { level: 6 }
 });
};

export const generateSessionSignature = (erp: string, label: string): string => {
 const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
 return `${norm(erp)}_${norm(label || "GENERAL")}`;
};
