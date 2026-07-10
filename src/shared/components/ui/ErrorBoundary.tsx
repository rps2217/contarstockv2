"use client";
/**
 * ErrorBoundary - Manejo de errores en React
 * 
 * Previene que errores en componentes rompan toda la aplicación.
 * Incluye logging a Sentry y UI de fallback.
 */

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

type FallbackProps = { error: Error | null; resetError: () => void };
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Fallback UI por defecto para errores
 */
export const DefaultErrorFallback: React.FC<{
  error: Error | null;
  resetError: () => void;
  level: 'page' | 'section' | 'component';
}> = ({ error, resetError, level }) => {
  const isPageLevel = level === 'page';
  
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[200px]',
      isPageLevel ? 'h-screen p-8' : 'p-6 bg-surface/50 rounded-xl border border-rose-500/20'
    )}>
      <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
      </div>
      
      <h2 className={cn(
        'font-bold text-primary mb-2',
        isPageLevel ? 'text-xl' : 'text-base'
      )}>
        {isPageLevel ? 'Algo salió mal' : 'Error en esta sección'}
      </h2>
      
      <p className="text-sm text-secondary text-center max-w-md mb-4">
        {isPageLevel 
          ? 'Ha ocurrido un error inesperado. Puedes intentar recargar la página.'
          : 'Esta parte de la aplicación no pudo cargar correctamente.'}
      </p>
      
      {error && (
        <details className="mb-4 p-3 bg-elevated rounded-lg text-left w-full max-w-lg">
          <summary className="text-xs text-muted cursor-pointer mb-1">
            Detalles del error
          </summary>
          <pre className="text-xs text-rose-400/80 overflow-auto max-h-32">
            {error.message}
            {'\n'}
            {error.stack?.split('\n').slice(0, 3).join('\n')}
          </pre>
        </details>
      )}
      
      <div className="flex gap-3">
        {isPageLevel && (
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center gap-2 px-4 py-2 bg-surface text-secondary rounded-lg hover:bg-elevated transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        )}
        
        <button
          onClick={resetError}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
      
      <a 
        href="mailto:soporte@contarstock.com?subject=Error en la aplicación"
        className="mt-4 text-xs text-muted hover:text-secondary flex items-center gap-1"
      >
        <Mail className="w-3 h-3" />
        Reportar problema
      </a>
    </div>
  );
};

/**
 * ErrorBoundary principal de la aplicación
 */
export class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log a consola en desarrollo
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
    
    // Log a Sentry en producción (descomentar cuando esté configurado)
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    // }
    
    // Callback personalizado
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, level = 'section' } = this.props;

    if (hasError) {
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback({ error, resetError: this.resetError })
          : fallback;
      }
      
      return (
        <DefaultErrorFallback 
          error={error} 
          resetError={this.resetError}
          level={level}
        />
      );
    }

    return children;
  }
}

/**
 * Hook para usar ErrorBoundary programáticamente
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  
  const handleError = React.useCallback((err: Error) => {
    setError(err);
  }, []);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const ErrorComponent = error ? (
    <DefaultErrorFallback 
      error={error} 
      resetError={resetError}
      level="component"
    />
  ) : null;
  
  return { error, handleError, resetError, ErrorComponent };
}

/**
 * HOC para envolver componentes con error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <GlobalErrorBoundary fallback={fallback} level="component">
        <Component {...props} />
      </GlobalErrorBoundary>
    );
  };
}

export default GlobalErrorBoundary;
