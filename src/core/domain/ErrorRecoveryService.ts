/**
 * ErrorRecoveryService - Sistema de recuperación de errores
 *
 * Proporciona:
 * - Retry con exponential backoff
 * - Fallback values
 * - Circuit breaker
 * - Error boundaries
 * - Recovery strategies
 */

import { logger } from '@/services/logger';
import { EventBus, AppEvents } from '@/core/events/EventBus';

// ============================================================================
// TIPOS
// ============================================================================

export type RecoveryStrategy = 'retry' | 'fallback' | 'degrade' | 'skip' | 'abort';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RecoveryConfig {
  strategy: RecoveryStrategy;
  retry?: RetryConfig;
  fallbackValue?: unknown;
  onRetry?: (attempt: number, error: Error) => void;
  onFallback?: (error: Error, fallback: unknown) => void;
  onDegrade?: (error: Error) => void;
}

export interface RecoveryResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  attempts: number;
  strategy: RecoveryStrategy;
  recovered: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  strategy: 'retry',
  retry: DEFAULT_RETRY_CONFIG,
};

// ============================================================================
// UTILIDADES
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  let delayMs = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);

  // Cap at max delay
  delayMs = Math.min(delayMs, config.maxDelay);

  // Add jitter (0-25% randomness)
  if (config.jitter) {
    const jitterMs = delayMs * Math.random() * 0.25;
    delayMs += jitterMs;
  }

  return Math.round(delayMs);
}

// ============================================================================
// SERVICE
// ============================================================================

class ErrorRecoveryServiceClass {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private recoveryStrategies = new Map<string, RecoveryConfig>();

  /**
   * Ejecutar función con recuperación de errores
   */
  async execute<T>(
    fn: () => Promise<T>,
    config: Partial<RecoveryConfig> = {},
    operationId?: string
  ): Promise<RecoveryResult<T>> {
    const fullConfig = { ...DEFAULT_RECOVERY_CONFIG, ...config };
    const id = operationId || crypto.randomUUID();

    // Verificar circuit breaker si está registrado
    const breaker = this.circuitBreakers.get(id);
    if (breaker && breaker.isOpen()) {
      logger.warn('ErrorRecovery', 'Circuit breaker open', { id });

      if (fullConfig.strategy === 'fallback' && fullConfig.fallbackValue !== undefined) {
        return {
          success: true,
          value: fullConfig.fallbackValue as T,
          attempts: 0,
          strategy: 'fallback',
          recovered: true,
        };
      }

      return {
        success: false,
        error: new Error('Circuit breaker open'),
        attempts: 0,
        strategy: fullConfig.strategy,
        recovered: false,
      };
    }

    // Estrategia
    switch (fullConfig.strategy) {
      case 'retry':
        return this.executeWithRetry(fn, fullConfig, id);

      case 'fallback':
        return this.executeWithFallback(fn, fullConfig, id);

      case 'degrade':
        return this.executeWithDegrade(fn, fullConfig, id);

      case 'skip':
        return this.executeWithSkip(fn, fullConfig, id);

      case 'abort':
        return this.executeWithAbort(fn, fullConfig, id);

      default:
        return this.executeDefault(fn);
    }
  }

