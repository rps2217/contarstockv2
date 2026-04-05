
/**
 * LogiCount Integrity Engine v2.0
 * Protege contra corrupción silenciosa de datos en almacenamiento flash móvil.
 */

export const generateRecordHash = (data: any): string => {
 const str = JSON.stringify(data);
 let hash = 0;
 for (let i = 0; i < str.length; i++) {
 const char = str.charCodeAt(i);
 hash = ((hash << 5) - hash) + char;
 hash = hash & hash; // Convertir a entero de 32 bits
 }
 return Math.abs(hash).toString(16);
};

export const verifyIntegrity = (record: any, storedHash: string): boolean => {
 return generateRecordHash(record) === storedHash;
};

/**
 * Sanitiza strings para prevenir inyecciones en exportaciones CSV/Excel
 */
export const safetyHarden = (val: string): string => {
 if (!val) return "";
 return val.replace(/^[=+\-@\t\r]/g, "'$&");
};

// Forced GitHub sync
