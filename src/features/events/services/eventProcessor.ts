/**
 * EventProcessor - Procesa y transforma datos de eventos
 * 
 * Extraído de useEventDatabase para reducir complejidad.
 */

import { normalizeSku } from '../../../services/utils';
import { Product } from '../../../types';

// Tipo para fila de evento raw
type RawEventRow = Record<string, unknown>;

// Tipo para evento procesado
export interface ProcessedEvent {
  id: string;
  barcode: string;
  productName: string;
  providerName: string;
  event: string;
  quantity: number;
  location: string;
  frc: string;
  nguia: string;
  destino: string;
  traspaso: string;
  observaciones: string;
  timestamp: number;
  claveUnica: string;
  category: string;
  isAdjusted: boolean;
  syncStatus: string;
}

// Configuración de mapeo para eventos
interface EventMappingConfig {
  event?: string;
  barcode?: string;
  name?: string;
  supplier?: string;
  quantity?: string;
  location?: string;
  frc?: string;
  nguia?: string;
  destino?: string;
  traspaso?: string;
  observaciones?: string;
}

/**
 * Obtiene un campo del registro con múltiples fallbacks
 */
function getField(
  record: RawEventRow,
  mappingKey: string | undefined,
  fallbacks: string[]
): unknown {
  // 1. Try mapping key first (non-empty)
  if (mappingKey && record[mappingKey] !== undefined && String(record[mappingKey]).trim() !== '') {
    return record[mappingKey];
  }

  // 2. Try fallbacks (non-empty)
  for (const key of fallbacks) {
    if (record[key] !== undefined && String(record[key]).trim() !== '') {
      return record[key];
    }
  }

  // 3. Fallback to mapping key even if empty
  if (mappingKey && record[mappingKey] !== undefined) {
    return record[mappingKey];
  }

  // 4. Fallback to first existing key even if empty
  for (const key of fallbacks) {
    if (record[key] !== undefined) return record[key];
  }

  return undefined;
}

/**
 * Procesa un registro raw de evento a formato interno
 */
