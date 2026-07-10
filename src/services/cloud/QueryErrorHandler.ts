/**
 * QueryErrorHandler - Manejo centralizado de errores de Supabase
 *
 * Supabase puede devolver errores 406 (Not Acceptable) cuando:
 * 1. Row Level Security (RLS) bloquea el acceso
 * 2. La tabla no existe
 * 3. El usuario no tiene permisos
 * 4. El registro no existe (DELETE en registro inexistente)
 *
 * Este módulo proporciona funciones para manejar estos errores gracefully.
 */

import { logger } from '../logger';

/**
 * Códigos de error de Supabase que，我们应该 ignorar
 */
const IGNORED_ERROR_CODES = new Set([
  'PGRST204', // Column 'xxx' doesn't exist
  'PGRST205', // Table 'xxx' doesn't exist
  'PGRST206', // Authorization error
  'PGRST301', // JWT expired
  '22P02',    // Invalid input syntax (UUID malformado)
]);

/**
 * Mensajes de error que，我们应该 ignorar
 */
const IGNORED_ERROR_PATTERNS = [
  /not find/i,
  /does not exist/i,
  /not found/i,
  /authorization denied/i,
  /permission denied/i,
  /invalid input/i,
  /could not find/i,
  /could not parse/i,
];

/**
 * Códigos HTTP 4xx que indican recursos no encontrados
 */
const NOT_FOUND_HTTP_CODES = ['406', '404', '425'];

/**
 * Mapa para tracking de errores repetidos (para evitar spam de logs)
 */
const recentErrors = new Map<string, { count: number; lastTime: number }>();
const ERROR_LOG_COOLDOWN_MS = 60000;

export interface QueryErrorResult {
  shouldRetry: boolean;
  shouldIgnore: boolean;
  isOffline: boolean;
  errorMessage: string | null;
  isNotFound: boolean;
  errorCode?: string;
}

/**
 * Verifica si debemos hacer log de un error (rate limiting)
 */
function shouldLogError(errorKey: string): boolean {
  const now = Date.now();
  const entry = recentErrors.get(errorKey);
  
  if (!entry || now - entry.lastTime > ERROR_LOG_COOLDOWN_MS) {
    recentErrors.set(errorKey, { count: 1, lastTime: now });
    return true;
  }
  
  entry.count++;
  entry.lastTime = now;
  return entry.count === 1 || entry.count % 10 === 0;
}

/**
 * Analiza un error de Supabase y determina cómo manejarlo
 */
export function analyzeSupabaseError(
  error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined,
  queryDescription?: string
): QueryErrorResult {
  if (!error) {
    return {
      shouldRetry: false,
      shouldIgnore: false,
      isOffline: false,
      errorMessage: null,
      isNotFound: false,
    };
  }

  const errorCode = error.code || '';
  const errorMessage = error.message || '';
  const errorDetails = error.details || '';
  const errorHint = error.hint || '';

  const fullErrorText = `${errorCode} ${errorMessage} ${errorDetails} ${errorHint}`;
  const errorKey = `${queryDescription || 'unknown'}:${errorCode}:${errorMessage.substring(0, 50)}`;

  // Verificar si es un error de red (offline)
  if (
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('net::ERR') ||
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('Cerrado por falta de red')
  ) {
    if (shouldLogError(errorKey)) {
      logger.debug('QUERY_ERROR', `Network error in ${queryDescription}`);
    }
    return {
      shouldRetry: false,
      shouldIgnore: true,
      isOffline: true,
      errorMessage: null,
      isNotFound: false,
    };
  }

  // Verificar si es un error que debemos ignorar
  if (IGNORED_ERROR_CODES.has(errorCode)) {
    if (shouldLogError(errorKey)) {
      logger.debug('QUERY_ERROR', `Ignored Supabase error ${errorCode} in ${queryDescription}`);
    }
    return {
      shouldRetry: false,
      shouldIgnore: true,
      isOffline: false,
      errorMessage: null,
      isNotFound: true,
      errorCode,
    };
  }

  // Verificar patrones de errores ignorables
  for (const pattern of IGNORED_ERROR_PATTERNS) {
    if (pattern.test(fullErrorText)) {
      if (shouldLogError(errorKey)) {
        logger.debug('QUERY_ERROR', `Ignored error pattern in ${queryDescription}: ${errorMessage}`);
      }
      return {
        shouldRetry: false,
        shouldIgnore: true,
        isOffline: false,
        errorMessage: null,
        isNotFound: true,
        errorCode,
      };
    }
  }

  // Verificar código de estado HTTP para errores 406/404
  for (const httpCode of NOT_FOUND_HTTP_CODES) {
    if (errorMessage.includes(httpCode)) {
      if (shouldLogError(errorKey)) {
        logger.debug('QUERY_ERROR', `HTTP ${httpCode} in ${queryDescription}`);
      }
      return {
        shouldRetry: false,
        shouldIgnore: true,
        isOffline: false,
        errorMessage: null,
        isNotFound: true,
        errorCode,
      };
    }
  }

  // Error desconocido pero no es crítico
  if (shouldLogError(errorKey)) {
    logger.warn('QUERY_ERROR', `Unhandled error in ${queryDescription}: [${errorCode}] ${errorMessage}`);
  }
  
  return {
    shouldRetry: true,
    shouldIgnore: false,
    isOffline: false,
    errorMessage: errorMessage,
    isNotFound: false,
    errorCode,
  };
}

