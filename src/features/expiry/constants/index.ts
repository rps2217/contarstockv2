/**
 * Expiry Constants - Exports
 */

export {
  MIN_YEAR,
  MAX_YEAR,
  EXPIRY_YEARS,
  EXPIRY_MONTHS,
  CRITICAL_DAYS,
  WARNING_DAYS,
  DEFAULT_WITHDRAWAL_DAYS,
  REQUIRE_CONFIRMATION_THRESHOLD_DAYS,
  MIN_BARCODE_LENGTH,
  MAX_BARCODE_LENGTH,
  MIN_QUANTITY,
  MAX_QUANTITY,
  MAX_PRODUCT_LIFE_DAYS,
  AVG_PRODUCT_LIFE_DAYS,
  EXPIRY_CACHE_TTL,
  MAX_SYNC_RETRIES,
  generateExpiryKey,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_FULL,
  getLastDayOfMonth,
  getExpiryDate,
  getDaysUntilExpiry,
  isValidYear,
  isValidMonth,
  getMonthNameShort,
  formatExpiryDisplay,
} from './expiryConstants';

export type { ExpiryYear, ExpiryMonth } from './expiryConstants';
