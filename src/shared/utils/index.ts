/**
 * Shared Utils - Índice de utilidades compartidas
 *
 * Este archivo centraliza todas las utilidades para evitar duplicación
 */

// Utilidades comunes
export * from './common';

// Re-exportar funciones de normalización desde services/utils
// para tener un único punto de acceso
export {
  sanitizeBarcode,
  normalizeSku,
  normalizeIdentity,
  generateUUID,
  generateSessionSignature,
} from '@/services/utils';
