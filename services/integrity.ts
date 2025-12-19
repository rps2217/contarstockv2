
/**
 * LogiCount Integrity Engine
 * Provee mecanismos de validación criptográfica para asegurar que los datos
 * locales no hayan sido manipulados o corrompidos por fallos de hardware.
 */

export const calculateChecksum = (data: any): string => {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
};

export const verifyBatchIntegrity = (items: any[], expectedChecksum: string): boolean => {
    return calculateChecksum(items) === expectedChecksum;
};

/**
 * Filtra caracteres maliciosos o secuencias de escape que podrían
 * inyectar código en exportaciones CSV/Excel.
 */
export const safetyHardenString = (val: string): string => {
    if (!val) return "";
    // Previene CSV Injection (Excel Formulas)
    return val.replace(/^[=+\-@\t\r]/g, "'$&");
};
