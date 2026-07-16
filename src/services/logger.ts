import { db, SystemLog } from '../db';
import { telemetry } from './telemetryService';

const MAX_LOGS = 2000;

// Tipos para el logger
type LogLevel = SystemLog['level'];
export type LoggerDetails = Record<string, unknown> | string | number | boolean | null | unknown;

const safeStringify = (obj: unknown): string => {
  const cache = new Set();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  });
};

const writeLog = async (level: LogLevel, module: string, message: string, details?: LoggerDetails) => {
  try {
    const timestamp = Date.now();
    let messageStr = String(message);
    if (typeof message === 'object' && message !== null) {
      try {
        messageStr = (message as { message?: string }).message || safeStringify(message);
      } catch {
        messageStr = '[Unstringifiable Object]';
      }
    }
    
    // Consola formateada para desarrollo
    const style = level === 'error' ? 'color: #ff4d4d; font-weight: bold' 
      : level === 'success' ? 'color: #2ecc71' 
      : 'color: #3498db';
    console.debug(`%c[${module}] [${level.toUpperCase()}] ${messageStr}`, style, details || '');

    if (level === 'error') {
      telemetry.track('ERROR', module, { message: messageStr, details });
    }

    let detailsStr: string | undefined;
    if (details !== undefined) {
      if (typeof details === 'object') {
        try {
          detailsStr = safeStringify(details);
        } catch {
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
  } catch (e) {
    // Fallback silencioso si falla IndexedDB (ej. cuota excedida o bloqueo)
    // No usar console.warn aquí para evitar recursión
  }
};

// Constantes de contexto para módulos
export const LOG_CONTEXT = {
  SYNC: 'SyncManager',
  HAMMER: 'HammerLogic',
  RECEPTION: 'ReceptionLogic',
  EXPORT: 'ExportService',
  AUTH: 'Authentication',
  DATABASE: 'Database',
  SETTINGS: 'Settings',
  UI: 'UI',
  SCANNER: 'Scanner',
  PRINTER: 'Printer',
  API: 'API',
} as const;

export type LogContext = typeof LOG_CONTEXT[keyof typeof LOG_CONTEXT];

/**
 * Wrapper de logger con firma flexible
 * Detecta automáticamente el formato de los argumentos:
 * - logger.info(module, message, details) - Normal
 * - logger.info(message, error) - Console-style (para migración)
 * - logger.info(message) - Solo mensaje
 */
const flexibleLogger = (
  level: LogLevel,
  moduleOrMessage: string,
  messageOrError?: string | Error | LoggerDetails,
  details?: LoggerDetails
) => {
  let module: string;
  let message: string;
  let logDetails: LoggerDetails | undefined;

  if (messageOrError === undefined) {
    // Solo mensaje: logger.info('simple message')
    module = 'App';
    message = moduleOrMessage;
    logDetails = undefined;
  } else if (typeof messageOrError === 'string') {
    // Normal: logger.info('Module', 'message', details)
    module = moduleOrMessage;
    message = messageOrError;
    logDetails = details;
  } else if (messageOrError instanceof Error) {
    // Console-style: logger.info('message', error)
    module = moduleOrMessage;
    message = messageOrError.message;
    logDetails = { error: messageOrError, stack: messageOrError.stack };
  } else {
    // Details object: logger.info('message', { error: ... })
    module = moduleOrMessage;
    message = 'Log with details';
    logDetails = messageOrError;
  }

  return writeLog(level, module, message, logDetails);
};

export const logger = {
  info: (moduleOrMessage: string, messageOrError?: string | Error | LoggerDetails, details?: LoggerDetails) => 
    flexibleLogger('info', moduleOrMessage, messageOrError, details),
  
  warn: (moduleOrMessage: string, messageOrError?: string | Error | LoggerDetails, details?: LoggerDetails) => 
    flexibleLogger('warn', moduleOrMessage, messageOrError, details),
  
  error: (moduleOrMessage: string, messageOrError?: string | Error | LoggerDetails, details?: LoggerDetails) => 
    flexibleLogger('error', moduleOrMessage, messageOrError, details),
  
  success: (moduleOrMessage: string, messageOrError?: string | Error | LoggerDetails, details?: LoggerDetails) => 
    flexibleLogger('success', moduleOrMessage, messageOrError, details),
  
  debug: (moduleOrMessage: string, messageOrError?: string | Error | LoggerDetails, details?: LoggerDetails) => 
    flexibleLogger('info', moduleOrMessage, messageOrError, details),
  
  // Métodos originales con firma fija (para uso explícito)
  infoFixed: (module: LogContext | string, message: string, details?: LoggerDetails) => 
    writeLog('info', module, message, details),
  
  warnFixed: (module: LogContext | string, message: string, details?: LoggerDetails) => 
    writeLog('warn', module, message, details),
  
  errorFixed: (module: LogContext | string, message: string, details?: LoggerDetails) => 
    writeLog('error', module, message, details),
  
  successFixed: (module: LogContext | string, message: string, details?: LoggerDetails) => 
    writeLog('success', module, message, details),
  
  getRecent: async (limit = 200): Promise<SystemLog[]> => {
    return await db.logs.orderBy('timestamp').reverse().limit(limit).toArray();
  },
  
  clear: async (): Promise<void> => {
    await db.logs.clear();
    logger.info('System', 'Log de auditoría vaciado.');
  }
};
