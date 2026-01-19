
import React from 'react';
import { Cloud, ChevronLeft, Loader2, Wifi, WifiOff, CheckCircle2, ArrowUpCircle, Package, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyncManager } from '../hooks/useSyncManager';

export const SyncManagerUI: React.FC = () => {
    const navigate = useNavigate();
    const { state, actions } = useSyncManager();

    return (
        <div className="flex flex-col h-[calc(100dvh-6rem)] md:h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white overflow-hidden font-sans">
            
            {/* HEADER */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-6 py-5 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">Gestor Nube</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            {navigator.onLine ? (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-widest">En Línea</span>
                            ) : (
                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase tracking-widest">Offline</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                
                {/* ESTADO GLOBAL */}
                <div className="mb-6">
                    <div className="flex justify-between items-end mb-2 px-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Cola de Salida</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{state.uiGroups.length} Lotes</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${state.isProcessing ? 'bg-blue-600 w-full animate-pulse' : (state.uiGroups.length === 0 ? 'bg-emerald-500 w-full' : 'bg-amber-500 w-1/4')}`}></div>
                    </div>
                </div>

                {/* LISTA DE LOTES (Simplificada) */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
                    {state.uiGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <Cloud className="w-24 h-24 mb-4 text-slate-300" />
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Todo Sincronizado</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase mt-2 tracking-widest">No hay datos pendientes</p>
                        </div>
                    ) : (
                        state.uiGroups.map(g => (
                            <div key={g.erpOrder} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-white/5 shadow-sm flex justify-between items-center transition-all">
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-2xl ${g.uiStatus === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {g.type === 'products' ? <Package className="w-6 h-6" /> : <Server className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">{g.erpOrder}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                            {g.sessionCount} Bultos • {g.totalUnits} Unidades
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    {g.uiStatus === 'uploading' ? (
                                        <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
                                    ) : g.uiStatus === 'success' ? (
                                        <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full bg-amber-400 animate-pulse"></div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* BOTÓN DE ACCIÓN MASIVO */}
            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 shrink-0 z-30 pb-safe">
                <button 
                    onClick={actions.handleSyncAll}
                    disabled={state.isProcessing || state.uiGroups.length === 0}
                    className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-black disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-black py-6 rounded-3xl shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 uppercase tracking-[0.2em] text-sm"
                >
                    {state.isProcessing ? <Loader2 className="animate-spin w-6 h-6"/> : <ArrowUpCircle className="w-6 h-6" />}
                    {state.isProcessing ? 'Sincronizando...' : 'Subir Todo Ahora'}
                </button>
            </div>
        </div>
    );
};
