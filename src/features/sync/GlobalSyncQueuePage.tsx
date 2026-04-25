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
    const toastId = toast.loading('Sincronizando nodos core...');
    try {
      const result = await dynamicSyncService.syncAllPending((msg) => {
        toast.loading(msg, { id: toastId });
      });
      toast.success(`Telemetría ok: ${result.success} enviados`, { id: toastId });
    } catch (error: any) {
      toast.error(`Falla de enlace: ${error.message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetryErrors = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Reintentando paquetes fallidos...');
    try {
      const result = await dynamicSyncService.retryAllErrors((msg) => {
        toast.loading(msg, { id: toastId });
      });
      toast.success(`Reintento ok: ${result.success} recuperados`, { id: toastId });
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSynced = async () => {
    if (!confirm('¿Purgar registros sincronizados localmente?')) return;
    try {
      await db.dynamic_data.where('syncStatus').equals('synced').delete();
      toast.success('Pila local purgada');
    } catch (error: any) {
      toast.error('Galla al purgar: ' + error.message);
    }
  };

  const retryRecord = async (id: string) => {
    setIsProcessing(true);
    try {
      await dynamicSyncService.retrySingleRecord(id);
      toast.success('Rebanado para reintento');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('¿Eliminar registro de la pila?')) return;
    try {
      await db.dynamic_data.delete(id);
      toast.success('Pila actualizada');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const syncProgress = stats ? (stats.synced / ((stats.pending + stats.errors + stats.synced) || 1)) * 100 : 0;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Header / Telemetry Display */}
      <div className="bg-slate-900 border-b border-white/5 px-6 py-6 flex items-center justify-between shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1">
          <motion.div 
            initial={{ width: 0 }} animate={{ width: `${syncProgress}%` }}
            className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
          />
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <button onClick={() => navigate(-1)} className="w-10 h-10 surface-glass rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none">Cloud Queue</h1>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Telemetría de Datos en Tiempo Real</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={clearSynced} className="w-10 h-10 bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-xl flex items-center justify-center transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRetryErrors}
            disabled={isProcessing || !stats?.errors}
            className="w-10 h-10 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* COMMAND CARDS */}
      <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/5 shrink-0 px-6 py-4 gap-4">
        <StatusCard 
          label="Pendiente" value={stats?.pending || 0} 
          active={filter === 'pending'} onClick={() => setFilter('pending')}
          color="amber" icon={<Clock className="w-3 h-3" />}
        />
        <StatusCard 
          label="Errores" value={stats?.errors || 0} 
          active={filter === 'error'} onClick={() => setFilter('error')}
          color="rose" icon={<AlertCircle className="w-3 h-3" />}
        />
        <StatusCard 
          label="Sincronizado" value={stats?.synced || 0} 
          active={filter === 'synced'} onClick={() => setFilter('synced')}
          color="emerald" icon={<CheckCircle2 className="w-3 h-3" />}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-950/50">
        <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Últimos Paquetes</span>
            <button onClick={() => setFilter('all')} className={`text-[10px] font-black uppercase tracking-tight ${filter === 'all' ? 'text-blue-500' : 'text-slate-700'}`}>Ver Todo</button>
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          {records?.map((record, idx) => (
            <motion.div
              key={record.id}
              layout
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -20 }}
              transition={{ delay: idx * 0.02 }}
              className={`p-5 rounded-3xl border transition-all surface-card ${
                record.syncStatus === 'pending' ? 'border-amber-500/10 shadow-[0_4px_12px_rgba(245,158,11,0.02)]' :
                record.syncStatus === 'error' ? 'border-rose-500/10 shadow-[0_4px_12px_rgba(244,63,94,0.02)]' :
                'border-white/5'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[8px] font-black text-blue-500 uppercase tracking-widest">
                       {record.tableName}
                    </span>
                    <span className="text-[9px] font-bold text-slate-600">
                      ID_{record.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white italic tracking-tighter mt-1 uppercase">
                    {record.tableName === 'counts' ? `Escaneo_${record.data.barcode}` : `Registro_${record.tableName}`}
                  </h3>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest leading-none mb-1">timestamp</p>
                    <p className="text-[10px] font-black tabular-nums text-slate-400">{new Date(record.timestamp).toLocaleTimeString()}</p>
                  </div>
                  
                  <div className="flex gap-1">
                    {record.syncStatus === 'error' && (
                       <button onClick={() => retryRecord(record.id)} className="w-8 h-8 surface-glass rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-500/10">
                         <RefreshCw className="w-3.5 h-3.5" />
                       </button>
                    )}
                    <button onClick={() => deleteRecord(record.id)} className="w-8 h-8 surface-glass rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-500 hover:bg-rose-500/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {record.syncError && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 overflow-hidden">
                   <div className="flex items-start gap-2">
                     <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                     <p className="text-[10px] text-rose-400 font-bold uppercase tracking-tight leading-tight">
                       {record.syncError}
                     </p>
                   </div>
                </motion.div>
              )}

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                {Object.entries(record.data).slice(0, 4).map(([key, val]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] mb-1">{key}</span>
                    <span className="text-xs font-bold truncate text-slate-400 font-mono tracking-tight">{String(val)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {records?.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center py-40 text-center">
            <div className="w-20 h-20 surface-glass rounded-[2rem] flex items-center justify-center mb-6 border border-white/10 opacity-20">
               <Cloud className="w-10 h-10" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-700">Sin transmisiones activas</p>
          </div>
        )}
      </div>

      {/* Real-Time Action Footer */}
      <div className="p-8 bg-slate-900 border-t border-white/5 shrink-0 backdrop-blur-xl">
        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={handleSyncAll}
          disabled={isProcessing || !stats?.pending}
          className="w-full py-5 bg-white text-black disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-3 active:bg-blue-500 active:text-white"
        >
          {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> : <RefreshCw className="w-4 h-4" />}
          Lanzar Sincronización Global
        </motion.button>
      </div>
    </div>
  );
};

const StatusCard = ({ label, value, active, onClick, color, icon }: any) => {
  const colors = {
    amber: 'text-amber-500 bg-amber-500/5 border-amber-500/20',
    rose: 'text-rose-500 bg-rose-500/5 border-rose-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20'
  };
  
  return (
    <button 
      onClick={onClick}
      className={`flex-1 p-5 rounded-[2rem] border-2 transition-all flex flex-col gap-2 relative overflow-hidden group ${
        active 
          ? `${colors[color as keyof typeof colors]} scale-100 shadow-xl` 
          : 'bg-white/5 border-transparent text-slate-500 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 hover:border-white/5'
      }`}
    >
      <div className="flex items-center justify-between z-10">
        {icon}
        <span className="text-2xl font-black italic tabular-nums tracking-tighter">{value}</span>
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-left z-10">{label}</span>
      {active && (
        <motion.div layoutId="cardGlow" className="absolute -inset-1 bg-gradient-to-br from-white/10 to-transparent blur-xl pointer-events-none" />
      )}
    </button>
  );
};

export default GlobalSyncQueuePage;

// Forced GitHub sync
