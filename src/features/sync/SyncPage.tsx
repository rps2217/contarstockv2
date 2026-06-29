/**
 * SyncPage - Página unificada de sincronización
 * 
 * Combina SyncPage (subida de inventario) y SyncCenterPage (centro de control)
 * en una sola vista con tabs para alternar entre diferentes funciones.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  RefreshCw,
  ChevronLeft,
  AlertTriangle,
  ArrowUpCircle,
  Database,
  CheckCircle2,
  Play,
  Clock,
  History,
  Activity,
  DownloadCloud,
  UploadCloud,
  ShieldCheck,
  Info,
  Loader2
} from 'lucide-react';

import { useSyncStore } from '@/stores';
import { syncRegistry } from '../../services/cloud/syncRegistry';
import { useSyncCenter } from './hooks/useSyncCenter';
import { useAudit } from '@/hooks/useAudit';
import { AuditPanel } from '@/shared/components/ui/AuditPanel';
import { useSyncManager } from './hooks/useSyncManager';
import { SyncGroupCard } from './components/SyncGroupCard';
import { 
  SyncStatusCards, 
  SyncQueuePanel, 
  SyncActivity,
  ConflictStrategyPanel,
  SyncMetricsDashboard
} from './components';
import { syncMetrics } from '@/services/cloud/SyncMetrics';
import { useSyncHealthAlert } from './hooks/useSyncHealthAlert';

type TabType = 'upload' | 'queue' | 'tables' | 'incidents' | 'audit';

export const SyncPage: React.FC = () => {
  const navigate = useNavigate();
  
  // ==================== SHARED STATE ====================
  const { incidents, lastSyncTime, isSupabaseConnected, conflicts, clearIncidents } = useSyncStore();
  const { getTableHistory, getPendingSync, syncToCloud } = useAudit();
  const { isHealthy } = useSyncHealthAlert(true);
  
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [pendingAuditCount, setPendingAuditCount] = useState(0);
  const [isStrategyPanelOpen, setIsStrategyPanelOpen] = useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);

  // ==================== SYNC CENTER STATE ====================
  const {
    isSyncing,
    syncLogs,
    selectedQueueItem,
    stats,
    pendingQueueItems,
    totalPending,
    isOnline,
    setSelectedQueueItem,
    handleFullSync,
    handleSingleTableSync,
    handleDiscardItem,
    handleForceComplete,
  } = useSyncCenter();

  // ==================== SYNC MANAGER STATE ====================
  const { state, actions } = useSyncManager();

  // Load pending audit count
  useEffect(() => {
    getPendingSync().then(pending => setPendingAuditCount(pending.length));
  }, [getPendingSync]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-base text-white font-sans">
      {/* Header */}
      <div className="bg-surface border-b border-subtle px-4 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="p-2 bg-white/5 rounded-xl text-muted hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Cloud className={`w-6 h-6 ${isHealthy ? 'text-amber-400' : 'text-rose-400'}`} />
                Sincronización
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                <span className="text-[10px] text-muted font-medium uppercase tracking-wider">
                  {isOnline ? 'En línea' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMetricsOpen(true)}
              className="p-2.5 bg-white/5 rounded-xl text-muted hover:text-white transition-colors"
              title="Métricas"
            >
              <Activity className="w-5 h-5" />
            </button>
            <button
              onClick={handleFullSync}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-blue-600 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-subtle bg-surface/50 p-1 gap-1 overflow-x-auto shrink-0">
        <TabButton 
          active={activeTab === 'upload'} 
          onClick={() => setActiveTab('upload')}
          icon={<ArrowUpCircle className="w-4 h-4" />}
        >
          Subida
        </TabButton>
        <TabButton 
          active={activeTab === 'queue'} 
          onClick={() => setActiveTab('queue')}
          icon={<Clock className="w-4 h-4" />}
          badge={pendingQueueItems?.length}
        >
          Cola
        </TabButton>
        <TabButton 
          active={activeTab === 'tables'} 
          onClick={() => setActiveTab('tables')}
          icon={<Database className="w-4 h-4" />}
        >
          Esquemas
        </TabButton>
        <TabButton 
          active={activeTab === 'incidents'} 
          onClick={() => setActiveTab('incidents')}
          icon={<AlertTriangle className="w-4 h-4" />}
          badge={incidents?.length}
          alert={conflicts > 0}
        >
          Incidentes
        </TabButton>
        <TabButton 
          active={activeTab === 'audit'} 
          onClick={() => setActiveTab('audit')}
          icon={<History className="w-4 h-4" />}
        >
          Auditoría
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {/* ==================== UPLOAD TAB ==================== */}
          {activeTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 max-w-5xl mx-auto"
            >
              {/* Info Card */}
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-xs text-blue-300">
                  Gestiona <strong>Movimientos de Inventario</strong> (picks) y <strong>Tablas Dinámicas</strong>.
                  La sincronización de productos se hace en el Catálogo.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ActionButton
                  icon={<UploadCloud className="w-5 h-5" />}
                  label="Respaldar"
                  sublabel="Configuración"
                  onClick={actions.handlePushConfig}
                  disabled={state.isProcessing}
                />
                <ActionButton
                  icon={<DownloadCloud className="w-5 h-5" />}
                  label="Restaurar"
                  sublabel="Configuración"
                  onClick={actions.handlePullConfig}
                  disabled={state.isProcessing}
                />
                <ActionButton
                  icon={<DownloadCloud className="w-5 h-5" />}
                  label="Descargar"
                  sublabel="Órdenes ERP"
                  onClick={actions.handleDownloadOrders}
                  disabled={state.isProcessing}
                />
                <ActionButton
                  icon={<ShieldCheck className="w-5 h-5" />}
                  label="Auditar"
                  sublabel="Integridad"
                  onClick={actions.handleVerifyIntegrity}
                  disabled={state.isProcessing}
                />
              </div>

              {/* Upload Groups */}
              {state.uiGroups.length === 0 ? (
                <div className="text-center py-16 text-neutral-500">
                  <Cloud className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No hay datos pendientes de sincronización</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {state.uiGroups.map(g => (
                    <SyncGroupCard key={g.erpOrder} group={g} uiStatus={g.uiStatus} progress={g.progress} />
                  ))}
                </div>
              )}

              {/* Sync Button */}
              <button
                onClick={actions.handleSyncAll}
                disabled={state.isProcessing || state.uiGroups.length === 0}
                className="w-full py-4 bg-blue-600 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state.isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Sincronizando...</>
                ) : (
                  <><ArrowUpCircle className="w-5 h-5" /> Subir Cambios Ahora</>
                )}
              </button>

              {/* Logs */}
              {state.logs.length > 0 && (
                <div className="bg-surface rounded-2xl p-4 font-mono text-[10px] text-muted space-y-1 max-h-48 overflow-auto">
                  {state.logs.map((log, i) => (
                    <div key={i} className={log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : ''}>
                      [{log.time}] {log.msg}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ==================== QUEUE TAB ==================== */}
          {activeTab === 'queue' && (
            <motion.div
              key="queue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 max-w-5xl mx-auto"
            >
              <SyncStatusCards
                isOnline={isOnline}
                isSupabaseConnected={isSupabaseConnected}
                totalPending={totalPending}
                lastSyncTime={lastSyncTime}
              />

              {conflicts > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-400">{conflicts} conflictos detectados</p>
                    <p className="text-[10px] text-muted mt-1">Algunos registros fueron modificados localmente y remotamente.</p>
                  </div>
                </div>
              )}

              <SyncQueuePanel
                items={pendingQueueItems}
                selectedItem={selectedQueueItem}
                onSelectItem={setSelectedQueueItem}
                onForceSync={handleSingleTableSync}
                onForceComplete={() => selectedQueueItem && handleForceComplete(selectedQueueItem)}
                onDiscard={() => selectedQueueItem && handleDiscardItem(selectedQueueItem)}
              />
            </motion.div>
          )}

          {/* ==================== TABLES TAB ==================== */}
          {activeTab === 'tables' && (
            <motion.div
              key="tables"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto"
            >
              <div className="bg-surface border border-subtle rounded-3xl overflow-hidden">
                <div className="p-4 border-b border-subtle flex justify-between items-center">
                  <span className="text-xs font-bold text-muted uppercase tracking-widest">Esquemas</span>
                  <span className="text-[10px] text-blue-400 font-mono">BIDIRECCIONAL</span>
                </div>
                <div className="divide-y divide-slate-800">
                  {Object.entries(syncRegistry).map(([key, meta]) => {
                    const tableStat = stats?.[key] || { total: 0, pending: 0 };
                    return (
                      <div key={key} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-elevated/50">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${tableStat.pending > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-elevated'}`}>
                            <Database className={`w-4 h-4 ${tableStat.pending > 0 ? 'text-amber-500' : 'text-muted'}`} />
                          </div>
                          <div>
                            <p className="font-bold text-sm capitalize">{key}</p>
                            <p className="text-[10px] text-neutral-500 font-mono">{tableStat.total} filas</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {tableStat.pending > 0 ? (
                            <span className="text-[10px] text-amber-400 font-bold">{tableStat.pending} pendientes</span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          )}
                          <button
                            onClick={() => handleSingleTableSync(key)}
                            className="px-3 py-1.5 bg-elevated hover:bg-elevated rounded-lg text-[10px] font-bold flex items-center gap-1.5"
                          >
                            <Play className="w-3 h-3" /> Sync
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== INCIDENTS TAB ==================== */}
          {activeTab === 'incidents' && (
            <motion.div
              key="incidents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto"
            >
              <SyncActivity
                incidents={incidents || []}
                logs={syncLogs}
                lastSyncTime={lastSyncTime}
                onClearIncidents={clearIncidents}
              />
            </motion.div>
          )}

          {/* ==================== AUDIT TAB ==================== */}
          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto"
            >
              <AuditPanel
                loadHistory={getTableHistory}
                title="Registro de Auditoría"
                limit={100}
                onSyncToCloud={syncToCloud}
                pendingCount={pendingAuditCount}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <ConflictStrategyPanel
        isOpen={isStrategyPanelOpen}
        onClose={() => setIsStrategyPanelOpen(false)}
      />
      
      <AnimatePresence>
        {isMetricsOpen && (
          <SyncMetricsDashboard
            isOpen={isMetricsOpen}
            onClose={() => setIsMetricsOpen(false)}
            onRefresh={() => syncMetrics.getStats()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ==================== HELPER COMPONENTS ====================

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
  alert?: boolean;
}> = ({ active, onClick, icon, children, badge, alert }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
      active 
        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
        : 'text-muted hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    {children}
    {badge !== undefined && badge > 0 && (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${alert ? 'bg-rose-500 text-white' : 'bg-elevated'}`}>
        {badge}
      </span>
    )}
  </button>
);

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, sublabel, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="p-4 bg-elevated/50 hover:bg-elevated border border-slate-700 rounded-2xl flex flex-col items-center gap-2 text-center transition-colors disabled:opacity-50"
  >
    <div className="text-blue-400">{icon}</div>
    <span className="text-xs font-bold">{label}</span>
    <span className="text-[10px] text-neutral-500">{sublabel}</span>
  </button>
);

export default SyncPage;
