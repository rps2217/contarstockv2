
import React, { useRef, useEffect } from 'react';
import { Cloud, ChevronLeft, Loader2, Wifi, WifiOff, Terminal, CheckCircle2, ArrowUpCircle, Server, Package, RefreshCw, ZapOff } from 'lucide-react';
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
            {/* Header Compacto */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-4 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-600 dark:text-slate-400 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">Nube</h1>
                        <div className="flex items-center gap-1.5 mt-1">
                            {navigator.onLine ? (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20"><Wifi className="w-2.5 h-2.5" /> Online</span>
                            ) : (
                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-rose-100 dark:border-rose-500/20"><WifiOff className="w-2.5 h-2.5" /> Offline</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={actions.refreshGroups}
                        className="p-3 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all"
                        title="Refrescar"
                    >
                        <RefreshCw className={`w-5 h-5 ${state.isProcessing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Lista Principal */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar pb-2 min-h-[100px]">
                    {state.uiGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Cloud className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Sin Pendientes</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Base local sincronizada</p>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto w-full space-y-3">
                            <div className="flex items-center justify-between mb-1 px-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cola activa ({state.uiGroups.length})</span>
                            </div>
                            {state.uiGroups.map(g => (
                                <div key={g.erpOrder} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex justify-between items-center transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${g.uiStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : (g.uiStatus === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600')}`}>
                                            {g.type === 'products' ? <Package className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight truncate">{g.erpOrder}</div>
                                            <div className="text-[9px] text-slate-400 font-black uppercase mt-0.5 flex items-center gap-1.5">
                                                {g.type === 'products' ? (
                                                    <span>{g.totalUnits} Cambios</span>
                                                ) : (
                                                    <>
                                                        <span>{g.sessionCount} Bultos</span>
                                                        <div className="w-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full"></div>
                                                        <span>{g.totalUnits} Unid.</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pl-3 shrink-0">
                                        {g.uiStatus === 'uploading' && <Loader2 className="animate-spin text-blue-600 w-5 h-5" />}
                                        {g.uiStatus === 'success' && <CheckCircle2 className="text-emerald-500 w-5 h-5" />}
                                        {g.uiStatus === 'error' && <div className="text-rose-600 text-[8px] font-black uppercase bg-rose-50 dark:bg-rose-900/40 px-2 py-1 rounded">Error</div>}
                                        {g.uiStatus === 'idle' && <div className="w-2.5 h-2.5 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-full"></div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Console Log Area */}
                <div className="mt-2 bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 flex flex-col shadow-lg shrink-0 overflow-hidden border-t-4 border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Terminal className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Salida de Consola</span>
                    </div>
                    <div ref={terminalRef} className="h-24 overflow-y-auto space-y-1 font-mono text-[9px] no-scrollbar">
                        {state.logs.length === 0 && <div className="text-slate-700 italic">Esperando instrucción...</div>}
                        {state.logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-slate-600 shrink-0">{log.time}</span>
                                <span className={`${log.type === 'error' ? 'text-rose-400 font-bold' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                    {log.msg}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 shrink-0 z-30">
                <button 
                    onClick={actions.handleSyncAll}
                    disabled={state.isProcessing || state.uiGroups.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-xs"
                >
                    {state.isProcessing ? (
                        <>
                            <Loader2 className="animate-spin w-4 h-4"/>
                            Subiendo datos...
                        </>
                    ) : (
                        <>
                            <ArrowUpCircle className="w-5 h-5" />
                            Sincronizar ahora
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default SyncManagerUI;