  /**
   * Retry con exponential backoff
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RecoveryConfig,
    id: string
  ): Promise<RecoveryResult<T>> {
    const { onRetry, fallbackValue } = config;
    const retryConfig = config.retry || DEFAULT_RETRY_CONFIG;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const value = await fn();

        // Registrar éxito en circuit breaker
        this.circuitBreakers.get(id)?.recordSuccess();

        return {
          success: true,
          value,
          attempts: attempt,
          strategy: 'retry',
          recovered: attempt > 1,
        };
      } catch (error) {
        lastError = error as Error;

        logger.warn('ErrorRecovery', `Attempt ${attempt} failed`, {
          id,
          error: lastError.message,
          remaining: retryConfig.maxAttempts - attempt,
        });

        onRetry?.(attempt, lastError);

        // Publicar evento
        EventBus.publish(AppEvents.ERROR_OCCURRED, {
          operationId: id,
          attempt,
          error: lastError,
        });

        // Esperar antes de reintentar
        if (attempt < retryConfig.maxAttempts) {
          const delayMs = calculateDelay(attempt, retryConfig);
          await delay(delayMs);
        }
      }
    }

    // Todos los intentos fallaron
    this.circuitBreakers.get(id)?.recordFailure();

    // Intentar fallback si está configurado
    if (fallbackValue !== undefined && lastError) {
      logger.info('ErrorRecovery', 'Using fallback', { id });
      onRetry?.(-1, lastError);
      return {
        success: true,
        value: fallbackValue as T,
        attempts: retryConfig.maxAttempts,
        strategy: 'fallback',
        recovered: true,
      };
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: retryConfig.maxAttempts,
      strategy: 'retry',
      recovered: false,
    };
  }

  /**
   * Fallback inmediato
   */
  private async executeWithFallback<T>(
    fn: () => Promise<T>,
    config: RecoveryConfig,
    _id: string
  ): Promise<RecoveryResult<T>> {
    try {
      const value = await fn();
      return {
        success: true,
        value,
        attempts: 1,
        strategy: 'fallback',
        recovered: false,
      };
    } catch (error) {
      const err = error as Error;

      if (config.fallbackValue !== undefined) {
        config.onFallback?.(err, config.fallbackValue);

        return {
          success: true,
          value: config.fallbackValue as T,
          attempts: 1,
          strategy: 'fallback',
          recovered: true,
        };
      }

      return {
        success: false,
        error: err,
        attempts: 1,
        strategy: 'fallback',
        recovered: false,
      };
    }
  }

  /**
   * Degradar gracefully
   */
  private async executeWithDegrade<T>(
    fn: () => Promise<T>,
    config: RecoveryConfig,
    id: string
  ): Promise<RecoveryResult<T>> {
    try {
      return await this.executeWithFallback(fn, config, id);
    } catch (error) {
      const err = error as Error;
      config.onDegrade?.(err);

      EventBus.publish(AppEvents.ERROR_RECOVERED, {
        operationId: id,
        error: err,
        degraded: true,
      });

      // Retornar valor degradado
      return {
        success: true,
        value: config.fallbackValue as T,
        attempts: 1,
        strategy: 'degrade',
        recovered: true,
      };
    }
  }

  /**
   * Saltar operación
   */
  private async executeWithSkip<T>(
    fn: () => Promise<T>,
    _config: RecoveryConfig,
    _id: string
  ): Promise<RecoveryResult<T>> {
    try {
      const value = await fn();
      return {
        success: true,
        value,
        attempts: 1,
        strategy: 'skip',
        recovered: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        attempts: 1,
        strategy: 'skip',
        recovered: false,
      };
    }
  }

  /**
   * Abortar inmediatamente
   */
  private async executeWithAbort<T>(
    fn: () => Promise<T>,
    _config: RecoveryConfig,
    _id: string
  ): Promise<RecoveryResult<T>> {
    try {
      const value = await fn();
      return {
        success: true,
        value,
        attempts: 1,
        strategy: 'abort',
        recovered: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        attempts: 1,
        strategy: 'abort',
        recovered: false,
      };
    }
  }

  /**
   * Default: ejecutar sin recovery
   */
  private async executeDefault<T>(fn: () => Promise<T>): Promise<RecoveryResult<T>> {
    try {
      const value = await fn();
      return {
        success: true,
        value,
        attempts: 1,
        strategy: 'abort',
        recovered: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        attempts: 1,
        strategy: 'abort',
        recovered: false,
      };
    }
  }

  /**
   * Registrar circuit breaker para una operación
   */
  registerCircuitBreaker(id: string, config?: Partial<CircuitBreakerConfig>): void {
    this.circuitBreakers.set(id, new CircuitBreaker(config));
  }

  /**
   * Obtener estado del circuit breaker
   */
  getCircuitBreakerState(id: string): 'closed' | 'open' | 'half-open' | 'disabled' {
    const breaker = this.circuitBreakers.get(id);
    return breaker?.getState() || 'disabled';
  }

  /**
   * Registrar estrategia de recovery
   */
  registerStrategy(id: string, config: RecoveryConfig): void {
    this.recoveryStrategies.set(id, config);
  }

  /**
   * Obtener estrategia
   */
  getStrategy(id: string): RecoveryConfig | undefined {
    return this.recoveryStrategies.get(id);
  }
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms
}

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000, // 1 minuto
    };
  }

  isOpen(): boolean {
    if (this.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = 'half-open';
        this.successes = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  recordSuccess(): void {
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'closed';
      }
    }
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const ErrorRecoveryService = new ErrorRecoveryServiceClass();

export default ErrorRecoveryService;
