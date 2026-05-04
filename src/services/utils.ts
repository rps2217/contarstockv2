import JSZip from "jszip";

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
    .replace(/[^A-Z0-9]/g, ""); // Deja solo letras y números (Unificado)
};

export const normalizeSku = (val: string): string => sanitizeBarcode(val);

/**
 * NORMALIZADOR DE IDENTIDAD LOGÍSTICA (RUT/ID)
 * Remueve ABSOLUTAMENTE TODO lo que no sea letra o número.
 * Garantiza que "12.345.678-9" sea igual a "123456789".
 */
export const normalizeIdentity = (val: string | undefined | null): string => {
  if (!val) return "";
  return String(val).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

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
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const compressData = async (data: any): Promise<string> => {
  const zip = new JSZip();
  zip.file("payload.json", JSON.stringify(data));
  return await zip.generateAsync({
    type: "base64",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
};

export const generateSessionSignature = (
  erp: string,
  label: string,
): string => {
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${norm(erp)}_${norm(label || "GENERAL")}`;
};

/**
 * COMPRESOR DE IMÁGENES v2.0 (Punto 6: Rendimiento)
 * Reduce drásticamente el tamaño de las fotos de etiquetas antes de guardarlas en IndexedDB.
 * Optimiza de ~5MB a ~80KB manteniendo legibilidad básica de la etiqueta.
 */
export const compressImage = (
  base64: string,
  maxWidth = 600,
  quality = 0.6,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx)
        return reject(new Error("No se pudo obtener el contexto del canvas"));

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = (e) => reject(e);
  });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(value);
};

// Forced GitHub sync
