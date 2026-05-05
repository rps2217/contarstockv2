
import React from 'react';
import { Cloud, ChevronLeft, Loader2, ArrowUpCircle, Info, DownloadCloud, Database, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSyncManager } from './hooks/useSyncManager';
import { SyncGroupCard } from './components/SyncGroupCard';

export const SyncManagerUI: React.FC = () => {
  const navigate = useNavigate();
  const { state, actions } = useSyncManager();

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] md:h-screen bg-slate-50/50 dark:bg-black text-slate-900 dark:text-white overflow-hidden font-sans">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-4 md:px-8 py-4 md:py-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3 md:gap-5">
          <button onClick={() => navigate('/dashboard')} className="p-2 md:p-2.5 -ml-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-slate-600 dark:text-slate-300 transition-colors active:scale-95">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none flex items-center gap-2">
              Gestor de Subida
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`flex items-center gap-1.5 text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${navigator.onLine ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' : 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${navigator.onLine ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                {navigator.onLine ? 'En Línea' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto w-full">
        {/* Sidebar Actions (Desktop) / Top Actions (Mobile) */}
        <div className="shrink-0 md:w-80 p-4 md:p-6 md:border-r border-slate-200 dark:border-white/5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
          <div className="bg-blue-50/80 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4 rounded-2xl flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-[10px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
              Esta pantalla gestiona los <span className="font-bold">Movimientos de Inventario</span> (picks) y <span className="font-bold">Tablas Dinámicas</span>. 
              La sincronización de nombres de productos se hace en el menú Catálogo.
            </p>
          </div>

          <button 
            onClick={() => navigate('/sync/queue')}
            className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between group hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500">
                <Database className="w-5 h-5" />
              </div>
              <div className="text-left font-sans">
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-800 dark:text-slate-200 block">Ver Cola de Datos</span>
                <span className="text-[9px] font-bold text-slate-500">Registros pendientes</span>
              </div>
            </div>
            <RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:rotate-180 transition-all duration-500" />
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={actions.handlePushConfig}
              disabled={state.isProcessing}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 group hover:border-blue-400 transition-all text-center"
              title="Respaldar Plantillas y Esquemas"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-300 block">Respaldar</span>
                <span className="text-[8px] text-slate-500">Configuración</span>
              </div>
            </button>

            <button 
              onClick={actions.handlePullConfig}
              disabled={state.isProcessing}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 group hover:border-emerald-400 transition-all text-center"
              title="Restaurar Plantillas y Esquemas"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <DownloadCloud className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-300 block">Restaurar</span>
                <span className="text-[8px] text-slate-500">Configuración</span>
              </div>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-black relative">
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6 space-y-3">
            {state.uiGroups.length === 0 ? (
              <div className="h-full min-h-[40vh] flex flex-col items-center justify-center text-center opacity-50">
                <Cloud className="w-16 h-16 md:w-20 md:h-20 mb-4 md:mb-6 text-slate-400 stroke-1" />
                <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cielo Despejado</h3>
                <p className="text-xs md:text-sm mt-2 font-medium max-w-[250px]">No hay datos pendientes de sincronización local.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 md:gap-4 content-start">
                {state.uiGroups.map(g => (
                  <SyncGroupCard key={g.erpOrder} group={g} uiStatus={g.uiStatus} progress={g.progress} />
                ))}
              </div>
            )}
            
            {state.logs.length > 0 && (
              <div className="mt-8 bg-slate-900 rounded-2xl p-4 font-mono text-[10px] text-slate-300 space-y-2 max-h-48 overflow-y-auto border border-slate-800 shadow-inner">
                {state.logs.map((log, i) => (
                  <div key={i} className={`flex gap-3 ${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : ''}`}>
                    <span className="opacity-40 shrink-0 select-none">[{log.time}]</span>
                    <span className="break-all">{log.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 shrink-0 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col sm:flex-row gap-3 max-w-4xl mx-auto">
              <div className="flex gap-3 sm:w-1/2">
                <button 
                  onClick={actions.handleDownloadOrders}
                  disabled={state.isProcessing}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 dark:disabled:bg-transparent disabled:text-slate-400 text-slate-700 dark:text-slate-300 font-bold py-3.5 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 transition-colors active:scale-[0.98] text-[10px] md:text-xs tracking-wider uppercase border border-slate-200 dark:border-white/10"
                >
                  {state.isProcessing ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5"/> : <DownloadCloud className="w-4 h-4 md:w-5 md:h-5" />}
                  Bajar Órdenes
                </button>
                <button 
                  onClick={actions.handleVerifyIntegrity}
                  disabled={state.isProcessing}
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 disabled:bg-slate-50 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:disabled:bg-transparent disabled:text-slate-400 text-emerald-700 dark:text-emerald-400 font-bold py-3.5 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 transition-colors active:scale-[0.98] text-[10px] md:text-xs tracking-wider uppercase border border-emerald-200 dark:border-emerald-500/20"
                >
                  {state.isProcessing ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5"/> : <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />}
                  Auditar
                </button>
              </div>
              <button 
                onClick={actions.handleSyncAll}
                disabled={state.isProcessing || state.uiGroups.length === 0}
                className="w-full sm:w-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-black py-4 md:py-0 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-widest text-xs md:text-sm border border-transparent"
              >
                {state.isProcessing ? <Loader2 className="animate-spin w-5 h-5 md:w-6 md:h-6"/> : <ArrowUpCircle className="w-5 h-5 md:w-6 md:h-6" />}
                {state.isProcessing ? 'Sincronizando...' : 'Subir Cambios Ahora'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncManagerUI;

