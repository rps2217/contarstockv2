
import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, Terminal, ZapOff, Download } from 'lucide-react';
import { logger } from '../services/logger';
import { db } from '../db';

interface Props {
 children?: ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
 isExporting: boolean;
}

/**
 * MOTOR DE RECUPERACIÓN v5.0
 * Capturador de errores global con rescate de datos.
 */
export class ErrorBoundary extends React.Component<Props, State> {
 public state: State = {
 hasError: false,
 error: null,
 isExporting: false
 };

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error, isExporting: false };
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

 handleRescueData = async () => {
 this.setState({ isExporting: true });
 try {
 const scans = await db.scans.toArray();
 const sessions = await db.sessions.toArray();
 const products = await db.products.toArray();
 
 const payload = {
 timestamp: new Date().toISOString(),
 version: '5.0',
 error: this.state.error?.message,
 data: { scans, sessions, products }
 };
 
 const safeStringify = (obj: any) => {
 const cache = new Set();
 return JSON.stringify(obj, (key, value) => {
 if (typeof value === 'object' && value !== null) {
 if (cache.has(value)) return '[Circular]';
 cache.add(value);
 }
 return value;
 }, 2);
 };

 const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(safeStringify(payload));
 const downloadAnchorNode = document.createElement('a');
 downloadAnchorNode.setAttribute("href", dataStr);
 downloadAnchorNode.setAttribute("download", `LOGICOUNT_RESCUE_DATA_${new Date().getTime()}.json`);
 document.body.appendChild(downloadAnchorNode);
 downloadAnchorNode.click();
 downloadAnchorNode.remove();
 } catch (err) {
 console.error("Fallo al exportar rescate:", err);
 alert("No se pudo extraer la información. Es posible que el almacenamiento esté corrupto.");
 } finally {
 this.setState({ isExporting: false });
 }
 };

 public render(): ReactNode {
 if (this.state.hasError) {
 return (
 <div className="min-h-screen bg-red-600 flex items-center justify-center p-6 font-sans text-white z-[9999] fixed inset-0 overflow-y-auto">
 <div className="max-w-md w-full bg-white text-black rounded-[3rem] shadow-2xl overflow-hidden border-4 border-black my-8 flex-shrink-0">
 <div className="bg-black p-8 flex justify-center border-b-8 border-black shrink-0">
 <div className="bg-red-600 p-4 rounded-3xl animate-pulse">
 <ZapOff className="w-12 h-12 text-white" />
 </div>
 </div>
 
 <div className="p-8 text-center shrink-0">
 <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-red-600">ERROR CRÍTICO</h1>
 <p className="text-slate-800 mb-8 text-sm font-bold uppercase tracking-wide leading-relaxed">
 Se ha detectado un fallo en el renderizado.
 </p>

 <div className="bg-gray-100 p-4 rounded-2xl text-left mb-8 border border-gray-300 shadow-inner max-h-32 overflow-y-auto">
 <div className="flex items-center gap-2 mb-3 border-b border-gray-300 pb-2">
 <Terminal className="w-3 h-3 text-red-600" />
 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">LOG_DIAGNOSTICO</span>
 </div>
 <code className="text-[10px] text-red-600 font-mono break-words font-bold whitespace-pre-wrap">
 {this.state.error?.message || 'Error de Invariante de React'}
 </code>
 </div>

 <div className="grid grid-cols-1 gap-3">
 <button 
 onClick={this.handleRescueData}
 disabled={this.state.isExporting}
 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50"
 >
 <Download className="w-4 h-4" /> {this.state.isExporting ? 'Extrayendo...' : 'Rescatar Datos (JSON)'}
 </button>

 <button 
 onClick={this.handleReload}
 className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs"
 >
 <RefreshCw className="w-5 h-5" /> Reintentar Carga
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
