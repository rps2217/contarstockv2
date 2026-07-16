/**
 * useBarcodeValidator - Hook para validar barcodes
 *
 * Responsabilidad: Validación robusta de códigos de barras
 */

import { useCallback, useMemo } from 'react';

interface BarcodeValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

interface BarcodeValidatorConfig {
  minLength?: number;
  maxLength?: number;
  allowedPrefixes?: string[];
  disallowedPatterns?: RegExp[];
}

interface UseBarcodeValidatorReturn {
  validate: (barcode: string) => BarcodeValidationResult;
  normalize: (barcode: string) => string;
  isValid: (barcode: string) => boolean;
}

// Patrones comunes de barcode
const COMMON_PATTERNS = {
  // EAN-13
  ean13: /^\d{13}$/,
  // EAN-8
  ean8: /^\d{8}$/,
  // UPC-A
  upcA: /^\d{12}$/,
  // Code 128
  code128: /^[A-Za-z0-9-.$/+%\s]{1,48}$/,
  // Code 39
  code39: /^[A-Z0-9-./+%]{1,43}$/,
  // QR (cualquier cosa hasta 4296 chars)
  qr: /^.{1,4296}$/,
};

const DEFAULT_CONFIG: BarcodeValidatorConfig = {
  minLength: 4,
  maxLength: 48,
  allowedPrefixes: [], // Sin prefijos obligatorios
  disallowedPatterns: [
    /[^\w-.$+%\s]/, // Caracteres extraños
  ],
};

export function useBarcodeValidator(
  config: BarcodeValidatorConfig = {}
): UseBarcodeValidatorReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const normalize = useCallback((barcode: string): string => {
    if (!barcode) return '';

    // 1. Trim espacios
    let normalized = barcode.trim();

    // 2. Convertir a mayúsculas para códigos alfanuméricos
    // (No para numeric-only como EAN/UPC)
    if (!/^\d+$/.test(normalized)) {
      normalized = normalized.toUpperCase();
    }

    // 3. Reemplazar tabs/newlines
    normalized = normalized.replace(/[\t\n\r]/g, '');

    return normalized;
  }, []);

  const validate = useCallback(
    (barcode: string): BarcodeValidationResult => {
      if (!barcode) {
        return { isValid: false, normalized: '', error: 'Código vacío' };
      }

      const normalized = normalize(barcode);

      // Validaciones de longitud
      if (normalized.length < (finalConfig.minLength || 4)) {
        return {
          isValid: false,
          normalized,
          error: `Código muy corto (mín ${finalConfig.minLength} caracteres)`,
        };
      }

      if (normalized.length > (finalConfig.maxLength || 48)) {
        return {
          isValid: false,
          normalized,
          error: `Código muy largo (máx ${finalConfig.maxLength} caracteres)`,
        };
      }

      // Validación de patrones disallowed
      if (finalConfig.disallowedPatterns) {
        for (const pattern of finalConfig.disallowedPatterns) {
          if (pattern.test(normalized)) {
            return {
              isValid: false,
              normalized,
              error: 'Código contiene caracteres inválidos',
            };
          }
        }
      }

      // Detectar tipo de código
      const type = detectType(normalized);
      if (!type) {
        return {
          isValid: false,
          normalized,
          error: 'Formato de código no reconocido',
        };
      }

      return { isValid: true, normalized };
    },
    [normalize, finalConfig]
  );

  const isValid = useCallback(
    (barcode: string): boolean => {
      return validate(barcode).isValid;
    },
    [validate]
  );

  return useMemo(
    () => ({
      validate,
      normalize,
      isValid,
    }),
    [validate, normalize, isValid]
  );
}

// Función helper para detectar tipo de barcode
function detectType(barcode: string): string | null {
  // Solo números
  if (/^\d+$/.test(barcode)) {
    if (barcode.length === 13 && COMMON_PATTERNS.ean13.test(barcode)) return 'EAN-13';
    if (barcode.length === 8 && COMMON_PATTERNS.ean8.test(barcode)) return 'EAN-8';
    if (barcode.length === 12 && COMMON_PATTERNS.upcA.test(barcode)) return 'UPC-A';
    // Otros numéricos son válidos (códigos internos)
    if (barcode.length >= 4) return 'NUMERIC';
  }

  // Alfanumérico
  if (COMMON_PATTERNS.code128.test(barcode)) return 'CODE-128';
  if (COMMON_PATTERNS.code39.test(barcode)) return 'CODE-39';

  // QR u otros
  if (barcode.length <= 4296) return 'QR/OTHER';

  return null;
}
