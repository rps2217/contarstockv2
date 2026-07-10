/**
 * Utility Types - Tipos utilitarios para servicios
 */

/**
 * Resultado de operación
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Error con mensaje
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Función helper para catch blocks tipados
 */
export function handleError(error: unknown, context?: string): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }
  if (error instanceof Error) {
    return new ServiceError(
      context ? `${context}: ${error.message}` : error.message,
      undefined,
      context ? { context } : undefined
    );
  }
  return new ServiceError(
    context ? `${context}: Unknown error` : 'Unknown error',
    'UNKNOWN'
  );
}

/**
 * Ejecuta una función y retorna resultado tipado
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<{ data: T; error: ServiceError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { data: fallback, error: handleError(error) };
  }
}
