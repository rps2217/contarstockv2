/**
 * ShareService - Servicio para compartir registros y exportar datos
 * 
 * Soporta: CSV, JSON, Web Share API
 */

import { db } from '../db';
import { CountingSession as Session, ScanRecord as Scan, Product } from '../types';

export type ExportFormat = 'csv' | 'json' | 'clipboard';
export type ShareMethod = 'web-share' | 'download' | 'clipboard' | 'email';

interface ShareOptions {
  format?: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  title?: string;
  text?: string;
}

// Generar CSV desde array de objetos
const generateCSV = <T extends Record<string, any>>(
  data: T[],
  headers?: Record<string, string>
): string => {
  if (data.length === 0) return '';
  
  const keys = Object.keys(data[0]);
  const headerRow = headers
    ? keys.map(k => headers[k] || k).join(',')
    : keys.join(',');
  
  const rows = data.map(item =>
    keys.map(k => {
      const value = item[k];
      // Escapar comillas y envolver en comillas si contiene coma
      const strValue = value === null || value === undefined ? '' : String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  );
  
  return [headerRow, ...rows].join('\n');
};

// Generar JSON
const generateJSON = <T>(data: T[]): string => {
  return JSON.stringify(data, null, 2);
};

// Descargar archivo
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Copiar al portapapeles
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para navegadores antiguos
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
};

// Share usando Web Share API
const webShare = async (
  data: { title?: string; text?: string; files?: File[] }
): Promise<boolean> => {
  if (!navigator.share) return false;
  
  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      // Usuario canceló
      return false;
    }
    throw error;
  }
};

export const ShareService = {
  // Exportar sesión con todos sus scans
  async exportSession(sessionId: string, options: ShareOptions = {}): Promise<void> {
    const { format = 'csv', filename, title = 'Sesión' } = options;
    
    // Obtener sesión
    const session = await db.sessions.get(sessionId);
    if (!session) throw new Error('Sesión no encontrada');
    
    // Obtener scans asociados
    const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
    
    // Obtener productos relacionados
    const barcodes = scans.map(s => s.barcode);
    const products = await db.products.where('barcode').anyOf(barcodes).toArray();
    const productMap = new Map(products.map(p => [p.barcode, p]));
    
    // Enriquecer scans con info de producto
    const enrichedScans = scans.map(scan => {
      const product = productMap.get(scan.barcode);
      return {
        ...scan,
        productName: product?.name || scan.barcode,
        category: product?.category || '',
        location: product?.location || '',
      };
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `${title.toLowerCase().replace(/\s+/g, '-')}-${sessionId.slice(0, 8)}-${timestamp}`;
    
    if (format === 'json') {
      const content = JSON.stringify({ session, scans: enrichedScans }, null, 2);
      downloadFile(content, `${filename || defaultFilename}.json`, 'application/json');
    } else {
      const headers = {
        barcode: 'Código',
        productName: 'Producto',
        quantity: 'Cantidad',
        category: 'Categoría',
        location: 'Ubicación',
        timestamp: 'Fecha/Hora',
        syncStatus: 'Estado Sync',
      };
      const csv = generateCSV(enrichedScans, headers);
      downloadFile(csv, `${filename || defaultFilename}.csv`, 'text/csv');
    }
  },

  // Compartir sesión via Web Share
  async shareSession(sessionId: string): Promise<boolean> {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new Error('Sesión no encontrada');
    
    const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
    
    // Generar CSV
    const headers = {
      barcode: 'Código',
      quantity: 'Cantidad',
      timestamp: 'Fecha/Hora',
    };
    const csv = generateCSV(scans, headers);
    
    // Crear archivo
    const blob = new Blob([csv], { type: 'text/csv' });
    const file = new File([blob], `sesion-${sessionId.slice(0, 8)}.csv`, { type: 'text/csv' });
    
    const title = `Sesión ${sessionId.slice(0, 8)}`;
    const text = `Resumen de conteo: ${scans.length} productos escaneados`;
    
    // Intentar Web Share
    const shared = await webShare({ title, text, files: [file] });
    
    if (!shared) {
      // Fallback: descargar
      downloadFile(csv, `sesion-${sessionId.slice(0, 8)}.csv`, 'text/csv');
      return true;
    }
    
    return true;
  },

  // Exportar productos
  async exportProducts(options: ShareOptions = {}): Promise<void> {
    const { format = 'csv', filename } = options;
    
    const products = await db.products.toArray();
    
    if (format === 'json') {
      const content = JSON.stringify(products, null, 2);
      downloadFile(content, `${filename || 'productos'}.json`, 'application/json');
    } else {
      const headers = {
        barcode: 'Código',
        name: 'Nombre',
        category: 'Categoría',
        stock: 'Stock',
        minStock: 'Stock Mínimo',
        location: 'Ubicación',
        updatedAt: 'Última Actualización',
      };
      const csv = generateCSV(products, headers);
      downloadFile(csv, `${filename || 'productos'}.csv`, 'text/csv');
    }
  },

  // Copiar producto al portapapeles
  async copyProductToClipboard(barcode: string): Promise<boolean> {
    const product = await db.products.get(barcode);
    if (!product) throw new Error('Producto no encontrado');
    
    const text = `${product.name} (${barcode})\nStock: ${product.stock}\nUbicación: ${product.location || 'N/A'}`;
    return copyToClipboard(text);
  },

  // Copiar resumen de sesión al portapapeles
  async copySessionSummary(sessionId: string): Promise<boolean> {
    const session = await db.sessions.get(sessionId);
    if (!session) throw new Error('Sesión no encontrada');
    
    const scans = await db.scans.where('sessionId').equals(sessionId).toArray();
    
    const totalItems = scans.reduce((sum, s) => sum + s.quantity, 0);
    const uniqueProducts = new Set(scans.map(s => s.barcode)).size;
    
    const summary = `
📊 RESUMEN DE SESIÓN
━━━━━━━━━━━━━━━━━━━━
ID: ${sessionId.slice(0, 8)}
Fecha: ${new Date(session.createdAt).toLocaleString('es-ES')}
━━━━━━━━━━━━━━━━━━━━
📦 Productos únicos: ${uniqueProducts}
📱 Total items contados: ${totalItems}
━━━━━━━━━━━━━━━━━━━━
    `.trim();
    
    return copyToClipboard(summary);
  },

  // Compartir usando método específico
  async share(
    content: string,
    method: ShareMethod,
    options: { filename?: string; mimeType?: string; title?: string; text?: string } = {}
  ): Promise<boolean> {
    const { filename = 'export', mimeType = 'text/plain', title, text } = options;
    
    switch (method) {
      case 'web-share':
        try {
          const file = new File([content], `${filename}.txt`, { type: mimeType });
          return await webShare({ title, text, files: [file] });
        } catch {
          // Fallback a download
          downloadFile(content, `${filename}.txt`, mimeType);
          return true;
        }
        
      case 'download':
        downloadFile(content, `${filename}.txt`, mimeType);
        return true;
        
      case 'clipboard':
        return await copyToClipboard(content);
        
      case 'email':
        const mailtoLink = `mailto:?subject=${encodeURIComponent(title || filename)}&body=${encodeURIComponent(text || content)}`;
        window.open(mailtoLink, '_blank');
        return true;
        
      default:
        return false;
    }
  },

  // Verificar si Web Share está disponible
  isWebShareAvailable(): boolean {
    return !!navigator.share;
  },

  // Verificar si Clipboard API está disponible
  isClipboardAvailable(): boolean {
    return !!navigator.clipboard;
  },
};

export default ShareService;
