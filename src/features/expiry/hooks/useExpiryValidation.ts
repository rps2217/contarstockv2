/**
 * =============================================================================
 * useExpiryValidation - Hook para validación de vencimientos
 * =============================================================================
 * 
 * Proporciona validación robusta para:
 * - Barcode (formato, longitud)
 * - Fecha (mes, año, rango válido)
 * - Cantidad (límites)
 * - Status del vencimiento (expired, critical, warning, safe)
 * - Confirmación requerida para fechas críticas
 * 
 * @since 2026-07-07
 */

import { useMemo, useCallback } from 'react';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { normalizeSku } from '@/services/utils';
import {
  MIN_YEAR,
  MAX_YEAR,
  MIN_BARCODE_LENGTH,
  MAX_BARCODE_LENGTH,
  MIN_QUANTITY,
  MAX_QUANTITY,
  CRITICAL_DAYS,
  WARNING_DAYS,
  REQUIRE_CONFIRMATION_THRESHOLD_DAYS,
  getExpiryDate,
} from '../constants';

// =============================================================================
// TIPOS
// =============================================================================

export type ExpiryStatusType = 'expired' | 'critical' | 'warning' | 'safe';

export interface ExpiryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  status: ExpiryStatusType;
  daysLeft: number;
  expiryDate: Date | null;
  requiresConfirmation: boolean;
  confirmationMessage: string;
  canSubmit: boolean;
}

export interface ExpiryInput {
  barcode: string;
  mm: number | null;
  yyyy: number | null;
  quantity: number | null;
}

// =============================================================================
// FUNCIONES DE VALIDACIÓN (PURO)
// =============================================================================

/**
 * Valida un barcode
 */
export const validateBarcode = (barcode: string): string | null => {
  const normalized = normalizeSku(barcode);
  
  if (!normalized || normalized.trim().length === 0) {
    return 'Barcode es requerido';
  }
  
  if (normalized.length < MIN_BARCODE_LENGTH) {
    return `Barcode requiere mínimo ${MIN_BARCODE_LENGTH} caracteres`;
  }
  
  if (normalized.length > MAX_BARCODE_LENGTH) {
    return `Barcode excede ${MAX_BARCODE_LENGTH} caracteres`;
  }
  
  // Verificar caracteres válidos (alfanumérico, guiones)
  if (!/^[\dA-Za-z-]+$/.test(normalized)) {
    return 'Barcode contiene caracteres inválidos';
  }
  
  return null;
};

/**
 * Valida un mes
 */
export const validateMonth = (mm: number | null): string | null => {
  if (mm === null || mm === undefined) {
    return 'Mes es requerido';
  }
  
  if (!Number.isInteger(mm) || mm < 1 || mm > 12) {
    return 'Mes debe estar entre 1 y 12';
  }
  
  return null;
};

/**
 * Valida un año con el rango configurado (2024-2027)
 */
export const validateYear = (yyyy: number | null): string | null => {
  if (yyyy === null || yyyy === undefined) {
    return 'Año es requerido';
  }
  
  if (!Number.isInteger(yyyy)) {
    return 'Año debe ser un número entero';
  }
  
  if (yyyy < MIN_YEAR || yyyy > MAX_YEAR) {
    return `Año debe estar entre ${MIN_YEAR} y ${MAX_YEAR}`;
  }
  
  return null;
};

/**
 * Valida una cantidad
 */
export const validateQuantity = (quantity: number | null): string | null => {
  if (quantity === null || quantity === undefined) {
    return null; // Cantidad es opcional, tiene default
  }
  
  if (!Number.isInteger(quantity)) {
    return 'Cantidad debe ser un número entero';
  }
  
  if (quantity < MIN_QUANTITY) {
    return `Cantidad mínima es ${MIN_QUANTITY}`;
  }
  
  if (quantity > MAX_QUANTITY) {
    return `Cantidad máxima es ${MAX_QUANTITY}`;
  }
  
  return null;
};

/**
 * Calcula el status y días restantes de un vencimiento
 */
export const calculateExpiryStatus = (
  mm: number,
  yyyy: number
): { status: ExpiryStatusType; daysLeft: number; expiryDate: Date } => {
  const now = startOfDay(new Date());
  const expiryDate = getExpiryDate(yyyy, mm);
  const daysLeft = differenceInCalendarDays(startOfDay(expiryDate), now);
  
  let status: ExpiryStatusType;
  
  if (daysLeft < 0) {
    status = 'expired';
  } else if (daysLeft <= CRITICAL_DAYS) {
    status = 'critical';
  } else if (daysLeft <= WARNING_DAYS) {
    status = 'warning';
  } else {
    status = 'safe';
  }
  
  return { status, daysLeft, expiryDate };
};

/**
 * Genera el mensaje de confirmación para fechas críticas
 */
