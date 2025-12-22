
import React, { useRef, useEffect } from 'react';
import { Cloud, ChevronLeft, Loader2, Wifi, WifiOff, Terminal, CheckCircle2, ArrowUpCircle, Server } from 'lucide-react';
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
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">Gestor Nube</h1>
                        <div className="flex items-center gap-1.5 mt-1">
                            {navigator.onLine ? (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-emerald-100"><Wifi className="w-3 h-3" /> Online</span>
                            ) : (
                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-rose-100"><WifiOff className="w-3 h-3" /> Offline</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
                <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
                    {state.uiGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                                <Cloud className="w-10 h-10 text-slate-300" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Todo Sincronizado</h2>
                            <p className="text-sm text-slate-400 font-medium mt-1">No hay datos pendientes de subida.</p>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto w-full space-y-4">
                            <div className="flex items-center justify-between mb-2 px-2">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cola de Subida ({state.uiGroups.length})</span>
                            </div>
                            {state.uiGroups.map(g => (
                                <div key={g.erpOrder} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${g.uiStatus === 'success' ? 'bg-emerald-50 text-emerald-600' : (g.uiStatus === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600')}`}>
                                            <Server className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 text-sm uppercase tracking-tight">{g.erpOrder}</div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 flex gap-2">
                                                <span>{g.sessionCount} Bultos</span>
                                                <span className="text-slate-300">•</span>
                                                <span>{g.totalUnits} Unidades</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pl-4">
                                        {g.uiStatus === 'uploading' && <Loader2 className="animate-spin text-blue-600 w-5 h-5" />}
                                        {g.uiStatus === 'success' && <CheckCircle2 className="text-emerald-500 w-6 h-6" />}
                                        {g.uiStatus === 'error' && <div className="text-rose-600 text-[10px] font-black uppercase bg-rose-50 px-2 py-1 rounded">Error</div>}
                                        {g.uiStatus === 'idle' && <div className="w-3 h-3 bg-slate-200 rounded-full"></div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Console Log Area */}
                <div className="mt-4 bg-slate-900 rounded-2xl border border-slate-800 p-4 h-48 md:h-64 flex flex-col shadow-2xl shrink-0">
                    <div className="flex items-center gap-2 text-slate-400 mb-3 border-b border-slate-800 pb-2">
                        <Terminal className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Log de Sistema</span>
                    </div>
                    <div ref={terminalRef} className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[10px] md:text-xs">
                        {state.logs.length === 0 && <div className="text-slate-600 italic">Esperando inicio de operaciones...</div>}
                        {state.logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                                <span className="text-slate-500 shrink-0 select-none">{log.time}</span>
                                <span className={`${log.type === 'error' ? 'text-rose-400 font-bold' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}`}>
                                    {log.msg}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0 pb-8 md:pb-6">
                <button 
                    onClick={actions.handleSyncAll}
                    disabled={state.isProcessing || state.uiGroups.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
                >
                    {state.isProcessing ? (
                        <>
                            <Loader2 className="animate-spin w-4 h-4"/>
                            Sincronizando...
                        </>
                    ) : (
                        <>
                            <ArrowUpCircle className="w-5 h-5" />
                            Subir Todo a la Nube
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
