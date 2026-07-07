/**
 * Counting Domain - Lógica de negocio pura para el módulo de conteo
 *
 * Este módulo contiene funciones stateless para:
 * - Evaluación de productos escaneados
 * - Normalización de datos
 * - Cálculo de métricas
 * - Determinación de estados
 *
 * No depende de React ni de servicios externos.
 */

import { ConsolidatedItem } from '@/types';
import { normalizeSku } from '@/services/utils';

// ✅ NUEVO: Imports de constantes de expiry
import { MIN_YEAR, MAX_YEAR } from '@/features/expiry/constants';

// ============================================================
// TIPOS
// ============================================================

export type CountingStatus = 'idle' | 'scanning' | 'pharma' | 'manual' | 'error';

export interface CountingMetrics {
  totalItems: number;
  totalQuantity: number;
  uniqueProducts: number;
  incidents: number;
  expectedCoverage: number; // 0-100%
}

export interface ProductEvaluation {
  isNew: boolean;
  isPharma: boolean;
  needsBatch: boolean;
  confidence: 'high' | 'medium' | 'low';
  suggestion?: string;
}

export interface BatchPrompt {
  barcode: string;
  productName: string;
  reason: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const PHARMA_PREFIXES = ['780', '789', '750', '071'];
const HIGH_CONFIDENCE_THRESHOLD = 0.8;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.5;

// ============================================================
// FUNCIONES DE EVALUACIÓN
// ============================================================

/**
 * Evalúa si un barcode corresponde a un producto farmacéutico
 */
export const isPharmaBarcode = (barcode: string): boolean => {
  const norm = normalizeSku(barcode);
  return PHARMA_PREFIXES.some(prefix => norm.startsWith(prefix));
};

/**
 * Evalúa un producto escaneado y retorna información de categorización
 */
export const evaluateProduct = (
  barcode: string,
  existingItem: ConsolidatedItem | undefined,
  settings?: { pharmaBatchRequired?: boolean }
): ProductEvaluation => {
  const normBarcode = normalizeSku(barcode);
  const isNew = !existingItem;
  const isPharma = isPharmaBarcode(barcode);
  const needsBatch = isPharma && (settings?.pharmaBatchRequired ?? true);

  // Calcular confianza basada en si el producto ya existe
  let confidence: 'high' | 'medium' | 'low';
  if (existingItem) {
    confidence = 'high';
  } else if (isPharma) {
    confidence = 'medium'; // Productos pharma sin registro previo
  } else {
    confidence = 'low'; // Productos nuevos sin registro
  }

  return {
    isNew,
    isPharma,
    needsBatch,
    confidence,
  };
};

/**
 * Determina si debe solicitar batch para un producto farmacéutico
 */
export const shouldPromptBatch = (
  barcode: string,
  history: ConsolidatedItem[],
  settings?: { pharmaBatchRequired?: boolean }
): BatchPrompt | null => {
  if (!isPharmaBarcode(barcode)) return null;

  const settingsRequired = settings?.pharmaBatchRequired ?? true;
  if (!settingsRequired) return null;

  const existing = history.find(item => normalizeSku(item.barcode) === normalizeSku(barcode));

  // Si el producto ya tiene batch registrado, no preguntar
  if (existing?.batch) return null;

  return {
    barcode,
    productName: existing?.productName || 'Producto farmacéutico',
    reason: 'Los productos farmacéuticos requieren registro de lote y fecha de vencimiento',
  };
};

// ============================================================
// FUNCIONES DE CÁLCULO DE MÉTRICAS
// ============================================================

/**
 * Calcula métricas consolidadas del conteo
 */
export const calculateCountingMetrics = (items: ConsolidatedItem[]): CountingMetrics => {
  if (!items || items.length === 0) {
    return {
      totalItems: 0,
      totalQuantity: 0,
      uniqueProducts: 0,
      incidents: 0,
      expectedCoverage: 0,
    };
  }

  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.totalQuantity, 0);
  const uniqueProducts = new Set(items.map(item => normalizeSku(item.barcode))).size;
  const incidents = items.filter(item => item.isIncident).length;

