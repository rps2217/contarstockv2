import { logger } from '@/services/logger';
/**
 * =============================================================================
 * RETRY UTILITY - Reintento con Backoff Exponencial
 * =============================================================================
 * 
 * Proporciona funciones para reintentar operaciones que pueden fallar
 * transitoriamente (errores de red, timeouts, etc.)
 * 
 * ESTRATEGIA DE BACKOFF:
 * 
 * Intento 1: inmediato
 * Intento 2: 1 segundo
 * Intento 3: 2 segundos
 * Intento 4: 4 segundos
 * Intento 5: 8 segundos
 * ... hasta maxDelay
 * 
 * @module retry
 */

export interface RetryOptions {
  /** Número máximo de reintentos (default: 3) */
  maxRetries?: number;
  /** Delay base en ms (default: 1000) */
  baseDelay?: number;
  /** Delay máximo en ms (default: 30000) */
  maxDelay?: number;
  /** Multiplicador de backoff (default: 2) */
  backoffMultiplier?: number;
  /** Funciones que NO deben reintentarse */
  retryableErrors?: string[];
  /** Callback antes de cada retry */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

/** Errores que típicamente son transitorios y deben reintentarse */
export const DEFAULT_RETRYABLE_ERRORS = [
  'Failed to fetch',
  'Network request failed',
  'NetworkError',
  'ECONNRESET',
  'ETIMEDOUT',
  'socket hang up',
  'offline',
  'timeout',
  'Cerrado por falta de red',
  'No se ha conectado a Internet',
];

/** Errores que NO deben reintentarse */
const NON_RETRYABLE_ERRORS = [
  '401',
  '403',
  'not authenticated',
  'invalid token',
  'Table not found',
  'does not exist',
  'duplicate key',
  'unique constraint',
];

export const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: DEFAULT_RETRYABLE_ERRORS,
  onRetry: () => {},
};

/**
 * Calcula el delay para un intento específico con backoff exponencial
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  // Añadir jitter aleatorio (±25%) para evitar thundering herd
  const exponentialDelay = Math.min(baseDelay * Math.pow(multiplier, attempt - 1), maxDelay);
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
  return Math.round(exponentialDelay + jitter);
}

/**
 * Determina si un error es reintentable
 */
export function isRetryableError(error: Error | string, retryableErrors: string[]): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Verificar errores no reintentables primero
  for (const pattern of NON_RETRYABLE_ERRORS) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return false;
    }
  }
  
  // Verificar errores reintentables
  for (const pattern of retryableErrors) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  // Por defecto, reintentar errores de red
  return errorMessage.toLowerCase().includes('network') ||
         errorMessage.toLowerCase().includes('fetch') ||
         errorMessage.toLowerCase().includes('connection');
}

/**
 * Función para dormir por un tiempo específico
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry con backoff exponencial
 * 
 * @param fn - Función async a ejecutar
 * @param options - Opciones de retry
 * @returns Resultado con información del intento
 * 
 * @example
 * const result = await withRetry(
 *   () => api.fetchData(),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 * 
 * if (result.success) {
 *   console.log('Data:', result.data);
 * } else {
 *   console.log('Error después de', result.attempts, 'intentos');
 * }
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
        totalDuration: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Si es el último intento o error no reintentable, salir
      if (attempt > opts.maxRetries || !isRetryableError(lastError, opts.retryableErrors)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
        };
      }
      
      // Calcular delay y esperar
      const delay = calculateBackoff(
        attempt,
        opts.baseDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );
      
      opts.onRetry(attempt, lastError, delay);
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError!,
    attempts: opts.maxRetries + 1,
    totalDuration: Date.now() - startTime,
  };
}

/**
 * Retry específico para operaciones de sync
 */
export interface SyncRetryOptions extends RetryOptions {
  /** Table siendo sincronizada (para logging) */
  tableName?: string;
  /** operation siendo sincronizada */
  operation?: 'push' | 'pull' | 'delete';
}

export async function withSyncRetry<T>(
  fn: () => Promise<T>,
  options: SyncRetryOptions = {}
): Promise<RetryResult<T>> {
  const { tableName, operation, ...retryOptions } = options;
  
  return withRetry(fn, {
    ...retryOptions,
    onRetry: (attempt, error, delay) => {
      console.warn(
        `[Sync] ${operation?.toUpperCase() || 'SYNC'} retry for ${tableName || 'unknown'}: ` +
        `Attempt ${attempt} failed. Retrying in ${Math.round(delay / 1000)}s...`
      );
      retryOptions.onRetry?.(attempt, error, delay);
    },
  });
}

/**
 * Retry con circuit breaker pattern
 */
export interface CircuitBreakerOptions extends RetryOptions {
  failureThreshold?: number;
  resetTimeout?: number;
}

const circuitBreakers: Map<string, {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}> = new Map();

export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  key: string,
  options: CircuitBreakerOptions = {}
): Promise<RetryResult<T>> {
  const breaker = circuitBreakers.get(key) || { failures: 0, lastFailure: 0, state: 'closed' };
  circuitBreakers.set(key, breaker);

  const { failureThreshold = 5, resetTimeout = 60000, ...retryOptions } = options;

  // Si el circuit breaker está abierto
  if (breaker.state === 'open') {
    if (Date.now() - breaker.lastFailure > resetTimeout) {
      breaker.state = 'half-open';
      breaker.failures = 0;
    } else {
      return {
        success: false,
        error: new Error(`Circuit breaker open for ${key}. Try again later.`),
        attempts: 0,
        totalDuration: 0,
      };
    }
  }

  const result = await withRetry(fn, retryOptions);

  if (!result.success) {
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= failureThreshold) {
      breaker.state = 'open';
    }
  } else if (breaker.state === 'half-open') {
    breaker.state = 'closed';
    breaker.failures = 0;
  }

  return result;
}

/**
 * Reset circuit breaker manually
 */
export function resetCircuitBreaker(key: string): void {
  circuitBreakers.delete(key);
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus(key: string): { state: string; failures: number } | null {
  const breaker = circuitBreakers.get(key);
  if (!breaker) return null;
  return {
    state: breaker.state,
    failures: breaker.failures,
  };
}
