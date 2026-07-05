"use client";
/**
 * rateLimit - Sistema de Rate Limiting con Exponential Backoff
 * 
 * Limita la cantidad de requests a APIs externas para evitar
 * rate limits y proporciona retry automático con backoff.
 */

interface RateLimitConfig {
  /** Máximo de requests permitidos */
  maxRequests: number;
  /** Ventana de tiempo en ms */
  windowMs: number;
  /** Requests que pueden burst */
  burstSize?: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

// Rate limiters por endpoint
const limiters = new Map<string, RequestRecord[]>();
const configs = new Map<string, RateLimitConfig>();

// Configuraciones predefinidas
export const RATE_LIMITS = {
  SUPABASE: { maxRequests: 60, windowMs: 60000 }, // 60 req/min
  API: { maxRequests: 100, windowMs: 60000 }, // 100 req/min
  SYNC: { maxRequests: 10, windowMs: 1000 }, // 10 req/s
  EXPORT: { maxRequests: 5, windowMs: 60000 }, // 5 req/min
  SEARCH: { maxRequests: 30, windowMs: 60000 }, // 30 req/min
} as const;

/**
 * Configurar rate limit para un endpoint
 */
export const configureRateLimit = (endpoint: string, config: RateLimitConfig) => {
  configs.set(endpoint, config);
};

/**
 * Verificar si se puede hacer un request
 */
export const canMakeRequest = (endpoint: string): { allowed: boolean; remaining: number; resetIn: number } => {
  const config = configs.get(endpoint) || { maxRequests: 60, windowMs: 60000 };
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Obtener o inicializar registros
  let records = limiters.get(endpoint) || [];
  
  // Filtrar solo requests dentro de la ventana
  records = records.filter(r => r.timestamp > windowStart);
  
  const currentCount = records.reduce((sum, r) => sum + r.count, 0);
  const remaining = Math.max(0, config.maxRequests - currentCount);
  
  // Calcular tiempo hasta que se libere un slot
  let resetIn = 0;
  if (records.length > 0) {
    const oldestInWindow = records[0].timestamp;
    resetIn = Math.max(0, oldestInWindow + config.windowMs - now);
  }

  return {
    allowed: currentCount < config.maxRequests,
    remaining,
    resetIn,
  };
};

/**
 * Registrar un request
 */
export const recordRequest = (endpoint: string, count = 1): void => {
  const now = Date.now();
  let records = limiters.get(endpoint) || [];
  
  // Limpiar ventana antigua
  const config = configs.get(endpoint) || { maxRequests: 60, windowMs: 60000 };
  const windowStart = now - config.windowMs;
  records = records.filter(r => r.timestamp > windowStart);
  
  // Agregar nuevo request
  records.push({ timestamp: now, count });
  
  // Limitar tamaño del array
  if (records.length > 1000) {
    records = records.slice(-500);
  }
  
  limiters.set(endpoint, records);
};

/**
 * Ejecutar función con rate limiting y retry
 */
export interface RateLimitOptions {
  endpoint?: string;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRateLimit?: (retryAfter: number) => void;
  onError?: (error: Error, attempt: number) => void;
}

export interface RateLimitResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  rateLimited: boolean;
}