export const getConfirmationMessage = (
  status: ExpiryStatusType,
  daysLeft: number,
  productName?: string
): string => {
  const displayName = productName ? `"${productName}"` : 'Este producto';
  
  switch (status) {
    case 'expired':
      return `${displayName} está VENCIDO desde hace ${Math.abs(daysLeft)} días. ¿Confirmar registro como merma?`;
    
    case 'critical':
      return `${displayName} vence en ${daysLeft} días (${CRITICAL_DAYS} días o menos). ¿Confirmar registro?`;
    
    default:
      return `¿Confirmar el registro del vencimiento?`;
  }
};

// =============================================================================
// VALIDACIÓN PRINCIPAL
// =============================================================================

/**
 * Valida todos los campos de entrada para un vencimiento
 */
export const validateExpiryInput = (
  barcode: string,
  mm: number | null,
  yyyy: number | null,
  quantity: number | null,
  productName?: string
): ExpiryValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1️⃣ Validar barcode
  const barcodeError = validateBarcode(barcode);
  if (barcodeError) errors.push(barcodeError);
  
  // 2️⃣ Validar mes
  const monthError = validateMonth(mm);
  if (monthError) errors.push(monthError);
  
  // 3️⃣ Validar año
  const yearError = validateYear(yyyy);
  if (yearError) errors.push(yearError);
  
  // 4️⃣ Validar cantidad
  const quantityError = validateQuantity(quantity);
  if (quantityError) errors.push(quantityError);
  
  // 5️⃣ Calcular status y días
  let status: ExpiryStatusType = 'safe';
  let daysLeft = 0;
  let expiryDate: Date | null = null;
  let requiresConfirmation = false;
  let confirmationMessage = '';
  
  if (mm !== null && yyyy !== null && errors.length === 0) {
    const result = calculateExpiryStatus(mm, yyyy);
    status = result.status;
    daysLeft = result.daysLeft;
    expiryDate = result.expiryDate;
    
    // Generar warnings basados en status
    if (status === 'expired') {
      warnings.push(`⚠️ PRODUCTO VENCIDO desde hace ${Math.abs(daysLeft)} días`);
      requiresConfirmation = true;
      confirmationMessage = getConfirmationMessage(status, daysLeft, productName);
    } else if (status === 'critical') {
      warnings.push(`🚨 CRÍTICO: Vence en ${daysLeft} días`);
      requiresConfirmation = true;
      confirmationMessage = getConfirmationMessage(status, daysLeft, productName);
    } else if (status === 'warning') {
      warnings.push(`⚡ Vence en ${daysLeft} días`);
    } else {
      warnings.push(`✅ Vence en ${daysLeft} días`);
    }
  }
  
  // 6️⃣ Determinar si puede submit
  const canSubmit = errors.length === 0 && mm !== null && yyyy !== null && barcode.length >= MIN_BARCODE_LENGTH;
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    status,
    daysLeft,
    expiryDate,
    requiresConfirmation,
    confirmationMessage,
    canSubmit,
  };
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook para validación de vencimientos
 * 
 * @example
 * ```tsx
 * const validation = useExpiryValidation({
 *   barcode,
 *   mm: selectedMm,
 *   yyyy: selectedYyyy,
 *   quantity,
 * });
 * 
 * // Mostrar errores
 * validation.errors.map(e => <p key={e}>{e}</p>)
 * 
 * // Mostrar warnings
 * validation.warnings.map(w => <p key={w}>{w}</p>)
 * 
 * // Confirmar antes de enviar
 * const handleSubmit = async () => {
 *   if (validation.requiresConfirmation) {
 *     const confirmed = window.confirm(validation.confirmationMessage);
 *     if (!confirmed) return;
 *   }
 *   await saveExpiry();
 * };
 * ```
 */
export const useExpiryValidation = (input: ExpiryInput) => {
  const validation = useMemo(() => {
    return validateExpiryInput(
      input.barcode,
      input.mm,
      input.yyyy,
      input.quantity
    );
  }, [input.barcode, input.mm, input.yyyy, input.quantity]);
  
  return validation;
};

/**
 * Hook para verificar si requiere confirmación
 */
export const useRequiresConfirmation = (
  mm: number | null,
  yyyy: number | null
): { requiresConfirmation: boolean; message: string } => {
  return useMemo(() => {
    if (mm === null || yyyy === null) {
      return { requiresConfirmation: false, message: '' };
    }
    
    const { status, daysLeft } = calculateExpiryStatus(mm, yyyy);
    
    if (status === 'expired' || status === 'critical') {
      return {
        requiresConfirmation: true,
        message: getConfirmationMessage(status, daysLeft),
      };
    }
    
    return { requiresConfirmation: false, message: '' };
  }, [mm, yyyy]);
};

// =============================================================================
// HELPERS ADICIONALES
// =============================================================================

/**
 * Valida un año desde entrada de teclado (string)
 */
export const validateYearInput = (input: string): number | null => {
  const year = parseInt(input, 10);
  
  if (isNaN(year)) {
    return null;
  }
  
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return null;
  }
  
  return year;
};

/**
 * Valida un mes desde entrada de teclado (string)
 */
export const validateMonthInput = (input: string): number | null => {
  const month = parseInt(input, 10);
  
  if (isNaN(month) || month < 1 || month > 12) {
    return null;
  }
  
  return month;
};
