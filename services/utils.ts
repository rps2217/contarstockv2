
import JSZip from 'jszip';

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Formatea un SKU para visualización industrial: ABC-1234-XYZ
 */
export const chunkSku = (sku: string): string => {
    if (!sku) return "";
    return sku.match(/.{1,4}/g)?.join('-') || sku;
};

/**
 * Normalización reforzada: elimina caracteres no imprimibles y espacios ocultos
 */
export const sanitizeBarcode = (code: string): string => {
    if (!code) return "";
    return code.trim().toUpperCase()
        .replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, "");
};

export const formatLogDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
    return `${normalize(erp)}_${normalize(label || "GENERAL")}`;
};

export const normalizeKey = (val: string): string => sanitizeBarcode(val);
export const normalizeSku = (val: string): string => sanitizeBarcode(val);
