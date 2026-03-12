
import { db, SystemLog } from '../db';

const MAX_LOGS = 2000; 

const writeLog = async (level: SystemLog['level'], module: string, message: string, details?: any) => {
 try {
 const timestamp = Date.now();
 // Consola formateada para desarrollo
 const style = level === 'error' ? 'color: #ff4d4d; font-weight: bold' : level === 'success' ? 'color: #2ecc71' : 'color: #3498db';
 console.log(`%c[${module}] [${level.toUpperCase()}] ${message}`, style, details || '');

 await db.logs.add({
 level,
 module,
 message,
 details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : undefined,
 timestamp
 });

 // Cleanup selectivo (1 de cada 20 llamadas)
 if (Math.random() < 0.05) {
 const count = await db.logs.count();
 if (count > MAX_LOGS) {
 const keys = await db.logs.orderBy('timestamp').limit(count - MAX_LOGS).primaryKeys();
 await db.logs.bulkDelete(keys);
 }
 }
 } catch (e) {
 // Fallback silencioso si falla IndexedDB
 console.warn("Logger persistency failed", e);
 }
};

export const logger = {
 info: (module: string, message: string, details?: any) => writeLog('info', module, message, details),
 warn: (module: string, message: string, details?: any) => writeLog('warn', module, message, details),
 error: (module: string, message: string, details?: any) => writeLog('error', module, message, details),
 success: (module: string, message: string, details?: any) => writeLog('success', module, message, details),
 
 getRecent: async (limit = 200) => {
 return await db.logs.orderBy('timestamp').reverse().limit(limit).toArray();
 },
 
 clear: async () => {
 await db.logs.clear();
 logger.info('System', 'Log de auditoría vaciado.');
 }
};
