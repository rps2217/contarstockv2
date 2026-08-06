/**
 * =============================================================================
 * NORMALIZE UTILITIES - Funciones de normalización centralizadas
 * =============================================================================
 *
 * Única fuente de verdad para normalización de:
 * - SKUs y Barcodes (normalizeSku)
 * - Identidades/RUTs (normalizeIdentity)
 *
 * @module normalize
 */

// =============================================================================
// BARCODE / SKU NORMALIZATION
// =============================================================================

/**
 * Normaliza un barcode/SKU eliminando:
 * - Espacios en blanco
 * - Caracteres de control Unicode
 * - Cualquier caracter que no sea letra o número
 * - Convierte a mayúsculas
 */
export function normalizeSku(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .trim()
    .toUpperCase()
    .replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '') // Caracteres de control
    .replace(/[^A-Z0-9]/g, ''); // Solo letras y números
}

/**
 * Alias para normalizeSku para compatibilidad
 */
export const sanitizeBarcode = normalizeSku;

// =============================================================================
// IDENTITY / RUT NORMALIZATION
// =============================================================================

/**
 * Normaliza una identidad/RUT
 * Remueve absolutamente todo lo que no sea letra o número.
 * Garantiza que "12.345.678-9" sea igual a "123456789".
 */
export function normalizeIdentity(val: string | undefined | null): string {
  if (!val) return '';
  return String(val)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

// =============================================================================
// HEADER NORMALIZATION
// =============================================================================

/**
 * Normaliza cabeceras CSV para comparación
 * Elimina espacios, acentos, caracteres especiales y convierte a mayúsculas.
 * Esto hace que "Cód. Producto" y "COD_PRODUCTO" sean equivalentes.
 */
