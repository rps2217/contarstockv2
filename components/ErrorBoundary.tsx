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

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // FORENSIC LOGGING: Save the crash to IndexedDB immediately
    logger.error(
        'SYSTEM_CRASH', 
        error.message || 'Unknown Critical Error', 
        { stack: error.stack, componentStack: errorInfo.componentStack }
    ).catch(e => console.error("Failed to write crash log", e));
    
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    if (window.confirm("¿Estás seguro? Esto forzará una recarga completa de la aplicación y limpieza de caché.")) {
        sessionStorage.clear();
        window.location.href = '/?t=' + Date.now();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-red-50 p-6 flex justify-center border-b border-red-100">
              <div className="bg-red-100 p-4 rounded-full animate-pulse">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </div>
            
            <div className="p-8 text-center">
              <h1 className="text-2xl font-black text-slate-900 mb-2">Algo salió mal</h1>
              <p className="text-slate-500 mb-6 text-sm">
                El sistema ha registrado este error internamente. Por favor, recarga la aplicación.
              </p>

              <div className="bg-slate-900 p-4 rounded-xl text-left mb-6 overflow-auto max-h-32 border border-slate-800 shadow-inner">
                <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-2">
                    <Terminal className="w-3 h-3 text-green-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Crash Report Saved</span>
                </div>
                <code className="text-xs text-red-400 font-mono break-all">
                  {this.state.error?.toString()}
                </code>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={this.handleReload}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-5 h-5" /> Recargar Sistema
                </button>
                <button 
                   onClick={this.handleClearCacheAndReload}
                   className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all active:scale-95"
                >
                   <Home className="w-5 h-5" /> Reinicio de Fábrica (Seguro)
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}