/**
 * SyncError - Errores específicos del sistema de sincronización
 */

import { AppError, ErrorContext } from './AppError';

export type SyncErrorCode =
  | 'SYNC_NETWORK_ERROR'
  | 'SYNC_AUTH_ERROR'
  | 'SYNC_TIMEOUT'
  | 'SYNC_CONFLICT'
  | 'SYNC_QUOTA_EXCEEDED'
  | 'SYNC_CIRCUIT_OPEN'
  | 'SYNC_UNKNOWN';

export class SyncError extends AppError {
  constructor(
    message: string,
    code: SyncErrorCode,
    options: {
      context?: ErrorContext;
      recoverable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, `SYNC_${code}`, {
      context: { syncCode: code, ...options.context },
      recoverable: options.recoverable ?? true,
      cause: options.cause
    });
  }

  static networkError(cause: Error, url?: string): SyncError {
    return new SyncError(
      `Network error: ${cause.message}`,
      'SYNC_NETWORK_ERROR',
      { context: { url }, recoverable: true, cause }
    );
  }

  static timeout(operation: string, ms: number): SyncError {
    return new SyncError(
      `Operation timed out: ${operation}`,
      'SYNC_TIMEOUT',
      { context: { operation, timeoutMs: ms }, recoverable: true }
    );
  }

  static conflict(localVersion: number, remoteVersion: number): SyncError {
    return new SyncError(
      `Version conflict: local=${localVersion}, remote=${remoteVersion}`,
      'SYNC_CONFLICT',
      { context: { localVersion, remoteVersion }, recoverable: false }
    );
  }

  static circuitOpen(service: string): SyncError {
    return new SyncError(
      `Circuit breaker open for: ${service}`,
      'SYNC_CIRCUIT_OPEN',
      { context: { service }, recoverable: true }
    );
  }

  static quotaExceeded(endpoint: string): SyncError {
    return new SyncError(
      `Quota exceeded for: ${endpoint}`,
      'SYNC_QUOTA_EXCEEDED',
      { context: { endpoint }, recoverable: false }
    );
  }
}
