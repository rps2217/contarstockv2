
import React, { useRef, useEffect, useState } from 'react';
import { Cloud, ChevronLeft, Loader2, Wifi, WifiOff, Terminal, CheckCircle2, ArrowUpCircle, Server, Package, RefreshCw, DownloadCloud, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyncManager } from '../hooks/useSyncManager';
import * as syncManager from '../services/syncManager';

export const SyncManagerUI: React.FC = () => {
    const navigate = useNavigate();
    const { state, actions } = useSyncManager();
    const terminalRef = useRef<HTMLDivElement>(null);
    const [pullErp, setPullErp] = useState('');
    const [isPulling, setIsPulling] = useState(false);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [state.logs]);

    const handlePullProgress = async () => {
        if (!pullErp.trim() || isPulling) return;
        setIsPulling(true);
        try {
            const result = await syncManager.pullOrderProgress(pullErp);
            alert(`Sincronización Exitosa:\n- ${result.added} Bultos nuevos creados.\n- ${result.updated} SKUs sincronizados.`);
            setPullErp('');
            actions.refreshGroups();
        } catch (err: any) {
            alert("Error al descargar avance: " + err.message);
        } finally {
            setIsPulling(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-6rem)] md:h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white overflow-hidden font-sans page-transition">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-4 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-600 dark:text-slate-400 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">Gestión Cloud</h1>
                        <div className="flex items-center gap-1.5 mt-1">
                            {navigator.onLine ? (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20"><Wifi className="w-2.5 h-2.5" /> Conectado</span>
                            ) : (
                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-rose-100 dark:border-rose-500/20"><WifiOff className="w-2.5 h-2.5" /> Sin Conexión</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-6">
                {/* SECCIÓN: PULL PROGRESS (Fase 2) */}
                <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-xl text-white">
                    <div className="flex items-center gap-3 mb-4">
                        <DownloadCloud className="w-6 h-6" />
                        <h2 className="text-lg font-black uppercase tracking-tight leading-none">Restaurar Avance Global</h2>
                    </div>
                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-6 opacity-80">Descarga lo que otros compañeros ya subieron para una OC.</p>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                            <input 
                                value={pullErp}
                                onChange={(e) => setPullErp(e.target.value)}
                                placeholder="Escribe N° ERP..." 
                                className="w-full h-14 pl-12 pr-4 bg-white/10 border-2 border-white/20 rounded-2xl outline-none focus:bg-white/20 focus:border-white transition-all text-white placeholder:text-blue-200 font-bold"
                            />
                        </div>
                        <button 
                            onClick={handlePullProgress}
                            disabled={isPulling || !pullErp}
                            className="h-14 px-6 bg-white text-blue-600 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {isPulling ? <Loader2 className="animate-spin w-5 h-5" /> : "Sincronizar"}
                        </button>
                    </div>
                </div>

                {/* LISTADO DE PENDIENTES */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-2 min-h-[100px]">
                    <div className="max-w-2xl mx-auto w-full space-y-3">
                        <div className="flex items-center justify-between mb-1 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cola de Subida ({state.uiGroups.length})</span>
                        </div>
                        {state.uiGroups.length === 0 ? (
                            <div className="py-12 text-center opacity-30">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
                                <p className="text-xs font-black uppercase tracking-widest">Todo al día</p>
                            </div>
                        ) : (
                            state.uiGroups.map(g => (
                                <div key={g.erpOrder} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex justify-between items-center transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2.5 rounded-xl shrink-0 ${g.uiStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                                            {g.type === 'products' ? <Package className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight truncate">{g.erpOrder}</div>
                                            <div className="text-[9px] text-slate-400 font-black uppercase mt-0.5 flex items-center gap-1.5">
                                                <span>{g.sessionCount} Bultos</span>
                                                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                <span>{g.totalUnits} Unid.</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>{g.uiStatus === 'uploading' ? <Loader2 className="animate-spin text-blue-600 w-5 h-5" /> : g.uiStatus === 'success' ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : null}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="mt-2 bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 flex flex-col shadow-lg shrink-0 overflow-hidden border-t-4 border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Terminal className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Monitor de Actividad</span>
                    </div>
                    <div ref={terminalRef} className="h-24 overflow-y-auto space-y-1 font-mono text-[9px] no-scrollbar">
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
                    className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase tracking-widest text-xs"
                >
                    {state.isProcessing ? <Loader2 className="animate-spin w-4 h-4"/> : <ArrowUpCircle className="w-5 h-5" />}
                    Sincronizar Pendientes
                </button>
            </div>
        </div>
    );
};

export default SyncManagerUI;
