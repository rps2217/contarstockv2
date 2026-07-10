/**
 * AppError - Clase base para errores de la aplicación
 */

export interface ErrorContext {
  [key: string]: unknown;
}

export abstract class AppError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string,
    options: {
      context?: ErrorContext;
      recoverable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = code;
    this.context = options.context || {};
    this.recoverable = options.recoverable ?? false;
    this.timestamp = Date.now();

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      recoverable: this.recoverable,
      timestamp: new Date(this.timestamp).toISOString(),
      stack: this.stack
    };
  }

  toString(): string {
    return `[${this.code}] ${this.message}`;
  }
}