/**
 * Wrapper para queries de Supabase que maneja errores
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: { code?: string; message?: string } | null }>,
  options: {
    queryDescription?: string;
    onError?: (result: QueryErrorResult) => void;
    defaultValue?: T | null;
  } = {}
): Promise<{ data: T | null; error: QueryErrorResult | null }> {
  const { queryDescription = 'unknown query', onError, defaultValue = null } = options;

  try {
    const result = await queryFn();

    if (result.error) {
      const errorAnalysis = analyzeSupabaseError(result.error, queryDescription);

      if (errorAnalysis.shouldIgnore) {
        logger.debug('SUPABASE_QUERY', `Ignoring error in ${queryDescription}`);
        onError?.(errorAnalysis);
        return { data: defaultValue, error: null };
      }

      if (errorAnalysis.shouldRetry) {
        onError?.(errorAnalysis);
        return {
          data: defaultValue,
          error: errorAnalysis
        };
      }
    }

    return { data: result.data, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorAnalysis = analyzeSupabaseError(
      { message: errorMessage } as any,
      queryDescription
    );

    if (errorAnalysis.shouldIgnore) {
      logger.debug('SUPABASE_QUERY', `Caught and ignored error in ${queryDescription}`);
      return { data: defaultValue, error: null };
    }

    logger.error('SUPABASE_QUERY', `Unhandled error in ${queryDescription}`, err);
    return { data: defaultValue, error: errorAnalysis };
  }
}

/**
 * Wrapper para operaciones de Supabase (insert, update, delete)
 */
export async function safeSupabaseMutation(
  mutationFn: () => Promise<{ error: { code?: string; message?: string } | null }>,
  options: {
    operationDescription?: string;
    onError?: (result: QueryErrorResult) => void;
  } = {}
): Promise<{ success: boolean; error: QueryErrorResult | null }> {
  const { operationDescription = 'unknown mutation', onError } = options;

  try {
    const result = await mutationFn();

    if (result.error) {
      const errorAnalysis = analyzeSupabaseError(result.error, operationDescription);

      if (errorAnalysis.shouldIgnore) {
        logger.debug('SUPABASE_MUTATION', `Ignoring error in ${operationDescription}`);
        onError?.(errorAnalysis);
        return { success: true, error: null };
      }

      onError?.(errorAnalysis);
      return { success: false, error: errorAnalysis };
    }

    return { success: true, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorAnalysis = analyzeSupabaseError(
      { message: errorMessage } as any,
      operationDescription
    );

    if (errorAnalysis.shouldIgnore) {
      return { success: true, error: null };
    }

    logger.error('SUPABASE_MUTATION', `Unhandled error in ${operationDescription}`, err);
    return { success: false, error: errorAnalysis };
  }
}

export default {
  analyzeSupabaseError,
  safeSupabaseQuery,
  safeSupabaseMutation,
  IGNORED_ERROR_CODES,
  IGNORED_ERROR_PATTERNS,
};
