
import React, { useRef, useEffect } from 'react';
import { Cloud, ChevronLeft, Loader2, Wifi, WifiOff, Terminal, CheckCircle2, ArrowUpCircle, Server, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyncManager } from '../hooks/useSyncManager';

export const SyncManagerUI: React.FC = () => {
    const navigate = useNavigate();
    const { state, actions } = useSyncManager();
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [state.logs]);

    return (
        <div className="flex flex-col h-[calc(100dvh-6rem)] md:h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white overflow-hidden font-sans page-transition">
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-4 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-600 dark:text-slate-400 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">Sincronización Cloud</h1>
                        <div className="flex items-center gap-1.5 mt-1">
                            {navigator.onLine ? (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20"><Wifi className="w-2.5 h-2.5" /> En Línea</span>
                            ) : (
                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-rose-100 dark:border-rose-500/20"><WifiOff className="w-2.5 h-2.5" /> Sin Conexión</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl">
                    <Cloud className="w-5 h-5 text-blue-600" />
                </div>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-4">
                
                {/* LISTADO DE PENDIENTES */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
                    <div className="max-w-2xl mx-auto w-full space-y-3">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros por Respaldar ({state.uiGroups.length})</span>
                            <span className="text-[8px] font-bold text-blue-500 uppercase">Respaldo Automático Off</span>
                        </div>
                        
                        {state.uiGroups.length === 0 ? (
                            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-white/5 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Todo el inventario está en la nube</p>
                            </div>
                        ) : (
                            state.uiGroups.map(g => (
                                <div key={g.erpOrder} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm flex justify-between items-center animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`p-3 rounded-2xl shrink-0 ${g.uiStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                                            {g.type === 'products' ? <Package className="w-6 h-6" /> : <Server className="w-6 h-6" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tight truncate">{g.erpOrder}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-2">
                                                <span>{g.sessionCount} Bultos</span>
                                                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                <span>{g.totalUnits} Unid.</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        {g.uiStatus === 'uploading' ? (
                                            <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
                                        ) : g.uiStatus === 'success' ? (
                                            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-slate-100"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* TERMINAL DE ACTIVIDAD */}
                <div className="bg-slate-900 dark:bg-slate-950 rounded-[2rem] p-5 flex flex-col shadow-2xl shrink-0 overflow-hidden border-t-4 border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Terminal className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Monitor Logístico</span>
                        </div>
                        <div className="text-[8px] font-bold text-slate-600 uppercase">v6.3 Build OK</div>
                    </div>
                    <div ref={terminalRef} className="h-28 overflow-y-auto space-y-1.5 font-mono text-[10px] no-scrollbar">
                        {state.logs.map((log, i) => (
                            <div key={i} className="flex gap-3 leading-relaxed border-l border-white/5 pl-2 ml-1">
                                <span className="text-slate-600 shrink-0 tabular-nums">{log.time}</span>
                                <span className={`${log.type === 'error' ? 'text-rose-400 font-bold' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}`}>
                                    {log.msg}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* BOTÓN PRINCIPAL */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 shrink-0 z-30 pb-safe">
                <button 
                    onClick={actions.handleSyncAll}
                    disabled={state.isProcessing || state.uiGroups.length === 0}
                    className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-black disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-sm"
                >
                    {state.isProcessing ? <Loader2 className="animate-spin w-5 h-5"/> : <ArrowUpCircle className="w-5 h-5" />}
                    Sincronizar Pendientes
                </button>
            </div>
        </div>
    );
};

export default SyncManagerUI;