  // Calcular coverage si hay expectedQuantity
  const itemsWithExpected = items.filter(item => item.expectedQuantity !== undefined);
  let expectedCoverage = 100;
  if (itemsWithExpected.length > 0) {
    const totalExpected = itemsWithExpected.reduce((sum, item) => sum + (item.expectedQuantity || 0), 0);
    const totalScanned = itemsWithExpected.reduce((sum, item) => sum + item.totalQuantity, 0);
    expectedCoverage = totalExpected > 0 ? Math.round((totalScanned / totalExpected) * 100) : 100;
  }

  return {
    totalItems,
    totalQuantity,
    uniqueProducts,
    incidents,
    expectedCoverage: Math.min(expectedCoverage, 100),
  };
};

/**
 * Calcula el progreso del conteo basado en items esperados
 */
export const calculateProgress = (scanned: ConsolidatedItem[]): number => {
  if (!scanned || scanned.length === 0) return 0;

  const itemsWithExpected = scanned.filter(item => item.expectedQuantity !== undefined);
  if (itemsWithExpected.length === 0) return 0;

  const totalExpected = itemsWithExpected.reduce((sum, item) => sum + (item.expectedQuantity || 0), 0);
  const totalScanned = itemsWithExpected.reduce((sum, item) => sum + item.totalQuantity, 0);

  if (totalExpected === 0) return 0;
  
  const progress = (totalScanned / totalExpected) * 100;
  return Math.min(Math.round(progress), 100); // Cap at 100%
};

// ============================================================
// FUNCIONES DE MATCHING (AI)
// ============================================================

/**
 * Busca un item existente por barcode normalizado
 */
export const findItemByBarcode = (
  items: ConsolidatedItem[],
  barcode: string
): ConsolidatedItem | undefined => {
  const normBarcode = normalizeSku(barcode);
  return items.find(item => normalizeSku(item.barcode) === normBarcode);
};

/**
 * Verifica si dos barcodes son el mismo producto
 */
export const isSameProduct = (barcode1: string, barcode2: string): boolean => {
  return normalizeSku(barcode1) === normalizeSku(barcode2);
};

// ============================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================

/**
 * Valida que un barcode sea válido para conteo
 */
export const isValidBarcode = (barcode: string): boolean => {
  if (!barcode || typeof barcode !== 'string') return false;
  const norm = normalizeSku(barcode);
  return norm.length >= 4 && norm.length <= 20;
};

/**
 * Valida que una cantidad sea válida
 */
export const isValidQuantity = (qty: number): boolean => {
  return Number.isInteger(qty) && qty > 0 && qty <= 9999;
};

/**
 * Valida fecha de vencimiento (mm/yyyy)
 * ✅ CORREGIDO: Usa rango de años 2024-2027
 */
export const isValidExpiryDate = (mm: number, yyyy: number): boolean => {
  if (mm < 1 || mm > 12) return false;
  if (yyyy < MIN_YEAR || yyyy > MAX_YEAR) return false;
  return true;
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Formatea un barcode para display
 */
export const formatBarcode = (barcode: string): string => {
  if (!barcode) return '-';
  const norm = normalizeSku(barcode);
  // Formato EAN-13 legible
  if (norm.length === 13) {
    return `${norm.slice(0, 1)} ${norm.slice(1, 7)} ${norm.slice(7)}`;
  }
  return barcode;
};

/**
 * Resume el estado del conteo
 */
export const getCountingSummary = (items: ConsolidatedItem[]): string => {
  if (!items || items.length === 0) return 'Sin productos contados';

  const metrics = calculateCountingMetrics(items);
  const unique = `${metrics.uniqueProducts} producto${metrics.uniqueProducts !== 1 ? 's' : ''}`;
  const total = `${metrics.totalQuantity} unidad${metrics.totalQuantity !== 1 ? 'es' : ''}`;

  return `${unique}, ${total}`;
};
