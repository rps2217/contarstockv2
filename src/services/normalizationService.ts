
import { normalizeSku } from './utils';

/**
 * LogiCount Core Normalization Service
 * Este servicio es el UNICO responsable de traducir datos crudos (CSV, Excel, API)
 * al esquema interno riguroso de la aplicación.
 */

export interface NormalizedProduct {
  barcode: string;
  name: string;
  category: string;
  supplier?: string;
  supplierRut?: string;
  price?: number;
  cost?: number;
  stock?: number;
}

export interface NormalizedExpiry {
  id: string;
  barcode: string;
  productName: string;
  providerName: string;
  mm: number;
  yyyy: number;
  quantity: number;
  location: string;
  batch: string;
  observaciones: string;
  timestamp: number;
  syncStatus: 'synced' | 'pending' | 'error';
  claveUnica: string;
}

const ALIASES = {
  barcode: ['barcode', 'SKU', 'COD_BARRAS', 'sku', 'codigo', 'codigo_barras', 'CODE', 'BARCODE'],
  name: ['productName', 'product_name', 'DESCRIPTOR', 'DESCRIPCION', 'DESCRIPCION_PROD', 'PRODUCTO', 'PRODUCT', 'ITEM', 'name', 'nombre', 'NOMBRE_PRODUCTO'],
  supplier: ['providerName', 'provider_name', 'PROVEEDOR', 'PROV', 'supplier', 'LABORATORIO', 'LAB', 'MARCA', 'proveedor', 'Proveedor', 'SUPPLIER'],
  mm: ['mm', 'MM', 'mes', 'MES', 'month', 'MONTH'],
  yyyy: ['yyyy', 'YYYY', 'año', 'AÑO', 'year', 'YEAR'],
  quantity: ['quantity', 'CANTIDAD', 'cant', 'amount', 'stock_actual'],
  location: ['location', 'UBICACION', 'pasillo', 'estanteria', 'shelf'],
  batch: ['batch', 'LOTE', 'lote', 'serie', 'serial'],
  observaciones: ['observaciones', 'OBSERVACIONES', 'OBS', 'COMENTARIO', 'NOTAS', 'description', 'descripción', 'descripcion', 'comments']
};

/**
 * Busca un valor en un objeto basándose en una lista de alias y el mapping del usuario
 * Soporta búsqueda insensible a mayúsculas y normalización de llaves
 */
export const getMappedValue = (obj: any, fieldKey: keyof typeof ALIASES, userMapping?: string): any => {
  const aliases = ALIASES[fieldKey];
  const keysToTry = [userMapping, ...aliases].filter(Boolean) as string[];
  
  // 1. Intento directo con las llaves proporcionadas
  for (const key of keysToTry) {
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
      return obj[key];
    }
  }

  // 2. Intento insensible a mayúsculas (Case-insensitive)
  const objKeys = Object.keys(obj);
  const normalizedKeysToTry = keysToTry.map(k => k.toLowerCase().trim());

  for (const key of objKeys) {
    const normalizedKey = key.toLowerCase().trim();
    if (normalizedKeysToTry.includes(normalizedKey)) {
      if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
        return obj[key];
      }
    }
  }
  
  return null;
};

/**
 * Normaliza un registro de vencimiento al esquema rígido de LogiCount
 */
export const normalizeExpiryRecord = (raw: any, userMappings?: any): NormalizedExpiry => {
  // 1. Obtener el Barcode (Fundamental)
  const barcode = normalizeSku(String(getMappedValue(raw, 'barcode', userMappings?.barcode) || raw.barcode || ''));
  
  // 2. Resolver el Nombre del Producto (Prioridad absoluta)
  // Intentamos: Mapping Usuario -> Alias Conocidos -> Campos Crudos Comunes -> Valor por defecto
  let productName = String(
    getMappedValue(raw, 'name', userMappings?.name) || 
    raw.productName || 
    raw.product_name || 
    raw.DESCRIPTOR || 
    raw.DESCRIPCION || 
    raw.PRODUCTO || 
    'PRODUCTO SIN DESCRIPTOR'
  ).trim().toUpperCase();

  // 3. Resolver Proveedor
  const providerName = String(
    getMappedValue(raw, 'supplier', userMappings?.supplier) || 
    raw.providerName || 
    raw.provider_name || 
    raw.PROVEEDOR || 
    raw.LABORATORIO || 
    'N/A'
  ).trim().toUpperCase();

  const mm = Number(getMappedValue(raw, 'mm', userMappings?.mm) || raw.mm || 0);
  const yyyy = Number(getMappedValue(raw, 'yyyy', userMappings?.yyyy) || raw.yyyy || 0);
  
  // Generar claveUnica consistente
  const mmPadded = String(mm).padStart(2, '0');
  const lastDay = new Date(yyyy, mm, 0).getDate();
  const ddPadded = String(lastDay).padStart(2, '0');
  const claveUnica = raw.claveUnica || raw.CLAVE_UNICA || `${barcode}${yyyy}${mmPadded}${ddPadded}`;

  return {
    id: raw.id || raw.ID || claveUnica,
    barcode,
    productName,
    providerName,
    mm,
    yyyy,
    quantity: Number(getMappedValue(raw, 'quantity', userMappings?.quantity) || raw.quantity || 0),
    location: String(getMappedValue(raw, 'location', userMappings?.location) || raw.location || 'N/A'),
    batch: String(getMappedValue(raw, 'batch', userMappings?.batch) || raw.batch || 'N/A'),
    observaciones: String(getMappedValue(raw, 'observaciones', userMappings?.observaciones) || raw.observaciones || '').trim(),
    timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : (raw.timestamp ? new Date(raw.timestamp).getTime() : Date.now()),
    syncStatus: raw.syncStatus || 'synced',
    claveUnica
  };
};
