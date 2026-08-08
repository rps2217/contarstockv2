import JSZip from 'jszip';
import { normalizeSku, sanitizeBarcode, normalizeIdentity, normalizeHeader } from '@/lib/normalize';

// Re-exportar funciones compartidas para compatibilidad
export {
  formatCurrency,
  formatNumber,
  parseNumber,
  normalizeSku as normalizeSkuBase,
} from '@/shared/utils/common';

/**
 * Format error message
 */
export const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
};

// Re-exportar desde lib/normalize para mantener compatibilidad
export { normalizeSku, sanitizeBarcode, normalizeIdentity, normalizeHeader };

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const compressData = async (data: unknown): Promise<string> => {
  const zip = new JSZip();
  zip.file('payload.json', JSON.stringify(data));
  return await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
};

export const generateSessionSignature = (erp: string, label: string): string => {
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${norm(erp)}_${norm(label || 'GENERAL')}`;
};

/**
 * COMPRESOR DE IMÁGENES v2.0 (Punto 6: Rendimiento)
 * Reduce drásticamente el tamaño de las fotos de etiquetas antes de guardarlas en IndexedDB.
 * Optimiza de ~5MB a ~80KB manteniendo legibilidad básica de la etiqueta.
 */
export const compressImage = (base64: string, maxWidth = 600, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No se pudo obtener el contexto del canvas'));

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = e => reject(e);
  });
};
