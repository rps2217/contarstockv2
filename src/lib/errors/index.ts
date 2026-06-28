/**
 * Errors - Sistema centralizado de errores tipados
 * 
 * Incluye:
 * - AppError: Clase base para todos los errores
 * - SyncError: Errores de sincronización
 * - DatabaseError: Errores de base de datos
 * - withRetry: Retry con exponential backoff
 * - CircuitBreaker: Protección contra cascadas de errores
 */

export { AppError } from './AppError';
export type { ErrorContext } from './AppError';

export { SyncError } from './SyncError';
export type { SyncErrorCode } from './SyncError';

export { DatabaseError } from './DatabaseError';
export type { DatabaseErrorCode } from './DatabaseError';

export { 
  withRetry, 
  calculateBackoff, 
  sleep, 
  retryable 
} from './retry';
export type { RetryOptions } from './retry';

export { 
  CircuitBreaker, 
  getCircuitBreaker, 
  resetAllCircuitBreakers 
} from './circuitBreaker';
export type { CircuitState, CircuitBreakerOptions } from './circuitBreaker';
