import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    // Force reload from server to clear any transient UI states
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    if (window.confirm("¿Estás seguro? Esto forzará una recarga completa de la aplicación y limpieza de caché.")) {
        // Clear session storage as well
        sessionStorage.clear();
        // Force a fresh request by appending a timestamp, bypassing browser cache
        window.location.href = '/?t=' + Date.now();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-red-50 p-6 flex justify-center border-b border-red-100">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </div>
            
            <div className="p-8 text-center">
              <h1 className="text-2xl font-black text-slate-900 mb-2">Algo salió mal</h1>
              <p className="text-slate-500 mb-6 text-sm">
                La aplicación ha encontrado un error inesperado. No te preocupes, tus datos están seguros en la base de datos local.
              </p>

              <div className="bg-slate-100 p-4 rounded-xl text-left mb-6 overflow-auto max-h-32 border border-slate-200">
                <code className="text-xs text-red-600 font-mono break-all">
                  {this.state.error?.toString()}
                </code>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={this.handleReload}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-5 h-5" /> Recargar
                </button>
                <button 
                   onClick={this.handleClearCacheAndReload}
                   className="w-full bg-white hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all active:scale-95"
                >
                   <Home className="w-5 h-5" /> Borrar Caché y Reiniciar
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