export function processEventRecord(
  record: RawEventRow,
  productMap: Map<string, Product>,
  mappingConfig?: EventMappingConfig
): ProcessedEvent | null {
  const eventMapping = mappingConfig;

  // Saltar eventos de vencimientos
  const eventValue = getField(
    record,
    eventMapping?.event,
    ['EVENTO', 'evento', 'event', 'EVENT', 'Tipo', 'TIPO', 'MOTIVO', 'motivo']
  ) || 'OTRO';

  if (String(eventValue || "").toUpperCase() === 'VENCIMIENTOS') {
    return null;
  }

  const barcodeField = getField(
    record,
    eventMapping?.barcode,
    ['SKU', 'sku', 'barcode', 'BARCODE', 'codigo', 'CODIGO', 'Codigo', 'EAN', 'ean', 'UPC', 'upc']
  );
  const barcode = String(barcodeField || '').trim();

  const product = productMap.get(normalizeSku(barcode));

  const productNameField = product?.name ||
    getField(
      record,
      eventMapping?.name,
      ['DESCRIPTOR', 'descriptor', 'productName', 'PRODUCTO', 'producto', 'Name', 'name', 'DESCRIPCION', 'descripcion']
    );
  const productName = String(productNameField || 'Producto Desconocido');

  const providerNameField = product?.supplier ||
    getField(
      record,
      eventMapping?.supplier,
      ['PROVEEDOR', 'proveedor', 'supplier', 'SUPPLIER', 'Proveedor', 'Provider', 'FABRICANTE', 'fabricante']
    );
  const providerName = String(providerNameField || 'N/A');

  const quantityValue = getField(
    record,
    eventMapping?.quantity,
    ['CANTIDAD', 'cantidad', 'quantity', 'QUANTITY', 'Cant', 'CANT', 'QTY', 'qty']
  ) || 0;

  const locationValue = getField(
    record,
    eventMapping?.location,
    ['UBICACION', 'ubicacion', 'location', 'LOCATION', 'Ubic', 'UBIC', 'SITIO', 'sitio']
  ) || 'GENERAL';

  const frcValue = getField(
    record,
    eventMapping?.frc,
    ['FRC', 'frc', 'folio', 'FOLIO', 'folio_frc', 'FOLIO_FRC', 'Folio', 'FRC_FOLIO', 'folio_frc']
  ) || '';

  const nguiaValue = getField(
    record,
    eventMapping?.nguia,
    ['nguia', 'NGUIA', 'guia', 'GUIA', 'n_guia', 'N_GUIA', 'GUIA_NUM', 'guia_num']
  ) || '';

  const destinoValue = getField(
    record,
    eventMapping?.destino,
    ['DESTINO', 'destino', 'Destino', 'BODEGA', 'bodega']
  ) || '';

  const traspasoValue = getField(
    record,
    eventMapping?.traspaso,
    ['DOC-TRAS-INTER', 'TRASPASO', 'traspaso', 'Traspaso', 'N_TRASPASO', 'n_traspaso']
  ) || '';

  const observacionesValue = getField(
    record,
    eventMapping?.observaciones,
    ['OBSERVACIONES', 'observaciones', 'Observaciones', 'OBS', 'obs', 'NOTAS', 'notas']
  ) || '';

  const hasTraspaso = !!(traspasoValue && String(traspasoValue).trim() !== '');

  return {
    id: String(record.id || ''),
    barcode,
    productName,
    providerName,
    event: String(eventValue),
    quantity: Number(quantityValue) || 0,
    location: String(locationValue),
    frc: String(frcValue),
    nguia: String(nguiaValue),
    destino: String(destinoValue),
    traspaso: String(traspasoValue),
    observaciones: String(observacionesValue),
    timestamp: Number(record.timestamp) || Date.now(),
    claveUnica: String(record.claveUnica || record.id || ''),
    category: product?.category || 'GENERAL',
    isAdjusted: hasTraspaso,
    syncStatus: String(record.syncStatus || 'synced'),
  };
}

/**
 * Procesa múltiples registros de eventos
 */
export function processEventsBatch(
  records: RawEventRow[],
  productMap: Map<string, Product>,
  mappingConfig?: EventMappingConfig,
  windowSize = 500
): ProcessedEvent[] {
  // MEMORY OPTIMIZATION: Sliding Window
  // Si tenemos miles de registros, procesamos solo los 500 más recientes
  const sortedRecords = [...records]
    .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0))
    .slice(0, windowSize);

  const results: ProcessedEvent[] = [];

  for (const record of sortedRecords) {
    const processed = processEventRecord(record, productMap, mappingConfig);
    if (processed) {
      results.push(processed);
    }
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Filtra eventos por búsqueda
 */
export function filterEventsBySearch(
  events: ProcessedEvent[],
  searchQuery: string
): ProcessedEvent[] {
  if (!searchQuery.trim()) return events;
  
  const query = searchQuery.toLowerCase();
  
  return events.filter(event =>
    event.barcode.toLowerCase().includes(query) ||
    event.productName.toLowerCase().includes(query) ||
    event.frc.toLowerCase().includes(query) ||
    event.nguia.toLowerCase().includes(query) ||
    event.destino.toLowerCase().includes(query) ||
    event.location.toLowerCase().includes(query) ||
    event.providerName.toLowerCase().includes(query)
  );
}

/**
 * Filtra eventos por rango de fechas
 */
export function filterEventsByDateRange(
  events: ProcessedEvent[],
  startDate: string | null,
  endDate: string | null
): ProcessedEvent[] {
  if (!startDate && !endDate) return events;
  
  return events.filter(event => {
    const eventDate = new Date(event.timestamp);
    
    if (startDate) {
      const start = new Date(startDate);
      if (eventDate < start) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (eventDate > end) return false;
    }
    
    return true;
  });
}
