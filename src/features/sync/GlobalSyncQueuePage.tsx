import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { dynamicSyncService } from '../../services/dynamicSync';
import { 
  Cloud, 
  ChevronLeft, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Database,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const GlobalSyncQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'error' | 'synced'>('all');

  const records = useLiveQuery(async () => {
    let query = db.dynamic_data.orderBy('timestamp').reverse();
    
    if (filter !== 'all') {
      query = db.dynamic_data.where('syncStatus').equals(filter).reverse();
    }
    
    return await query.toArray();
  }, [filter]);

  const stats = useLiveQuery(() => dynamicSyncService.getSyncStats());

  const handleSyncAll = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Iniciando sincronización global...');
    try {
      const result = await dynamicSyncService.syncAllPending((msg) => {
        toast.loading(msg, { id: toastId });
      });
      toast.success(`Sincronización finalizada: ${result.success} exitosos, ${result.failed} fallidos`, { id: toastId });
    } catch (error: any) {
      toast.error(`Error crítico: ${error.message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryErrors = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Reintentando errores...');
    try {
      const result = await dynamicSyncService.retryAllErrors((msg) => {
        toast.loading(msg, { id: toastId });
      });
      toast.success(`Reintento finalizado: ${result.success} exitosos, ${result.failed} fallidos`, { id: toastId });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSynced = async () => {
    if (!confirm('¿Estás seguro de querer limpiar los registros ya sincronizados de la cola local?')) return;
    
    try {
      await db.dynamic_data.where('syncStatus').equals('synced').delete();
      toast.success('Cola de sincronización limpia');
    } catch (error: any) {
      toast.error('Error al limpiar: ' + error.message);
    }
  };

  const retryRecord = async (id: string) => {
    setIsProcessing(true);
    try {
      await dynamicSyncService.retrySingleRecord(id);
      toast.success('Registro marcado para reintento');
    } catch (error: any) {
      toast.error('Error al marcar para reintento: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('¿Estás seguro de querer eliminar este registro de la cola?')) return;
    try {
      await db.dynamic_data.delete(id);
      toast.success('Registro eliminado');
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden font-mono">
      {/* Header */}
      <div className="bg-slate-900 border-b border-white/5 px-6 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none">Cola Global</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sincronización Dinámica</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={clearSynced}
            className="p-2 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
            title="Limpiar sincronizados"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={handleRetryErrors}
            disabled={isProcessing || !stats?.errors}
            className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition-all disabled:opacity-30"
            title="Reintentar errores"
          >
            <RefreshCw className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/5 shrink-0">
        <button 
          onClick={() => setFilter('pending')}
          className={`p-4 flex flex-col items-center gap-1 transition-all ${filter === 'pending' ? 'bg-amber-500/10 border-b-2 border-amber-500' : 'hover:bg-white/5'}`}
        >
          <span className="text-xl font-black text-amber-500">{stats?.pending || 0}</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Pendientes</span>
        </button>
        <button 
          onClick={() => setFilter('error')}
          className={`p-4 flex flex-col items-center gap-1 transition-all ${filter === 'error' ? 'bg-rose-500/10 border-b-2 border-rose-500' : 'hover:bg-white/5'}`}
        >
          <span className="text-xl font-black text-rose-500">{stats?.errors || 0}</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Errores</span>
        </button>
        <button 
          onClick={() => setFilter('synced')}
          className={`p-4 flex flex-col items-center gap-1 transition-all ${filter === 'synced' ? 'bg-emerald-500/10 border-b-2 border-emerald-500' : 'hover:bg-white/5'}`}
        >
          <span className="text-xl font-black text-emerald-500">{stats?.synced || 0}</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Sincronizados</span>
        </button>
      </div>

      {/* Filter Selector */}
      <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
            filter === 'all' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-slate-400'
          }`}
        >
          Todos
        </button>
        {/* Los otros filtros ya están en la barra de stats */}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {records?.map((record) => (
            <motion.div
              key={record.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-2xl border transition-all ${
                record.syncStatus === 'pending' ? 'bg-amber-500/5 border-amber-500/20' :
                record.syncStatus === 'error' ? 'bg-rose-500/5 border-rose-500/20' :
                'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Database className="w-2 h-2" />
                    {record.tableName}
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-tighter italic">
                    {record.id}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold text-slate-500">
                    {new Date(record.timestamp).toLocaleTimeString()}
                  </span>
                  {record.syncStatus === 'pending' ? <Clock className="w-3 h-3 text-amber-500" /> :
                   record.syncStatus === 'error' ? <AlertCircle className="w-3 h-3 text-rose-500" /> :
                   <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                   
                   <div className="flex gap-1 ml-2">
                     {record.syncStatus === 'error' && (
                       <button onClick={() => retryRecord(record.id)} className="p-1 hover:bg-amber-500/20 rounded text-amber-500">
                         <RefreshCw className="w-3 h-3" />
                       </button>
                     )}
                     <button onClick={() => deleteRecord(record.id)} className="p-1 hover:bg-rose-500/20 rounded text-rose-500">
                       <Trash2 className="w-3 h-3" />
                     </button>
                   </div>
                </div>
              </div>

              {record.syncError && (
                <div className="mt-2 p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
                  <p className="text-[9px] text-rose-400 font-bold uppercase tracking-tight leading-tight">
                    {record.syncError}
                  </p>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(record.data).slice(0, 4).map(([key, val]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">{key}</span>
                    <span className="text-[10px] font-bold truncate text-slate-400">{String(val)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {records?.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
            <Cloud className="w-16 h-16 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">No hay registros en esta vista</p>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-6 bg-slate-900 border-t border-white/5 shrink-0">
        <button
          onClick={handleSyncAll}
          disabled={isProcessing || !stats?.pending}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar Todo Ahora
        </button>
      </div>
    </div>
  );
};

export default GlobalSyncQueuePage;

// Forced GitHub sync
