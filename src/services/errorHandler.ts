/**
 * ERROR HANDLER CENTRALIZADO
 * 
 * Problema original: Había una mezcla de:
 * - logger.error() para logging
 * - console.error() directo
 * - addToast() para UI
 * 
 * Solución: Un wrapper centralizado que maneja los 3 de forma consistente.
 */

import { logger } from './logger';
import { useToastStore } from '../store/useToastStore';

export type ErrorSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type ErrorContext = 'sync' | 'database' | 'ui' | 'hardware' | 'network' | 'validation' | 'unknown';

interface ErrorHandlerOptions {
  severity: ErrorSeverity;
  context: ErrorContext;
  showToast: boolean;
  toastDuration?: number;
  logToConsole?: boolean;
  logToTelemetry?: boolean;
}

const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  severity: 'error',
  context: 'unknown',
  showToast: true,
  toastDuration: 4000,
  logToConsole: true,
  logToTelemetry: true,
};

/**
 * Clasifica el tipo de error para dar mensajes apropiados al usuario
 */
const classifyError = (error: unknown): { severity: ErrorSeverity; context: ErrorContext } => {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error);
  
  // Clasificación por mensaje
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline') || msg.includes('connection')) {
    return { severity: 'warning', context: 'network' };
  }
  if (msg.includes('sync') || msg.includes('supabase') || msg.includes('upload') || msg.includes('download')) {
    return { severity: 'error', context: 'sync' };
  }
  if (msg.includes('indexeddb') || msg.includes('database') || msg.includes('db.')) {
    return { severity: 'critical', context: 'database' };
  }
  if (msg.includes('validation') || msg.includes('invalid') || msg.includes('schema')) {
    return { severity: 'warning', context: 'validation' };
  }
  
  return { severity: 'error', context: 'unknown' };
};

/**
 * Mensajes de usuario amigables según el contexto
 */
const USER_MESSAGES: Record<ErrorContext, Record<ErrorSeverity, string>> = {
  network: {
    debug: '',
    info: 'Conexión inestable detectada.',
    warning: 'Problemas de conexión. Trabajando offline.',
    error: 'Error de red. Por favor verifica tu conexión.',
    critical: 'Sin conexión a internet. Modo offline activado.'
  },
  sync: {
    debug: '',
    info: 'Sincronización completada.',
    warning: 'Algunos datos no se sincronizaron correctamente.',
    error: 'Error al sincronizar. Los datos se guardarán localmente.',
    critical: 'Error crítico de sincronización. Contacta a soporte.'
  },
  database: {
    debug: '',
    info: '',
    warning: 'Advertencia de base de datos.',
    error: 'Error al acceder a la base de datos local.',
    critical: 'Base de datos no disponible. Por favor reinicia la app.'
  },
  validation: {
    debug: '',
    info: '',
    warning: 'Por favor verifica los datos ingresados.',
    error: 'Error de validación. Revisa los campos marcados.',
    critical: 'Datos inválidos. No se puede continuar.'
  },
  ui: {
    debug: '',
    info: '',
    warning: 'Algo salió mal en la interfaz.',
    error: 'Error en la interfaz. Por favor intenta de nuevo.',
    critical: 'Error crítico de interfaz. Refresca la página.'
  },
  hardware: {
    debug: '',
    info: '',
    warning: 'Problemas con el escáner.',
    error: 'Error de hardware. Verifica los dispositivos conectados.',
    critical: 'Hardware no disponible.'
  },
  unknown: {
    debug: '',
    info: '',
    warning: 'Algo inesperado ocurrió.',
    error: 'Ocurrió un error. Por favor intenta de nuevo.',
    critical: 'Error inesperado. Por favor contacta a soporte.'
  }
};

/**
 * Wrapper centralizado para manejo de errores.
 * 
 * @example
 * // Uso simple
 * handleError(new Error('Network timeout'));
 * 
 * // Uso con opciones
 * handleError(error, {
 *   severity: 'critical',
 *   context: 'sync',
 *   showToast: true
 * });
 */
export const handleError = (
  error: unknown,
  partialOptions?: Partial<ErrorHandlerOptions>
): Error => {
  const classified = classifyError(error);
  const options: ErrorHandlerOptions = {
    ...DEFAULT_OPTIONS,
    ...classified,
    ...partialOptions,
  };

  const errorObj = error instanceof Error ? error : new Error(String(error));
  const { severity, context } = options;

  // 1. Log a consola (solo si está habilitado)
  if (options.logToConsole !== false) {
    const consoleMethod = severity === 'critical' || severity === 'error' ? 'error' : 
                          severity === 'warning' ? 'warn' : 'log';
    console[consoleMethod](
      `[${context.toUpperCase()}] [${severity.toUpperCase()}]`,
      errorObj.message,
      error
    );
  }

  // 2. Log persistente (IndexedDB + Telemetry)
  // Mapear severities a métodos del logger existentes
  const loggerMethod = severity === 'critical' ? 'error' 
    : severity === 'debug' ? 'info'
    : severity === 'warning' ? 'warn'
    : severity;
  (logger as any)[loggerMethod](
    context.toUpperCase(),
    errorObj.message,
    {
      severity,
      context,
      stack: errorObj.stack,
      timestamp: new Date().toISOString(),
    }
  );

  // 3. Toast al usuario (solo si está habilitado y hay mensaje)
  if (options.showToast) {
    const userMessage = USER_MESSAGES[context][severity];
    if (userMessage) {
      const toast = useToastStore.getState();
      
      if (severity === 'critical' || severity === 'error') {
        toast.addToast(userMessage, 'error', options.toastDuration);
      } else if (severity === 'warning') {
        toast.addToast(userMessage, 'warning', options.toastDuration);
      } else {
        toast.addToast(userMessage, 'info', options.toastDuration);
      }
    }
  }

  return errorObj;
};

/**
 * Wrapper para async operations que automáticamente maneja errores.
 * 
 * @example
 * const data = await withErrorHandling(
 *   () => fetchData(),
 *   { context: 'sync', showToast: true }
 * );
 */
export const withErrorHandling = async <T>(
  fn: () => Promise<T>,
  partialOptions?: Partial<ErrorHandlerOptions>
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    handleError(error, partialOptions);
    return null;
  }
};

/**
 * Crea un error con contexto adicional.
 * Útil para wrapped errors.
 */
export const wrapError = (
  error: unknown,
  context: string,
  additionalInfo?: Record<string, any>
): Error => {
  const originalMessage = error instanceof Error ? error.message : String(error);
  const wrapped = new Error(`${context}: ${originalMessage}`);
  
  if (error instanceof Error && error.stack) {
    wrapped.stack = error.stack;
  }
  
  return wrapped;
};

export default { handleError, withErrorHandling, wrapError };
