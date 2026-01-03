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
 * ErrorBoundary class component to catch JS errors anywhere in their child component tree.
 */
// Fix: Use Component directly from react to ensure inherited members like setState and props are correctly resolved by TypeScript.
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null 
    };
  }

  // Lifecycle method to handle errors gracefully and write logs
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    logger.error(
        'SYSTEM_CRASH', 
        error.message || 'Unknown Critical Error', 
        { stack: error.stack, componentStack: errorInfo.componentStack }
    ).catch(e => console.error("Failed to write crash log", e));
    
    // Captured error info in state to display in the UI
    // Fix: Explicitly using this.setState from the inherited Component context.
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    if (window.confirm("¿Estás seguro? Esto forzará una recarga completa y limpieza de caché.")) {
        sessionStorage.clear();
        window.location.href = '/?t=' + Date.now();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error 
        ? (typeof this.state.error.message === 'string' ? this.state.error.message : JSON.stringify(this.state.error.message))
        : 'Error desconocido';

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
                El motor ha detectado una anomalía. Los datos locales están seguros.
              </p>

              <div className="bg-black/40 p-4 rounded-xl text-left mb-6 overflow-auto max-h-32 border border-white/5 shadow-inner">
                <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                    <Terminal className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Crash Diagnostics</span>
                </div>
                <code className="text-xs text-rose-400 font-mono break-all">
                  {errorMessage}
                </code>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={this.handleReload}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-5 h-5" /> Reiniciar Interfaz
                </button>
                <button 
                   onClick={this.handleClearCacheAndReload}
                   className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                   <Home className="w-5 h-5" /> Limpieza Profunda
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Fix: Explicitly accessing children via this.props from inherited Component context.
    return this.props.children;
  }
}