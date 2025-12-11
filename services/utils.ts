
export const generateUUID = (): string => {
  // Use modern crypto API if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments (though minimal risk in modern browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const sanitizeBarcode = (code: string): string => {
    if (!code) return "";
    // Remove invisible characters, zero-width spaces, control chars, and trim
    return code
        .trim()
        .toUpperCase()
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "");
};
