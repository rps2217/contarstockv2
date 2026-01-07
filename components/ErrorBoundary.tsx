import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal } from 'lucide-react';
import { logger } from '../services/logger';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Capturador de errores global para la aplicación React.
 * Implementa la lógica de recuperación y reporte de fallos críticos.
 */
// Fix: Explicitly inherit from Component to resolve type recognition issues for setState and props (Errors on lines 54 and 118)
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Detectar fallos de carga de módulos ESM
    const isModuleError = error.message.includes('loading chunk') || 
                         error.message.includes('dynamically imported module') ||
                         error.message.includes('React Context');

    if (isModuleError) {
        console.warn("Fallo de módulo o versión detectado. Sugiriendo limpieza de caché.");
    }

    logger.error(
        'SYSTEM_CRASH', 
        error.message || 'Unknown Critical Error', 
        { stack: error.stack, componentStack: errorInfo.componentStack }
    ).catch(e => console.error("Failed to write crash log", e));
    
    // Fix: Using setState which is now correctly recognized via explicit Component inheritance (line 54)
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    if (window.confirm("¿Estás seguro? Esto borrará la sesión actual e intentará recargar las librerías desde cero.")) {
        sessionStorage.clear();
        window.location.href = window.location.pathname + '?v=' + Date.now();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Error de inicialización del motor React';

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-300">
          <div className="max-w-md w-full bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-white/5">
            <div className="bg-rose-500/10 p-6 flex justify-center border-b border-white/5">
              <div className="bg-rose-500/20 p-4 rounded-full">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
              </div>
            </div>
            
            <div className="p-8 text-center">
              <h1 className="text-2xl font-black text-white mb-2">Pausa Inesperada</h1>
              <p className="text-slate-500 mb-6 text-sm">
                Se ha detectado una colisión en el motor de renderizado. Esto suele ocurrir por conflictos de red o versiones.
              </p>

              <div className="bg-black/40 p-4 rounded-xl text-left mb-6 overflow-auto max-h-32 border border-white/5 shadow-inner">
                <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                    <Terminal className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Diagnóstico</span>
                </div>
                <code className="text-xs text-rose-400 font-mono break-all italic">
                  {errorMessage}
                </code>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={this.handleReload}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <RefreshCw className="w-5 h-5" /> Reintentar Carga
                </button>
                <button 
                   onClick={this.handleClearCacheAndReload}
                   className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                   <Home className="w-5 h-5" /> Forzar Nueva Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fix: Accessing this.props.children which is now correctly recognized via explicit Component inheritance (line 118)
    return this.props.children;
  }
}