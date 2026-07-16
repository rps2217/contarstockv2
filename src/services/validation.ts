/**
 * ValidationService - Servicio centralizado de validación
 *
 * Proporciona funciones de validación reutilizables para
 * barcode, quantities, dates, locations, etc.
 */

import { CountingSession } from '../types';

// Resultado de validación
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// =============================================================================
// BARCODE VALIDATION
// =============================================================================

const BARCODE_PATTERNS = {
  // EAN-13
  ean13: /^\d{13}$/,
  // EAN-8
  ean8: /^\d{8}$/,
  // UPC-A
  upca: /^\d{12}$/,
  // Code 128 (common in logistics)
  code128: /^[A-Za-z0-9-.$/+%\s]{1,48}$/,
  // Generic numeric
  numeric: /^\d+$/,
  // Alphanumeric
  alphanumeric: /^[A-Za-z0-9-]+$/,
};

export const ValidationService = {
  /**
   * Valida si un barcode tiene formato válido
   */
  isValidBarcode(barcode: string): boolean {
    if (!barcode || barcode.trim().length === 0) return false;

    const cleanBarcode = barcode.trim();

    // Check against known patterns
    return Object.values(BARCODE_PATTERNS).some(pattern => pattern.test(cleanBarcode));
  },

  /**
   * Valida barcode y retorna resultado detallado
   */
  validateBarcode(barcode: string): ValidationResult {
    const errors: string[] = [];

    if (!barcode || barcode.trim().length === 0) {
      errors.push('El código de barras no puede estar vacío');
      return { valid: false, errors };
    }

    const cleanBarcode = barcode.trim();

    if (cleanBarcode.length < 3) {
      errors.push('El código de barras es demasiado corto (mínimo 3 caracteres)');
    }

    if (cleanBarcode.length > 48) {
      errors.push('El código de barras es demasiado largo (máximo 48 caracteres)');
    }

    const hasValidPattern = Object.values(BARCODE_PATTERNS).some(pattern =>
      pattern.test(cleanBarcode)
    );
    if (!hasValidPattern) {
      errors.push('El formato del código de barras no es válido');
    }

    return { valid: errors.length === 0, errors };
  },

  // =============================================================================
  // QUANTITY VALIDATION
  // =============================================================================

  /**
   * Valida si una cantidad es válida (debe ser entero positivo)
   */
  isValidQuantity(qty: number): boolean {
    return Number.isInteger(qty) && qty > 0;
  },

  /**
   * Valida cantidad y retorna resultado detallado
   */
  validateQuantity(qty: number, options?: { min?: number; max?: number }): ValidationResult {
    const errors: string[] = [];

    if (typeof qty !== 'number' || isNaN(qty)) {
      errors.push('La cantidad debe ser un número válido');
      return { valid: false, errors };
    }

    if (!Number.isInteger(qty)) {
      errors.push('La cantidad debe ser un número entero');
    }

    if (qty <= 0) {
      errors.push('La cantidad debe ser mayor a cero');
    }

    if (options?.min !== undefined && qty < options.min) {
      errors.push(`La cantidad debe ser al menos ${options.min}`);
    }

    if (options?.max !== undefined && qty > options.max) {
      errors.push(`La cantidad no puede exceder ${options.max}`);
    }

    return { valid: errors.length === 0, errors };
  },

  // =============================================================================
  // DATE VALIDATION
  // =============================================================================

  /**
   * Valida si una fecha es válida
   */
  isValidDate(date: Date | string | number): boolean {
    if (!date) return false;

    const d = date instanceof Date ? date : new Date(date);
    return !isNaN(d.getTime());
  },

  /**
   * Valida fecha de expiración (debe ser futura)
   */
  validateExpiryDate(date: Date | string | number): ValidationResult {
    const errors: string[] = [];
    const d = date instanceof Date ? date : new Date(date);

    if (isNaN(d.getTime())) {
      errors.push('La fecha de expiración no es válida');
      return { valid: false, errors };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (d < today) {
      errors.push('La fecha de expiración ya pasó');
    }

    // Warn if expiry is more than 5 years in future
    const maxFuture = new Date();
    maxFuture.setFullYear(maxFuture.getFullYear() + 5);
    if (d > maxFuture) {
      errors.push('La fecha de expiración es más de 5 años en el futuro');
    }

    return { valid: errors.length === 0, errors };
  },

  // =============================================================================
  // LOCATION VALIDATION
  // =============================================================================

  /**
   * Valida formato de ubicación
   */
  isValidLocation(loc: string): boolean {
    if (!loc || loc.trim().length === 0) return false;

    // Common location formats: A1, A-1, ZONE-A-1, etc.
    const locationPattern = /^[A-Za-z0-9\-\_]{1,20}$/;
    return locationPattern.test(loc.trim());
  },

  /**
   * Valida ubicación y retorna resultado detallado
   */
  validateLocation(loc: string): ValidationResult {
    const errors: string[] = [];

    if (!loc || loc.trim().length === 0) {
      errors.push('La ubicación no puede estar vacía');
      return { valid: false, errors };
    }

    const cleanLoc = loc.trim();

    if (cleanLoc.length < 2) {
      errors.push('La ubicación es demasiado corta (mínimo 2 caracteres)');
    }

    if (cleanLoc.length > 20) {
      errors.push('La ubicación es demasiado larga (máximo 20 caracteres)');
    }

    const locationPattern = /^[A-Za-z0-9\-\_]+$/;
    if (!locationPattern.test(cleanLoc)) {
      errors.push(
        'La ubicación contiene caracteres no válidos (solo letras, números, guiones y guiones bajos)'
      );
    }

    return { valid: errors.length === 0, errors };
  },

  // =============================================================================
  // SESSION VALIDATION
  // =============================================================================

  /**
   * Valida una sesión de conteo
   */
  validateSession(session: CountingSession): ValidationResult {
    const errors: string[] = [];

    if (!session.id) {
      errors.push('La sesión no tiene ID');
    }

    if (!session.erpOrder || session.erpOrder.trim().length === 0) {
      errors.push('La orden ERP es requerida');
    }

    if (!session.logisticsLabel || session.logisticsLabel.trim().length === 0) {
      errors.push('La etiqueta logística es requerida');
    }

    if (!session.createdAt) {
      errors.push('La sesión no tiene fecha de creación');
    }

    if (session.status && !['active', 'completed', 'cancelled'].includes(session.status)) {
      errors.push(`El estado "${session.status}" no es válido`);
    }

    return { valid: errors.length === 0, errors };
  },

  // =============================================================================
  // ERP ORDER VALIDATION
  // =============================================================================

  /**
   * Valida formato de orden ERP
   */
  validateErpOrder(order: string): ValidationResult {
    const errors: string[] = [];

    if (!order || order.trim().length === 0) {
      errors.push('La orden ERP no puede estar vacía');
      return { valid: false, errors };
    }

    const cleanOrder = order.trim();

    if (cleanOrder.length < 3) {
      errors.push('La orden ERP es demasiado corta (mínimo 3 caracteres)');
    }

    if (cleanOrder.length > 50) {
      errors.push('La orden ERP es demasiado larga (máximo 50 caracteres)');
    }

    const orderPattern = /^[A-Za-z0-9\-\_\.]{3,50}$/;
    if (!orderPattern.test(cleanOrder)) {
      errors.push('El formato de la orden ERP no es válido');
    }

    return { valid: errors.length === 0, errors };
  },

  // =============================================================================
  // UTILITY
  // =============================================================================

  /**
   * Limpia un barcode (remueve espacios, mayúsculas)
   */
  cleanBarcode(barcode: string): string {
    return barcode.trim().toUpperCase().replace(/\s+/g, '');
  },

  /**
   * Limpia una ubicación
   */
  cleanLocation(loc: string): string {
    return loc.trim().toUpperCase().replace(/\s+/g, '-');
  },
};
