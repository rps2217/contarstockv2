
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
