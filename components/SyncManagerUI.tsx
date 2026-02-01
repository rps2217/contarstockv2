
import React from 'react';
import { Cloud, ChevronLeft, Loader2, ArrowUpCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyncManager } from '../hooks/useSyncManager';
import { SyncGroupCard } from './sync/SyncGroupCard';

export const SyncManagerUI: React.FC = () => {
    const navigate = useNavigate();
    const { state, actions } = useSyncManager();

    return (
        <div className="flex flex-col h-[calc(100dvh-6rem)] md:h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white overflow-hidden font-sans">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-6 py-5 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">Gestor de Subida</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${navigator.onLine ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {navigator.onLine ? 'En Línea' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="mb-6 bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0" />
                    <p className="text-[10px] text-blue-800 font-bold uppercase leading-relaxed">
                        Esta pantalla gestiona los <span className="underline">Movimientos de Inventario</span> (picks). 
                        La sincronización de nombres de productos se hace en el menú Catálogo.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
                    {state.uiGroups.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <Cloud className="w-24 h-24 mb-4 text-slate-300" />
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Todo Sincronizado</h3>
                        </div>
                    ) : (
                        state.uiGroups.map(g => (
                            <SyncGroupCard key={g.erpOrder} group={g} uiStatus={g.uiStatus} />
                        ))
                    )}
                </div>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 shrink-0 z-30 pb-safe">
                <button 
                    onClick={actions.handleSyncAll}
                    disabled={state.isProcessing || state.uiGroups.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-black py-6 rounded-3xl shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 uppercase tracking-[0.2em] text-sm"
                >
                    {state.isProcessing ? <Loader2 className="animate-spin w-6 h-6"/> : <ArrowUpCircle className="w-6 h-6" />}
                    {state.isProcessing ? 'Procesando Nube...' : 'Subir Conteos Ahora'}
                </button>
            </div>
        </div>
    );
};

export default SyncManagerUI;
