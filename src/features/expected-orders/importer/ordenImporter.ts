/**
 * ordenImporter - Servicio para importar órdenes esperadas desde CSV/texto
 * 
 * Extraído de useExpectedOrders para reducir complejidad y reutilizar lógica.
 */

import { normalizeSku } from '../../../services/utils';

export interface ColumnMappings {
  sku?: string;
  barcode?: string;
  quantity?: string;
  description?: string;
  unit?: string;
  location?: string;
}

// Tipo para filas raw del archivo
type RawRow = Record<string, string>;

// Tipo para item procesado
export interface ParsedItem {
  sku: string;
  barcode: string;
  quantity: number;
  description: string;
  unit: string;
  location: string;
  lineNumber: number;
}

// Resultado del parsing
export interface ParseResult {
  success: boolean;
  items: ParsedItem[];
  headers: string[];
  errors: string[];
  totalRows: number;
}

/**
 * Detecta el tipo de delimitador del contenido
 */
function detectDelimiter(content: string): ',' | '\t' {
  const firstLine = content.split('\n')[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
}

/**
 * Parsea contenido de archivo CSV o tab-delimited
 */
export async function parseFileContent(
  file: File
): Promise<{ headers: string[]; rows: RawRow[] }> {
  const content = await file.text();
  const delimiter = detectDelimiter(content);
  return parseDelimitedContent(content, delimiter);
}

/**
 * Función genérica para parsear contenido delimitado
 */
function parseDelimitedContent(
  content: string,
  delimiter: ',' | '\t'
): { headers: string[]; rows: RawRow[] } {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Parsear headers
  const headers = parseCSVLine(lines[0], delimiter);
  
  // Parsear filas
  const rows: RawRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row: RawRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return { headers, rows };
}

/**
 * Parsea una línea CSV/TSV manejando comillas
 */
function parseCSVLine(line: string, delimiter: ',' | '\t'): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parsea texto pegado (separado por saltos de línea y tabuladores)
 */
export function parsePastedText(text: string): { headers: string[]; rows: RawRow[] } {
  const lines = text.trim().split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  // Detectar delimitador
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  
  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  const rows: RawRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: RawRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return { headers, rows };
}

/**
 * Aplica mapeo de columnas a filas raw
 */
export function applyMappings(
  rows: RawRow[],
  mappings: ColumnMappings,
  headers: string[]
): ParsedItem[] {
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  
  // Obtener claves de mapeo únicas
  const mappingKeys = Object.values(mappings).filter(Boolean) as string[];
  
  rows.forEach((row, index) => {
    const lineNumber = index + 2; // +2 porque línea 1 es header, index empieza en 0
    
    // Buscar valores según mapeo
    const skuValue = mappings.sku ? row[mappings.sku] : '';
    const barcodeValue = mappings.barcode ? row[mappings.barcode] : '';
    const quantityValue = mappings.quantity ? row[mappings.quantity] : '';
    const descriptionValue = mappings.description ? row[mappings.description] : '';
    const unitValue = mappings.unit ? row[mappings.unit] : '';
    const locationValue = mappings.location ? row[mappings.location] : '';
    
    // Normalizar SKU/barcode
    const sku = normalizeSku(skuValue || barcodeValue || '');
    
    if (!sku) {
      errors.push(`Línea ${lineNumber}: SKU vacío`);
      return;
    }
    
    const quantity = parseQuantity(quantityValue);
    
    items.push({
      sku,
      barcode: barcodeValue || sku,
      quantity,
      description: descriptionValue || 'Sin descripción',
      unit: unitValue || 'UN',
      location: locationValue || 'GENERAL',
      lineNumber,
    });
  });
  
  return items;
}

/**
 * Parsea un valor de cantidad de forma robusta
 */
export function parseQuantity(value: string): number {
  if (!value) return 1;
  
  // Limpiar el valor
  let cleaned = value.toString().trim();
  
  // Remover caracteres no numéricos excepto punto y coma
  cleaned = cleaned.replace(/[^\d.,\-]/g, '');
  
  // Detectar formato (español vs inglés)
  const hasCommaDecimal = /^\d+,\d+$/.test(cleaned);
  const hasDotDecimal = /^\d+\.\d+$/.test(cleaned);
  
  if (hasCommaDecimal) {
    // Formato español: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasDotDecimal) {
    // Formato inglés: 1234.56 - OK
  } else {
    // Sin decimales: remover separadores de miles
    cleaned = cleaned.replace(/[.,](?=\d{3})/g, '');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 1 : Math.max(1, Math.round(num));
}

/**
 * Genera mapeo automático basado en headers
 */
export function autoDetectMappings(headers: string[]): ColumnMappings {
  const mappings: ColumnMappings = {};
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  // SKU
  const skuIndex = lowerHeaders.findIndex(h => 
    h.includes('sku') || h.includes('codigo') || h.includes('código') || h.includes('barcode') || h.includes('ean') || h.includes('upc')
  );
  if (skuIndex >= 0) mappings.sku = headers[skuIndex];
  
  // Barcode
  const barcodeIndex = lowerHeaders.findIndex(h => 
    (h.includes('barcode') || h.includes('ean') || h.includes('upc')) && h !== headers[skuIndex]
  );
  if (barcodeIndex >= 0) mappings.barcode = headers[barcodeIndex];
  
  // Quantity
  const qtyIndex = lowerHeaders.findIndex(h => 
    h.includes('cantidad') || h.includes('quantity') || h.includes('qty') || h.includes('cant') || h.includes('units')
  );
  if (qtyIndex >= 0) mappings.quantity = headers[qtyIndex];
  
  // Description
  const descIndex = lowerHeaders.findIndex(h => 
    h.includes('descripcion') || h.includes('description') || h.includes('producto') || h.includes('product') || h.includes('name')
  );
  if (descIndex >= 0) mappings.description = headers[descIndex];
  
  // Unit
  const unitIndex = lowerHeaders.findIndex(h => 
    h.includes('unidad') || h.includes('unit') || h.includes('umed')
  );
  if (unitIndex >= 0) mappings.unit = headers[unitIndex];
  
  // Location
  const locIndex = lowerHeaders.findIndex(h => 
    h.includes('ubicacion') || h.includes('location') || h.includes('bodega') || h.includes('almacen')
  );
  if (locIndex >= 0) mappings.location = headers[locIndex];
  
  return mappings;
}

/**
 * Valida mapeos
 */
export function validateMappings(
  mappings: ColumnMappings,
  headers: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!mappings.sku && !mappings.barcode) {
    errors.push('Debe mapear al menos SKU o Barcode');
  }
  
  if (mappings.sku && !headers.includes(mappings.sku)) {
    errors.push(`Columna "${mappings.sku}" no encontrada`);
  }
  
  if (mappings.barcode && !headers.includes(mappings.barcode)) {
    errors.push(`Columna "${mappings.barcode}" no encontrada`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Calcula estadísticas de preview
 */
export function calculatePreviewStats(items: ParsedItem[]): {
  totalItems: number;
  totalQuantity: number;
  uniqueSkus: number;
  itemsWithoutSku: number;
} {
  const uniqueSkus = new Set(items.map(i => i.sku)).size;
  const itemsWithoutSku = items.filter(i => !i.sku).length;
  
  return {
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    uniqueSkus,
    itemsWithoutSku,
  };
}
