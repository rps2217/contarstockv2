/**
 * =============================================================================
 * EXPIRY CONSTANTS - Constantes centralizadas para el módulo de vencimientos
 * =============================================================================
 * 
 * Todas las constantes relacionadas con vencimientos están aquí para:
 * - Fácil mantenimiento
 * - Consistencia en toda la aplicación
 * - Un solo lugar para cambiar valores
 * 
 * ✅ IMPORTANTE: Mantener sincronizado con EXPIRY_CONSTANTS en ExpiryService
 * 
 * @since 2026-07-07
 */

import { normalizeSku } from '@/services/utils';

// =============================================================================
// CONFIGURACIÓN DE AÑOS (Sincronizado con ExpiryService)
// =============================================================================

/** Año mínimo permitido para registrar vencimientos */
export const MIN_YEAR = 2025;

/** Año máximo permitido para registrar vencimientos */
export const MAX_YEAR = 2027;

/** Lista de años disponibles para selectores */
export const EXPIRY_YEARS = Object.freeze(
  Array.from(
    { length: MAX_YEAR - MIN_YEAR + 1 }, 
    (_, i) => MIN_YEAR + i
  )
) as readonly number[];

/** Lista de meses disponibles */
export const EXPIRY_MONTHS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const);

// =============================================================================
// CONFIGURACIÓN DE ALERTAS Y STATUS
// =============================================================================

/** Días para considerar un producto como CRÍTICO */
export const CRITICAL_DAYS = 30;

/** Días para considerar un producto como WARNING (próximo a vencer) */
export const WARNING_DAYS = 90;

/** Días por defecto para retiro de productos */
export const DEFAULT_WITHDRAWAL_DAYS = 30;

/** Umbral de días para requerir confirmación obligatoria */
export const REQUIRE_CONFIRMATION_THRESHOLD_DAYS = 30;

// =============================================================================
// CONFIGURACIÓN DE VALIDACIÓN
// =============================================================================

/** Longitud mínima del barcode */
export const MIN_BARCODE_LENGTH = 4;

/** Longitud máxima del barcode */
export const MAX_BARCODE_LENGTH = 50;

/** Cantidad mínima por registro */
export const MIN_QUANTITY = 1;

/** Cantidad máxima por registro */
export const MAX_QUANTITY = 99999;

// =============================================================================
// CONFIGURACIÓN DE DURACIÓN DE VIDA ÚTIL
// =============================================================================

/** Vida útil máxima de un producto en días (aproximadamente 10 años) */
export const MAX_PRODUCT_LIFE_DAYS = 3650;

/** Vida útil promedio de un producto en días (aproximadamente 2 años) */
export const AVG_PRODUCT_LIFE_DAYS = 730;

// =============================================================================
// CONFIGURACIÓN DE SINCRONIZACIÓN
// =============================================================================

/** TTL del cache en milisegundos (2 minutos) */
export const EXPIRY_CACHE_TTL = 2 * 60 * 1000;

/** Número máximo de reintentos para sincronización */
export const MAX_SYNC_RETRIES = 3;

// =============================================================================
// CONFIGURACIÓN DE CLAVE ÚNICA
// =============================================================================

/**
 * Genera una clave única para un vencimiento
 * Formato: BARCODE-YYYY-MM (ej: 123-2027-06)
 */
export const generateExpiryKey = (barcode: string, mm: number, yyyy: number): string => {
  return `${normalizeSku(barcode)}-${yyyy}-${String(mm).padStart(2, '0')}`;
};

// =============================================================================
// CONFIGURACIÓN DE NOMBRES DE MESES
// =============================================================================

/** Nombres cortos de meses en español */
export const MONTH_NAMES_SHORT = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
] as const;

/** Nombres completos de meses en español */
export const MONTH_NAMES_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Obtiene el último día de un mes
 */
export const getLastDayOfMonth = (yyyy: number, mm: number): number => {
  return new Date(yyyy, mm, 0).getDate();
};

/**
 * Obtiene la fecha de vencimiento real (último día del mes)
 */
export const getExpiryDate = (yyyy: number, mm: number): Date => {
  const lastDay = getLastDayOfMonth(yyyy, mm);
  return new Date(yyyy, mm - 1, lastDay);
};

/**
 * Calcula los días restantes hasta el vencimiento
 */
export const getDaysUntilExpiry = (yyyy: number, mm: number): number => {
  const now = new Date();
  const expiryDate = getExpiryDate(yyyy, mm);
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Verifica si un año es válido para el módulo de vencimientos
 */
export const isValidYear = (year: number): boolean => {
  return year >= MIN_YEAR && year <= MAX_YEAR;
};

/**
 * Verifica si un mes es válido
 */
export const isValidMonth = (month: number): boolean => {
  return month >= 1 && month <= 12;
};

/**
 * Obtiene el nombre corto de un mes
 */
export const getMonthNameShort = (month: number): string => {
  if (month < 1 || month > 12) return 'N/A';
  return MONTH_NAMES_SHORT[month - 1];
};

/**
 * Formatea una fecha MM/YYYY para display
 */
export const formatExpiryDisplay = (mm: number, yyyy: number): string => {
  return `${getMonthNameShort(mm)} ${yyyy}`;
};

// =============================================================================
// TIPO EXPORTADO
// =============================================================================

export type ExpiryYear = typeof EXPIRY_YEARS[number];
export type ExpiryMonth = typeof EXPIRY_MONTHS[number];
