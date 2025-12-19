
import React, { ErrorInfo, ReactNode } from 'react';
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
 * Error Boundary component to catch runtime crashes and provide recovery options.
 * Must be a class component as per React specifications.
 */
// Use React.Component explicitly to ensure inherited members like setState and props are correctly resolved by TypeScript
export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { 
      hasError: true, 
      error, 
      errorInfo: null 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Attempt to log the crash details to the local database for debugging
    logger.error(
        'SYSTEM_CRASH', 
        error.message || 'Unknown Critical Error', 
        { stack: error.stack, componentStack: errorInfo.componentStack }
    ).catch(e => console.error("Failed to write crash log", e));
    
    // Using setState inherited from the React.Component base class
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
    // Checking internal state to decide which UI to render
    if (this.state.hasError) {
      // Fallback UI when a crash occurs
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

    // Accessing inherited children property from the props object of the React.Component base class
    return this.props.children;
  }
}
