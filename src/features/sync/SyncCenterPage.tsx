import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { genericSyncEngine } from '../../services/cloud/GenericSyncEngine';
import { syncRegistry } from '../../services/cloud/syncRegistry';
import { 
  Cloud, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Database,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const SyncCenterPage: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<{table: string, status: string, msg: string}[]>([]);
  
  // Get counts for each table
  const stats = useLiveQuery(async () => {
    const tableStats: Record<string, any> = {};
    for (const [key, meta] of Object.entries(syncRegistry)) {
      const localTable = (db as any)[meta.localTable];
      if (!localTable) continue;

      let query = localTable;
      if (meta.filterField && meta.filterValue) {
        query = localTable.where(meta.filterField).equals(meta.filterValue);
      }

      const total = await query.count();
      const pending = await query.filter((item: any) => item.syncStatus === 'pending' || item.syncStatus === 'error').count();
      const pendingDelete = await query.filter((item: any) => item.syncStatus === 'pending_delete').count();
      
      tableStats[key] = { total, pending: pending + pendingDelete };
    }
    return tableStats;
  }, []);

  const handleFullSync = async () => {
    setIsSyncing(true);
    setSyncLogs([]);
    
    const keys = Object.keys(syncRegistry);
    for (const key of keys) {
      setSyncLogs(prev => [{ table: key, status: 'syncing', msg: 'Sincronizando...' }, ...prev]);
      const res = await genericSyncEngine.sync(key);
      
      setSyncLogs(prev => {
        const newLogs = [...prev];
        const index = newLogs.findIndex(l => l.table === key);
        if (res.success) {
          const push = res.pushRes?.success || 0;
          const pull = (res.pullRes?.added || 0) + (res.pullRes?.updated || 0);
          newLogs[index] = { 
            table: key, 
            status: 'success', 
            msg: `Completado: ↑${push} ↓${pull}` 
          };
        } else {
          newLogs[index] = { 
            table: key, 
            status: 'error', 
            msg: `Error: ${res.error}` 
          };
        }
        return newLogs;
      });
    }
    
    setIsSyncing(false);
  };

  const totalPending = stats ? Object.values(stats).reduce((acc, curr) => acc + curr.pending, 0) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Cloud className="w-8 h-8 text-blue-400" />
            Centro de Sincronización
          </h1>
          <p className="text-slate-400 text-sm">
            Gestiona la integridad de tus datos en la nube y local
          </p>
        </div>
        
        <button
          onClick={handleFullSync}
          disabled={isSyncing}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            isSyncing 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500 active:scale-95'
          }`}
        >
          <RefreshCcw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Todo'}
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <History className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-slate-400 text-sm font-medium">Pendientes</span>
          </div>
          <div className="text-3xl font-black text-white">
            {totalPending}
          </div>
        </div>
        
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-slate-400 text-sm font-medium">Estado Global</span>
          </div>
          <div className="text-xl font-black text-emerald-400">
            {totalPending === 0 ? 'Actualizado' : 'Requiere Sinc'}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-slate-400 text-sm font-medium">Tablas Activas</span>
          </div>
          <div className="text-3xl font-black text-white">
            {Object.keys(syncRegistry).length}
          </div>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Tablas del Ecosistema
          </span>
          <span className="text-[10px] text-blue-400 font-mono">
            ENGINE V4.1 INCREMENTAL
          </span>
        </div>
        
        <div className="divide-y divide-slate-800">
          {Object.entries(syncRegistry).map(([key, meta]) => {
            const tableStat = stats?.[key] || { total: 0, pending: 0 };
            return (
              <div key={key} className="p-4 flex items-center justify-between hover:bg-slate-900/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${tableStat.pending > 0 ? 'bg-amber-500/10' : 'bg-slate-800'}`}>
                    <Database className={`w-5 h-5 ${tableStat.pending > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold capitalize">{key}</h3>
                    <p className="text-slate-500 text-xs font-mono uppercase">
                      {meta.remoteTable} • {tableStat.total} registros
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {tableStat.pending > 0 && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black"
                    >
                      <RefreshCcw className="w-3 h-3 animate-spin" />
                      {tableStat.pending} PENDIENTE
                    </motion.div>
                  )}
                  {tableStat.pending === 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black">
                      <CheckCircle2 className="w-3 h-3" />
                      SINCRONIZADO
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Logs */}
      <AnimatePresence>
        {syncLogs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 overflow-hidden"
          >
            <h3 className="text-slate-400 text-xs font-black uppercase mb-3 flex items-center gap-2">
              <History className="w-3 h-3" />
              Actividad Reciente
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {syncLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-slate-800 last:border-0">
                  <span className="text-white font-medium capitalize">{log.table}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-mono ${
                      log.status === 'success' ? 'text-emerald-400' : 
                      log.status === 'error' ? 'text-rose-400' : 'text-blue-400'
                    }`}>
                      {log.msg}
                    </span>
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : log.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <RefreshCcw className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-blue-400 shrink-0" />
        <div className="text-xs text-blue-400/80 leading-relaxed">
          <p className="font-bold mb-1 text-blue-400">Nota sobre Sincronización Profesional</p>
          El motor utiliza un protocolo de <strong>Last Write Wins (LWW)</strong>. Si un registro se modifica localmente mientras está desconectado, se marcará para sincronización al recuperar conexión. En caso de conflicto, la versión con la marca de tiempo más reciente prevalecerá.
        </div>
      </div>
    </div>
  );
};
