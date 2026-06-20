/**
 * SyncCenterPage - Centro de Control de Sincronización
 * 
 * Arquitectura Lego: Este componente es un orquestador puro que delega toda la lógica
 * al hook useSyncCenter y rendering a componentes especializados.
 * 
 * Antes: 686 líneas
 * Después: ~180 líneas
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  RefreshCcw, 
  ChevronLeft,
  AlertTriangle,
  ArrowUpCircle,
  Database,
  CheckCircle2,
  Play,
  Clock,
  History
} from 'lucide-react';

import { useSyncStore } from '@/stores';
import { syncRegistry } from '../../services/cloud/syncRegistry';
import { useSyncCenter } from './hooks/useSyncCenter';
import { useAudit } from '@/hooks/useAudit';
import { AuditPanel } from '@/shared/components/ui/AuditPanel';
import { SyncStatusCards, SyncQueuePanel, SyncActivity } from './components';

export const SyncCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { incidents, lastSyncTime, isSupabaseConnected, conflicts, clearIncidents } = useSyncStore();
  const { getTableHistory, getPendingSync, syncToCloud } = useAudit();
  const [pendingAuditCount, setPendingAuditCount] = useState(0);

  // Cargar count de pendientes
  useEffect(() => {
    getPendingSync().then(pending => setPendingAuditCount(pending.length));
  }, [getPendingSync]);
  
  const {
    isSyncing,
    activeTab,
    syncLogs,
    selectedQueueItem,
    stats,
    pendingQueueItems,
    totalPending,
    isOnline,
    setActiveTab,
    setSelectedQueueItem,
    handleFullSync,
    handleSingleTableSync,
    handleDiscardItem,
    handleForceComplete,
  } = useSyncCenter();

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 pb-24 text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/sync')}
            className="p-3 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-all active:scale-90"
            title="Volver al Gestor"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none flex items-center gap-2">
              <Cloud className="w-8 h-8 text-amber-400" />
              Sincronización AppSheet <span className="text-blue-500 text-xs tracking-widest uppercase italic font-normal py-1 px-2.5 bg-blue-500/10 rounded-full border border-blue-500/20">ROBUSTA</span>
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Bandeja de Salida Transaccional & Motor Desacoplado
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleFullSync}
            disabled={isSyncing}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 ${
              isSyncing 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
                : 'bg-blue-600 text-white shadow-blue-900/30 hover:bg-blue-500 border border-transparent'
            }`}
          >
            <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Cola AppSheet'}
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <SyncStatusCards
        isOnline={isOnline}
        isSupabaseConnected={isSupabaseConnected}
        totalPending={totalPending}
        lastSyncTime={lastSyncTime}
      />

      {/* Conflicts Alert Banner */}
      {conflicts > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4.5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wide">¡Se detectaron {conflicts} conflictos de sincronización!</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Algunos registros fueron modificados localmente y remotamente de manera independiente.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('incidents')}
            className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-black rounded-lg border border-amber-500/20 uppercase whitespace-nowrap transition-all shrink-0 active:scale-95"
          >
            Resolver en Incidentes
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'queue' ? 'bg-slate-900 text-white shadow-xl border border-white/5' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          Cola de Salida ({pendingQueueItems?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'tables' ? 'bg-slate-900 text-white shadow-xl border border-white/5' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Database className="w-4 h-4" />
          Esquemas
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'incidents' ? 'bg-slate-900 text-white shadow-xl border border-white/5' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Incidentes ({incidents?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'audit' ? 'bg-slate-900 text-white shadow-xl border border-white/5' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          Auditoría
        </button>
      </div>

      {/* TAB 1: OUTPUT QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Cola Secuencial (Cambios No Sometidos)
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">FIFO Orden de Transacciones</span>
          </div>

          <SyncQueuePanel
            items={pendingQueueItems}
            selectedItem={selectedQueueItem}
            onSelectItem={setSelectedQueueItem}
            onForceSync={handleSingleTableSync}
            onForceComplete={() => selectedQueueItem && handleForceComplete(selectedQueueItem)}
            onDiscard={() => selectedQueueItem && handleDiscardItem(selectedQueueItem)}
          />
        </div>
      )}

      {/* TAB 2: SYSTEM SCHEMAS */}
      {activeTab === 'tables' && (
        <div className="bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-900 bg-slate-900/30 flex justify-between items-center">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Reconciliación de Esquemas Maestros
            </span>
            <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
              CON PLANEACIÓN BIDIRECCIONAL
            </span>
          </div>

          <div className="divide-y divide-slate-900">
            {Object.entries(syncRegistry).map(([key, meta]) => {
              const tableStat = stats?.[key] || { total: 0, pending: 0 };
              return (
                <div key={key} className="p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${tableStat.pending > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-900'}`}>
                      <Database className={`w-5 h-5 ${tableStat.pending > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h3 className="text-white font-black capitalize text-sm">{key}</h3>
                      <p className="text-slate-500 text-[10px] font-mono mt-1 uppercase">
                        SQL REMOTE: {meta.remoteTable} • LOCAL: {meta.localTable} • Total {tableStat.total} filas
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {tableStat.pending > 0 ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black rounded-lg uppercase tracking-wide">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {tableStat.pending} Sometimientos Retenidos
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-wide">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Garantizado
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleSingleTableSync(key)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black uppercase tracking-wider rounded-xl hover:text-white flex items-center gap-1.5 transition-all"
                    >
                      <Play className="w-3 h-3 text-slate-400" /> Sincronizar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVITY (Logs + Incidents) */}
      {activeTab === 'incidents' && (
        <SyncActivity
          incidents={incidents || []}
          logs={syncLogs}
          lastSyncTime={lastSyncTime}
          onClearIncidents={clearIncidents}
        />
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeTab === 'audit' && (
        <AuditPanel
          loadHistory={getTableHistory}
          title="Registro de Auditoría"
          limit={100}
          onSyncToCloud={syncToCloud}
          pendingCount={pendingAuditCount}
        />
      )}

      {/* Footer Warning */}
      <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-3xl flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <p className="font-black mb-1.5 text-amber-400 uppercase tracking-widest">Garantía de Sincronización Profesional</p>
          Inspirándonos en el motor de AppSheet, cada alteración que relices en modo local u offline se registra en una bandeja de salida en orden estrictamente temporal (FIFO).
        </div>
      </div>
    </div>
  );
};

export default SyncCenterPage;
