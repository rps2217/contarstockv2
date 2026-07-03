/**
 * =============================================================================
 * ERROR HANDLING - Sistema Centralizado de Errores
 * =============================================================================
 * 
 * Proporciona:
 * - Clases de error tipadas
 * - logging centralizado
 * - Manejo de errores en componentes React
 * - Retry automático para errores recuperables
 * 
 * @module errors
 */

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors: Array<{ path: string; message: string }>) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} not found: ${id}` : `${resource} not found`,
      'NOT_FOUND',
      404,
      { resource, id }
    );
    this.name = 'NotFoundError';
  }
}

export class SyncError extends AppError {
  constructor(
    message: string,
    public tableName?: string,
    public operation?: 'push' | 'pull' | 'delete',
    public recoverable: boolean = true
  ) {
    super(message, 'SYNC_ERROR', 500, { tableName, operation });
    this.name = 'SyncError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, public online: boolean = navigator.onLine) {
    super(message, 'NETWORK_ERROR', 0, { online });
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, public operation?: string) {
    super(message, 'DATABASE_ERROR', 500, { operation });
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

// =============================================================================
// ERROR BOUNDARY COMPONENT
// =============================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/services/logger';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: crypto.randomUUID(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorId = this.state.errorId || crypto.randomUUID();
    
    logger.error('ErrorBoundary', `Error captured (${errorId})`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorId: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isPage = this.props.level === 'page';
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-base">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-error/20 flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-primary mb-2">
              {isPage ? 'Error de Página' : 'Algo salió mal'}
            </h1>
            
            <p className="text-muted text-sm mb-4">
              {isPage 
                ? 'Esta página encontró un error y no pudo cargarse.'
                : 'Un componente encontró un error.'
              }
            </p>

            {this.state.errorId && (
              <p className="text-xs text-muted mb-4 font-mono">
                ID: {this.state.errorId}
              </p>
            )}

            <details className="text-left mb-4 p-3 rounded-lg bg-surface">
              <summary className="text-xs text-secondary cursor-pointer">
                Ver detalles técnicos
              </summary>
              <pre className="mt-2 text-[10px] text-muted overflow-auto max-h-32">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="primary"
              >
                Reintentar
              </Button>
              
              {isPage && (
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="secondary"
                >
                  Ir al Inicio
                </Button>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

/**
 * Formatea un error para mostrar al usuario
 */
export function formatError(error: unknown, fallback: string = 'Error desconocido'): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    return (obj.message as string) || fallback;
  }
  
  return fallback;
}

/**
 * Determina si un error es recuperable
 */
export function isRecoverable(error: unknown): boolean {
  if (error instanceof SyncError) {
    return error.recoverable;
  }
  
  if (error instanceof NetworkError) {
    return error.online === false; // Recoverable si estamos offline
  }
  
  if (error instanceof AppError) {
    return error.statusCode >= 500 || error.statusCode === 0;
  }
  
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network') ||
           msg.includes('timeout') ||
           msg.includes('offline') ||
           msg.includes('failed to fetch');
  }
  
  return true;
}

/**
 * Determina si es error de red
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network') ||
           msg.includes('fetch') ||
           msg.includes('offline') ||
           msg.includes('timeout') ||
           msg.includes('connection');
  }
  
  return false;
}

/**
 * Determina si es error de autenticación
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AuthenticationError) return true;
  
  if (error instanceof AppError) {
    return error.code === 'AUTH_ERROR';
  }
  
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('auth') ||
           msg.includes('token') ||
           msg.includes('unauthorized') ||
           msg.includes('401');
  }
  
  return false;
}

// =============================================================================
// ERROR CONTEXT
// =============================================================================

import { createContext, useContext, useCallback } from 'react';
// ReactNode ya está importado al inicio del archivo

interface ErrorContextValue {
  handleError: (error: unknown, context?: string) => void;
  handleAsyncError: <T>(promise: Promise<T>, context?: string) => Promise<T | null>;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: ReactNode }) {
  const handleError = useCallback((error: unknown, context?: string) => {
    const message = formatError(error);
    const errorId = crypto.randomUUID();
    
    logger.error('ErrorHandler', context || 'Unhandled Error', {
      message,
      errorId,
      isRecoverable: isRecoverable(error),
      isNetwork: isNetworkError(error),
      isAuth: isAuthError(error),
    });
    
    // Aquí podrías enviar a un servicio de tracking (Sentry, etc.)
    // Sentry.captureException(error, { extra: { context } });
  }, []);

  const handleAsyncError = useCallback(async <T,>(
    promise: Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await promise;
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [handleError]);

  return (
    <ErrorContext.Provider value={{ handleError, handleAsyncError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorProvider');
  }
  return context;
}

// =============================================================================
// HOOK: USE ERROR BOUNDARY
// =============================================================================

export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const throwError = useCallback((err: Error) => {
    setError(err);
    throw err;
  }, []);

  if (error) {
    throw error;
  }

  return { resetError, throwError };
}

// =============================================================================
// ERROR COMPONENT
// =============================================================================

export interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  title?: string;
  message?: string;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  title = 'Error',
  message,
}: ErrorDisplayProps) {
  const displayMessage = message || formatError(error);
  const recoverable = isRecoverable(error);
  
  return (
    <div className="p-4 rounded-xl border border-error/30 bg-error/10">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-error">{title}</h3>
          <p className="text-sm text-secondary mt-1">{displayMessage}</p>
          
          {recoverable && (
            <p className="text-xs text-muted mt-2">
              Este error puede ser temporal. Intenta nuevamente.
            </p>
          )}
        </div>
      </div>
      
      <div className="flex gap-2 mt-4 justify-end">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
          >
            Dismiss
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}

// Import useState
import { useState } from 'react';
