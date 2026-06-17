/**
 * ErrorBoundary - Componente para capturar errores de React
 * 
 * Implementa el patrón Error Boundary de React para capturar
 * errores en componentes hijos y mostrar una UI de fallback.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log del error para debugging
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    
    // Callback opcional para manejar errores
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">
                Algo salió mal
              </h1>
              <p className="text-sm text-slate-400 mt-2">
                Ha ocurrido un error inesperado en la aplicación.
              </p>
            </div>

            {/* Error Details (solo en desarrollo) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-black/40 rounded-xl border border-white/5">
                <p className="text-[10px] font-mono text-rose-400 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <p className="text-[9px] font-mono text-slate-500 mt-2 break-all">
                    {this.state.errorInfo.componentStack}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar Página
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Ir al Inicio
              </button>
            </div>

            {/* Footer */}
            <p className="text-[10px] text-slate-600 text-center mt-6">
              Si el problema persiste, contacta al equipo de desarrollo.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para usar el ErrorBoundary programáticamente
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err);
    } else {
      setError(new Error(String(err)));
    }
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    throw error;
  }

  return { handleError, resetError };
}
