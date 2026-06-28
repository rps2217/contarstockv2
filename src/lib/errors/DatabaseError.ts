/**
 * DatabaseError - Errores específicos de la base de datos
 */

import { AppError, ErrorContext } from './AppError';

export type DatabaseErrorCode =
  | 'DB_CONNECTION_ERROR'
  | 'DB_TRANSACTION_ERROR'
  | 'DB_CONSTRAINT_ERROR'
  | 'DB_MIGRATION_ERROR'
  | 'DB_QUOTA_ERROR'
  | 'DB_UNKNOWN';

export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: DatabaseErrorCode,
    options: {
      context?: ErrorContext;
      recoverable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, `DB_${code}`, {
      context: { dbCode: code, ...options.context },
      recoverable: options.recoverable ?? true,
      cause: options.cause
    });
  }

  static connectionError(cause: Error): DatabaseError {
    return new DatabaseError(
      `Database connection failed: ${cause.message}`,
      'DB_CONNECTION_ERROR',
      { recoverable: true, cause }
    );
  }

  static constraintViolation(
    table: string,
    constraint: string,
    value?: unknown
  ): DatabaseError {
    return new DatabaseError(
      `Constraint violation on ${table}.${constraint}`,
      'DB_CONSTRAINT_ERROR',
      { context: { table, constraint, value }, recoverable: false }
    );
  }

  static migrationError(version: string, cause: Error): DatabaseError {
    return new DatabaseError(
      `Migration failed at version ${version}`,
      'DB_MIGRATION_ERROR',
      { context: { version }, recoverable: true, cause }
    );
  }

  static quotaExceeded(usage: number, limit: number): DatabaseError {
    return new DatabaseError(
      `Database quota exceeded: ${usage}/${limit}`,
      'DB_QUOTA_ERROR',
      { context: { usage, limit }, recoverable: false }
    );
  }
}
