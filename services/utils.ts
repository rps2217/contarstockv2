
/**
 * Generates a cryptographically strong UUID.
 * Falls back to a timestamp-based random string only if crypto is unavailable (rare).
 */
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for very old browsers (Safety net)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Standardizes barcode input:
 * - Uppercase
 * - Trims whitespace
 * - Removes invisible control characters
 * - Removes zero-width spaces
 */
export const sanitizeBarcode = (code: string): string => {
    if (!code) return "";
    return code
        .trim()
        .toUpperCase()
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "");
};

/**
 * INTELLIGENT SKU NORMALIZER
 * Used for loose matching when strict equality fails.
 * Removes leading zeros to match "000123" with "123".
 */
export const normalizeSku = (sku: string): string => {
    if (!sku) return "";
    // Remove all non-alphanumeric chars first to be safe
    const clean = sku.replace(/[^a-zA-Z0-9]/g, "");
    // Remove leading zeros
    return clean.replace(/^0+/, "");
};

/**
 * ULTRA-AGGRESSIVE NORMALIZATION FOR MATCHING
 * Used to compare ERP Orders and Labels between Local DB and Cloud.
 * 1. Converts to String.
 * 2. Removes Accents (NFD normalization).
 * 3. Uppercases.
 * 4. Removes ALL whitespace and non-alphanumeric chars (except hyphens).
 * 
 * Example: "  Caja N° 1  " -> "CAJAN1"
 */
export const normalizeKey = (str: any): string => {
    if (str === null || str === undefined) return '';
    return String(str)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents (é -> e, ñ -> n)
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, ""); // Keep only Letters, Numbers, and Hyphens. Strip spaces, dots, #, etc.
};

/**
 * Generates a unique signature for a session based on ERP and Label.
 * Handles empty/null labels by defaulting to "GENERAL".
 */
export const generateCompositeKey = (erp: any, label: any): string => {
    const l = normalizeKey(label);
    // Treat empty, NULL, or UNDEFINED strings as the "GENERAL" group
    const finalLabel = (l === '' || l === 'NULL' || l === 'UNDEFINED') ? "GENERAL" : l;
    return `${normalizeKey(erp)}_${finalLabel}`;
};
