
import { db, SystemLog } from '../db';
import { telemetry } from './telemetryService';

const MAX_LOGS = 2000; 

const safeStringify = (obj: any) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  });
};

const writeLog = async (level: SystemLog['level'], module: string, message: any, details?: any) => {
  try {
    const timestamp = Date.now();
    let messageStr = String(message);
    if (typeof message === 'object') {
      try {
        messageStr = message.message || safeStringify(message);
      } catch (e) {
        messageStr = '[Unstringifiable Object]';
      }
    }
    
    // Consola formateada para desarrollo
    const style = level === 'error' ? 'color: #ff4d4d; font-weight: bold' : level === 'success' ? 'color: #2ecc71' : 'color: #3498db';
    console.log(`%c[${module}] [${level.toUpperCase()}] ${messageStr}`, style, details || '');

    if (level === 'error') {
      telemetry.track('ERROR', module, { message: messageStr, details });
    }

    let detailsStr = undefined;
    if (details) {
      if (typeof details === 'object') {
        try {
          detailsStr = safeStringify(details);
        } catch (e) {
          detailsStr = '[Unstringifiable Details]';
        }
      } else {
        detailsStr = String(details);
      }
    }

    await db.logs.add({
      level,
      module,
      message: messageStr,
      details: detailsStr,
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
  } catch (e: any) {
    // Fallback silencioso si falla IndexedDB (ej. cuota excedida o bloqueo)
    console.warn("Logger persistency failed:", e?.message || e);
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

// Forced GitHub sync