export async function withRateLimit<T>(
  fn: () => Promise<T>,
  options: RateLimitOptions = {}
): Promise<RateLimitResult<T>> {
  const {
    endpoint = 'default',
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRateLimit,
  } = options;

  // Asegurar que existe config para este endpoint
  if (!configs.has(endpoint)) {
    configureRateLimit(endpoint, RATE_LIMITS.SUPABASE);
  }

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < maxRetries) {
    attempts++;
    
    // Verificar rate limit
    const { allowed, remaining, resetIn } = canMakeRequest(endpoint);
    
    if (!allowed) {
      // Rate limited - esperar y reintentar
      const delay = Math.min(resetIn + baseDelay * Math.pow(2, attempts - 1), maxDelay);
      
      if (onRateLimit) {
        onRateLimit(resetIn);
      }
      
      await sleep(delay);
      continue;
    }

    try {
      // Registrar request
      recordRequest(endpoint);
      
      // Ejecutar función
      const data = await fn();
      
      return {
        success: true,
        data,
        attempts,
        rateLimited: false,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Verificar si es error de rate limit (429)
      const isRateLimitError = 
        lastError.message.includes('429') ||
        lastError.message.includes('rate limit') ||
        lastError.message.includes('too many requests');
      
      if (isRateLimitError && attempts < maxRetries) {
        // Calcular delay con exponential backoff
        const backoffDelay = Math.min(
          baseDelay * Math.pow(2, attempts - 1) + Math.random() * 1000,
          maxDelay
        );
        
        if (onRateLimit) {
          onRateLimit(backoffDelay);
        }
        
        await sleep(backoffDelay);
        continue;
      }
      
      return {
        success: false,
        error: lastError.message,
        attempts,
        rateLimited: isRateLimitError,
      };
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Max retries exceeded',
    attempts,
    rateLimited: true,
  };
}

/**
 * Helper para dormir
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  failureThreshold?: number; // Fallos antes de abrir
  resetTimeout?: number; // ms antes de intentar снова
  halfOpenRequests?: number; // Requests en estado half-open
}

const circuits = new Map<string, {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  halfOpenCount: number;
}>();

/**
 * Verificar estado del circuit breaker
 */
export const isCircuitOpen = (name: string): boolean => {
  const circuit = circuits.get(name);
  if (!circuit) return false;
  
  if (circuit.state === 'closed') return false;
  
  if (circuit.state === 'open') {
    // Verificar si debe pasar a half-open
    if (Date.now() - circuit.lastFailure > (options.get(name)?.resetTimeout || 30000)) {
      circuit.state = 'half-open';
      circuit.halfOpenCount = 0;
      return false;
    }
    return true;
  }
  
  return false; // half-open permite requests
};

/**
 * Registrar fallo en circuit breaker
 */
export const recordCircuitFailure = (name: string, options: CircuitBreakerOptions = {}): void => {
  const opts = {
    failureThreshold: 5,
    resetTimeout: 30000,
    ...options,
  };
  
  let circuit = circuits.get(name);
  if (!circuit) {
    circuit = { state: 'closed', failures: 0, lastFailure: 0, halfOpenCount: 0 };
    circuits.set(name, circuit);
  }
  
  circuit.failures++;
  circuit.lastFailure = Date.now();
  
  if (circuit.state === 'half-open') {
    // Fallo en half-open = volver a open
    circuit.state = 'open';
  } else if (circuit.failures >= opts.failureThreshold) {
    circuit.state = 'open';
  }
};

/**
 * Registrar éxito en circuit breaker
 */
export const recordCircuitSuccess = (name: string): void => {
  const circuit = circuits.get(name);
  if (!circuit) return;
  
  if (circuit.state === 'half-open') {
    circuit.halfOpenCount++;
    if (circuit.halfOpenCount >= 1) {
      // Éxito en half-open = volver a closed
      circuit.state = 'closed';
      circuit.failures = 0;
    }
  }
};

/**
 * Helper para opciones de circuit
 */
const options = new Map<string, CircuitBreakerOptions>();

export const configureCircuit = (name: string, opts: CircuitBreakerOptions): void => {
  options.set(name, opts);
};

/**
 * Ejecutar con circuit breaker
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  opts: CircuitBreakerOptions = {}
): Promise<T> {
  configureCircuit(name, opts);
  
  if (isCircuitOpen(name)) {
    throw new Error(`Circuit breaker open for ${name}`);
  }
  
  try {
    const result = await fn();
    recordCircuitSuccess(name);
    return result;
  } catch (error) {
    recordCircuitFailure(name, opts);
    throw error;
  }
}

// =============================================================================
// DECORADORES/COMPOSABLES
// =============================================================================

/**
 * Hook para usar rate limiting en componentes
 */
export const useRateLimit = (endpoint: string, config?: RateLimitConfig) => {
  if (config) {
    configureRateLimit(endpoint, config);
  }
  
  return {
    canMakeRequest: () => canMakeRequest(endpoint),
    recordRequest: (count?: number) => recordRequest(endpoint, count),
    withLimit: <T>(fn: () => Promise<T>) => withRateLimit(fn, { endpoint }),
  };
};

export default {
  configureRateLimit,
  canMakeRequest,
  recordRequest,
  withRateLimit,
  withCircuitBreaker,
  isCircuitOpen,
  RATE_LIMITS,
};