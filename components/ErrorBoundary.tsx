
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal, ZapOff } from 'lucide-react';
import { logger } from '../services/logger';

interface Props {
 children?: ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

/**
 * MOTOR DE RECUPERACIÓN v4.0
 * Capturador de errores global con diagnóstico industrial.
 */
export class ErrorBoundary extends React.Component<Props, State> {
 public state: State = {
 hasError: false,
 error: null
 };

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error("Critical Crash:", error, errorInfo);
 logger.error('SYSTEM_CRASH', error.message, { stack: error.stack }).catch(() => {});
 }

 handleReload = () => {
 window.location.reload();
 };

 handleHardReset = () => {
 // Forzamos la recarga rompiendo el caché con un timestamp
 sessionStorage.clear();
 window.location.href = window.location.pathname + '?v=' + Date.now();
 };

 public render(): ReactNode {
 if (this.state.hasError) {
 return (
 <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans text-white">
 <div className="max-w-md w-full bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border-4 border-black">
 <div className="bg-rose-600 p-8 flex justify-center border-b-8 border-black">
 <div className="bg-white/20 p-4 rounded-3xl animate-pulse">
 <ZapOff className="w-12 h-12 text-white" />
 </div>
 </div>
 
 <div className="p-8 text-center">
 <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Colisión de Motor</h1>
 <p className="text-slate-400 mb-8 text-sm font-bold uppercase tracking-wide leading-relaxed">
 Se ha detectado un conflicto de versiones o red en el módulo actual.
 </p>

 <div className="bg-black/60 p-4 rounded-2xl text-left mb-8 border border-white/10 shadow-inner">
 <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
 <Terminal className="w-3 h-3 text-emerald-500" />
 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">LOG_DIAGNOSTICO</span>
 </div>
 <code className="text-[10px] text-rose-400 font-mono break-all font-bold">
 {this.state.error?.message || 'Error de Invariante de React'}
 </code>
 </div>

 <div className="grid grid-cols-1 gap-4">
 <button 
 onClick={this.handleReload}
 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs"
 >
 <RefreshCw className="w-5 h-5" /> Reintentar Carga
 </button>
 <button 
 onClick={this.handleHardReset}
 className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
 >
 <Home className="w-4 h-4" /> Resetear Entorno
 </button>
 </div>
 </div>
 </div>
 </div>
 );
 }

 return (this as any).props.children;
 }
}
