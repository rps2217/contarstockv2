/**
 * Expiry Hooks - Exports centralizados
 * 
 * Hooks relacionados con vencimientos.
 */

export { useExpiry } from './useExpiry';
export { useExpiryWatcher } from './useExpiryWatcher';
export { useExpiryScanner } from './useExpiryScanner';
export { useExpiryTracker } from '@/features/counting/hooks/useExpiryTracker';

// Validación
export {
  useExpiryValidation,
  useRequiresConfirmation,
  validateExpiryInput,
  validateBarcode,
  validateMonth,
  validateYear,
  validateQuantity,
  calculateExpiryStatus,
  getConfirmationMessage,
  validateYearInput,
  validateMonthInput,
} from './useExpiryValidation';

export type {
  ExpiryValidationResult,
  ExpiryStatusType,
  ExpiryInput,
} from './useExpiryValidation';
