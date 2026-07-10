/**
 * CircuitBreaker - Prevents cascading failures in external services
 */

import { SyncError } from './SyncError';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms to wait before trying again when OPEN
  monitorWindow?: number; // window to count failures (ms)
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
  monitorWindow: 60000 // 1 minute
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly name: string;

  constructor(name: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): { state: CircuitState; failures: number; successes: number } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes
    };
  }

  private shouldOpen(): boolean {
    return this.failures >= this.options.failureThreshold;
  }

  private shouldClose(): boolean {
    return this.successes >= this.options.successThreshold;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'CLOSED') {
      this.failures = 0;
      this.successes = 0;
    } else if (newState === 'HALF_OPEN') {
      this.successes = 0;
    }

    console.debug(`[CircuitBreaker:${this.name}] ${oldState} → ${newState}`);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.options.timeout) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw SyncError.circuitOpen(this.name);
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'HALF_OPEN') {
        this.successes++;
        if (this.shouldClose()) {
          this.transitionTo('CLOSED');
        }
      } else if (this.state === 'CLOSED') {
        // Reset failures on success in CLOSED state
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.lastFailureTime = Date.now();
      this.failures++;

      if (this.state === 'HALF_OPEN') {
        // Any failure in HALF_OPEN goes back to OPEN
        this.transitionTo('OPEN');
      } else if (this.state === 'CLOSED' && this.shouldOpen()) {
        this.transitionTo('OPEN');
      }

      throw error;
    }
  }

  reset(): void {
    this.transitionTo('CLOSED');
  }
}

// Singleton registry for circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>();

export const getCircuitBreaker = (
  name: string,
  options?: Partial<CircuitBreakerOptions>
): CircuitBreaker => {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, options));
  }
  return circuitBreakers.get(name)!;
};

export const resetAllCircuitBreakers = (): void => {
  circuitBreakers.forEach(cb => cb.reset());
};
