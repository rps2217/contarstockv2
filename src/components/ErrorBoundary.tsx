
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal, ZapOff, Database } from 'lucide-react';
import { logger } from '../services/logger';
import { resetFirestore } from '../lib/firebase';

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

 handleRepairDatabase = async () => {
 if (confirm("⚠️ REPARACIÓN DE BASE DE DATOS ⚠️\n\nEsto cerrará la conexión y limpiará la caché de Firestore para solucionar errores internos de renderizado.\n\n¿Deseas continuar?")) {
 await resetFirestore();
 }
 };

 public render(): ReactNode {
 if (this.state.hasError) {
 return (
 <div className="min-h-screen bg-red-600 flex items-center justify-center p-6 font-sans text-white z-[9999] fixed inset-0">
 <div className="max-w-md w-full bg-white text-black rounded-[3rem] shadow-2xl overflow-hidden border-4 border-black">
 <div className="bg-black p-8 flex justify-center border-b-8 border-black">
 <div className="bg-red-600 p-4 rounded-3xl animate-pulse">
 <ZapOff className="w-12 h-12 text-white" />
 </div>
 </div>
 
 <div className="p-8 text-center">
 <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-red-600">ERROR CRÍTICO</h1>
 <p className="text-slate-800 mb-8 text-sm font-bold uppercase tracking-wide leading-relaxed">
 Se ha detectado un fallo en el renderizado.
 </p>

 <div className="bg-gray-100 p-4 rounded-2xl text-left mb-8 border border-gray-300 shadow-inner">
 <div className="flex items-center gap-2 mb-3 border-b border-gray-300 pb-2">
 <Terminal className="w-3 h-3 text-red-600" />
 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">LOG_DIAGNOSTICO</span>
 </div>
 <code className="text-[10px] text-red-600 font-mono break-all font-bold">
 {this.state.error?.message || 'Error de Invariante de React'}
 </code>
 </div>

 <div className="grid grid-cols-1 gap-3">
 <button 
 onClick={this.handleReload}
 className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs"
 >
 <RefreshCw className="w-5 h-5" /> Reintentar Carga
 </button>
 
 <button 
 onClick={this.handleRepairDatabase}
 className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
 >
 <Database className="w-4 h-4" /> Reparar Base de Datos
 </button>

 <button 
 onClick={this.handleHardReset}
 className="w-full bg-black hover:bg-gray-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
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

// Forced GitHub sync
