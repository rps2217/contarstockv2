
import React from 'react';
import { Cloud, ChevronLeft, Loader2, ArrowUpCircle, Info, DownloadCloud, Database, RefreshCw, ShieldCheck, Settings, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyncManager } from './hooks/useSyncManager';
import { SyncGroupCard } from './components/SyncGroupCard';

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
        <div className="mb-6 flex flex-col gap-3">
          <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-[10px] text-blue-800 font-bold uppercase leading-relaxed">
              Esta pantalla gestiona los <span className="underline">Movimientos de Inventario</span> (picks) y <span className="underline">Tablas Dinámicas</span>. 
              La sincronización de nombres de productos se hace en el menú Catálogo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/sync/queue')}
              className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between group hover:bg-amber-500/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Database className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">Cola de Datos</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Registros pendientes</span>
                </div>
              </div>
              <RefreshCw className="w-4 h-4 text-amber-500 group-hover:rotate-180 transition-transform duration-500" />
            </button>

            <div className="flex gap-2">
              <button 
                onClick={actions.handlePushConfig}
                disabled={state.isProcessing}
                className="flex-1 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 group hover:bg-blue-500/20 transition-all"
                title="Respaldar Plantillas y Esquemas"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">Respaldar</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Plantillas/Esquemas</span>
                </div>
              </button>

              <button 
                onClick={actions.handlePullConfig}
                disabled={state.isProcessing}
                className="flex-1 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 group hover:bg-emerald-500/20 transition-all"
                title="Restaurar Plantillas y Esquemas"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Restaurar</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Plantillas/Esquemas</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
          {state.uiGroups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Cloud className="w-24 h-24 mb-4 text-slate-300" />
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Todo Sincronizado</h3>
              <p className="text-sm mt-2 font-medium">No hay datos pendientes de subir.</p>
            </div>
          ) : (
            state.uiGroups.map(g => (
              <SyncGroupCard key={g.erpOrder} group={g} uiStatus={g.uiStatus} progress={g.progress} />
            ))
          )}
          {state.logs.length > 0 && (
            <div className="mt-6 bg-slate-900 rounded-xl p-4 font-mono text-[10px] text-slate-300 space-y-1.5 h-48 overflow-y-auto">
              {state.logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : ''}`}>
                  <span className="opacity-50 shrink-0">[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 shrink-0 z-30 pb-safe flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={actions.handleDownloadOrders}
            disabled={state.isProcessing}
            className="bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:disabled:bg-slate-900 disabled:text-slate-400 text-slate-700 dark:text-slate-300 font-black py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-tight text-[10px]"
          >
            {state.isProcessing ? <Loader2 className="animate-spin w-4 h-4"/> : <DownloadCloud className="w-4 h-4" />}
            Órdenes
          </button>
          <button 
            onClick={actions.handleVerifyIntegrity}
            disabled={state.isProcessing}
            className="bg-emerald-50 hover:bg-emerald-100 disabled:bg-slate-50 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:disabled:bg-slate-900 disabled:text-slate-400 text-emerald-700 dark:text-emerald-400 font-black py-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-tight text-[10px]"
          >
            {state.isProcessing ? <Loader2 className="animate-spin w-4 h-4"/> : <ShieldCheck className="w-4 h-4" />}
            Verificar
          </button>
        </div>
        <button 
          onClick={actions.handleSyncAll}
          disabled={state.isProcessing || state.uiGroups.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-black py-6 rounded-3xl shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 uppercase tracking-[0.2em] text-sm"
        >
          {state.isProcessing ? <Loader2 className="animate-spin w-6 h-6"/> : <ArrowUpCircle className="w-6 h-6" />}
          {state.isProcessing ? 'Procesando Nube...' : 'Sincronizar Todo Ahora'}
        </button>
      </div>
    </div>
  );
};

export default SyncManagerUI;

// Forced GitHub sync
