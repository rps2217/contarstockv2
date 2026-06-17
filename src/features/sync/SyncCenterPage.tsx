import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '../../db';
import type { SyncTabType, SyncLogEntry, SyncQueueItem } from './types/Sync';
import { genericSyncEngine } from '../../services/cloud/GenericSyncEngine';
import { syncRegistry } from '../../services/cloud/syncRegistry';
import { useSyncStore } from '../../store/useSyncStore';
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
  ChevronRight,
  ChevronLeft,
  Wifi,
  WifiOff,
  Clock,
  Play,
  FileText,
  Sparkles,
  AlertTriangle,
  Flame,
  Check,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '../../store/useToastStore';

export const SyncCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<SyncTabType>('queue');
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<SyncQueueItem | null>(null);

  const { incidents, lastSyncTime, isSupabaseConnected, syncError, clearIncidents, conflicts } = useSyncStore();
  const isOnline = navigator.onLine;

  // 1. Get counts and aggregate stats for each table
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

  // 2. Fetch actually pending, error, and pending_delete queue rows across Dexie tables (Like AppSheet's real outbox)
  const pendingQueueItems = useLiveQuery(async () => {
    const list: any[] = [];
    for (const [key, meta] of Object.entries(syncRegistry)) {
      const localTable = (db as any)[meta.localTable];
      if (!localTable) continue;
      
      let records: any[] = [];
      if (meta.filterField === 'tableName' && meta.filterValue) {
        records = await localTable.where('tableName').equals(meta.filterValue).toArray();
      } else {
        records = await localTable.toArray();
        if (meta.filterField && meta.filterValue) {
          records = records.filter((r: any) => r[meta.filterField!] === meta.filterValue);
        }
      }
      
      const filtered = records.filter((r: any) => 
        r.syncStatus === 'pending' || r.syncStatus === 'error' || r.syncStatus === 'pending_delete'
      );

      for (const r of filtered) {
        // Retrieve beautiful visual name
        let visualName = 'Registro';
        if (r.name) visualName = r.name;
        else if (r.logisticsLabel) visualName = r.logisticsLabel;
        else if (r.barcode) visualName = r.barcode;
        else if (r.data?.barcode) {
          visualName = `${r.data.barcode} • ${r.data.productName || 'Producto'}`;
        } else if (r.data?.name) {
          visualName = r.data.name;
        } else if (r.id) {
          visualName = `ID: ${r.id.substring(0, 8)}...`;
        }

        list.push({
          id: r[meta.primaryKey] || r.id,
          key,
          localTable: meta.localTable,
          remoteTable: meta.remoteTable,
          primaryKey: meta.primaryKey,
          status: r.syncStatus || 'pending',
          timestamp: r.timestamp || r.updatedAt || Date.now(),
          displayName: visualName,
          rawData: r
        });
      }
    }
    // Sort oldest first (FIFO transaction queue style)
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [selectedQueueItem]);

  const handleFullSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncLogs([]);
    addToast('Iniciando sincronización completa robusta...', 'info');
    
    try {
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
              msg: `Sometido: ↑${push} descargas: ↓${pull}` 
            };
          } else {
            newLogs[index] = { 
              table: key, 
              status: 'error', 
              msg: `${res.error || 'Fallo conexión'}` 
            };
          }
          return newLogs;
        });
      }
      addToast('Ciclo de reconciliación completado', 'success');
    } catch (err: any) {
      addToast(`Sincronización trunca: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSingleTableSync = async (key: string) => {
    addToast(`Sincronizando tabla ${key.toUpperCase()}...`, 'info');
    try {
      const res = await genericSyncEngine.sync(key);
      if (res.success) {
        const push = res.pushRes?.success || 0;
        const pull = (res.pullRes?.added || 0) + (res.pullRes?.updated || 0);
        addToast(`Sincronizado ${key.toUpperCase()}: Subidos ↑${push} Descargados ↓${pull}`, 'success');
      } else {
        addToast(`Conflicto de sincronización en ${key}: ${res.error}`, 'error');
      }
    } catch (e: any) {
      addToast(`Error: ${e.message}`, 'error');
    }
  };

  const handleDiscardItem = async (item: any) => {
    const confirmDiscard = window.confirm(
      `¿Deseas descartar este cambio local?\nSe borrará de la cola local de pendientes y se restaurará con la versión oficial de la nube en la próxima sincronización.`
    );
    if (!confirmDiscard) return;

    try {
      const localTable = (db as any)[item.localTable];
      if (localTable) {
        await localTable.delete(item.id);
        addToast('Registro descartado de la bandeja de salida local', 'success');
        setSelectedQueueItem(null);
      }
    } catch (e: any) {
      addToast(`No se pudo descartar: ${e.message}`, 'error');
    }
  };

  const handleForceComplete = async (item: any) => {
    const confirmForce = window.confirm(
      `¿Deseas forzar la marca de "Sincronizado" para este registro?\nEsto evitará que se vuelva a intentar empujar a la nube, considerándolo salvado localmente.`
    );
    if (!confirmForce) return;

    try {
      const localTable = (db as any)[item.localTable];
      if (localTable) {
        await localTable.update(item.id, { 
          syncStatus: 'synced',
          lastSyncTimestamp: Date.now() 
        });
        addToast('Registro marcado como sincronizado', 'success');
        setSelectedQueueItem(null);
      }
    } catch (e: any) {
      addToast(`No se pudo actualizar: ${e.message}`, 'error');
    }
  };

  const totalPending = stats ? Object.values(stats).reduce((acc, curr) => acc + curr.pending, 0) : 0;

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

      {/* Network Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Connection status */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Estado del Dispositivo</span>
            <span className="text-sm font-black uppercase mt-1 block flex items-center gap-1.5">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400" /> Con Conexión
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-rose-500" /> Modo Offline
                </>
              )}
            </span>
          </div>
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'} shadow-lg`} />
        </div>

        {/* Sync Queue Badge */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4.5 rounded-2xl">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Pendientes en Cola</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white">{totalPending}</span>
            <span className="text-[10px] text-slate-400 font-mono">Modificados</span>
          </div>
        </div>

        {/* Database Health */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4.5 rounded-2xl">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Canal Cloud</span>
          <span className="text-sm font-black uppercase mt-1 block flex items-center gap-1.5">
            {isSupabaseConnected ? (
              <span className="text-emerald-400">Canal Abierto</span>
            ) : (
              <span className="text-amber-500">Conexión Inestable</span>
            )}
          </span>
        </div>

        {/* Last Sync */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-4.5 rounded-2xl">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Última Reconciliación</span>
          <span className="text-xs font-bold text-slate-400 font-mono mt-1.5 block">
            {lastSyncTime ? format(new Date(lastSyncTime), 'HH:mm:ss dd/MM', { locale: es }) : 'Nunca'}
          </span>
        </div>
      </div>
                      
      {/* Conflicts Alert Banner */}
      {conflicts > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4.5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wide">¡Se detectaron {conflicts} conflictos de sincronización!</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Algunos registros fueron modificados localmente y remotamente de manera independiente. Se conservó rigurosamente tu versión local para evitar perder tu trabajo. Visita la pestaña de Incidentes para auditar las discrepancias.
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
          Esquemas de Reconciliación
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'incidents' ? 'bg-slate-900 text-white shadow-xl border border-white/5' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Incidentes ({incidents?.length || 0})
        </button>
      </div>

      {/* TAB 1: OUTPUT QUEUE */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Cola Secuencial (Cambios No Sometidos)
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">FIFO Orden de Transacciones</span>
            </div>

            {pendingQueueItems && pendingQueueItems.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-900 rounded-3xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
                <h3 className="text-md font-black text-white uppercase">¡Bandeja de Salida Limpia!</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
                  Todos tus cambios locales han sido totalmente persistidos y garantizados en el servidor de la nube.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {pendingQueueItems?.map((item: any) => {
                  const dateStr = format(new Date(item.timestamp), 'HH:mm:ss (dd/MM)', { locale: es });
                  const isError = item.status === 'error';
                  const isDelete = item.status === 'pending_delete';
                  
                  return (
                    <motion.div
                      key={`${item.key}-${item.id}`}
                      onClick={() => setSelectedQueueItem(item)}
                      whileHover={{ x: 2 }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedQueueItem?.id === item.id 
                          ? 'bg-blue-600/10 border-blue-500' 
                          : isError 
                            ? 'bg-rose-950/10 border-rose-900/50 hover:bg-rose-950/20' 
                            : isDelete 
                              ? 'bg-amber-950/10 border-amber-900/50 hover:bg-amber-950/20'
                              : 'bg-slate-900/30 border-slate-800 hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          isError ? 'bg-rose-500 animate-pulse' : isDelete ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-wide block">
                            {item.key.toUpperCase()} • <span className="text-[10px] font-mono lowercase">{item.displayName.substring(0, 30)}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                            Creado: {dateStr}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isError ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                          isDelete ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {item.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conflict Inspection Sidebar */}
          <div className="bg-slate-950/40 border border-slate-900 rounded-3xl p-5 space-y-4 h-fit sticky top-0">
            {selectedQueueItem ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                  <h3 className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" /> Insccionar Operación
                  </h3>
                  <button 
                    onClick={() => setSelectedQueueItem(null)} 
                    className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-black"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">Tabla Destino (Cloud)</span>
                  <span className="text-xs font-mono text-blue-400 bg-blue-400/5 px-2.5 py-1 rounded border border-blue-500/10 inline-block">
                    {selectedQueueItem.remoteTable}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">ID Transaccional</span>
                  <span className="text-xs font-mono text-slate-300 font-bold block bg-slate-900 px-2.5 py-1.5 rounded truncate">
                    {selectedQueueItem.id}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">Datos Contenidos</span>
                  <div className="bg-slate-950 p-3 rounded-2xl text-[10px] font-mono text-slate-400 overflow-x-auto max-h-48 custom-scrollbar space-y-1.5 border border-slate-900/50">
                    {Object.entries(selectedQueueItem.rawData.data || selectedQueueItem.rawData).map(([key, value]) => {
                      if (['syncStatus', 'lastSyncTimestamp', 'tableName'].includes(key)) return null;
                      return (
                        <div key={key} className="flex justify-between gap-4 border-b border-white/5 py-1 last:border-0">
                          <span className="text-slate-500 font-bold">{key}:</span>
                          <span className="text-slate-300 break-all text-right">{JSON.stringify(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Conflict Solver buttons */}
                <div className="space-y-2 pt-3 border-t border-slate-900">
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">Resolución de Conflictos Offline (Estilo AppSheet)</span>
                  
                  <button
                    onClick={() => handleSingleTableSync(selectedQueueItem.key)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Forzar Envío de Tabla
                  </button>

                  <button
                    onClick={() => handleForceComplete(selectedQueueItem)}
                    className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Ignorar y Marcar Exitoso
                  </button>

                  <button
                    onClick={() => handleDiscardItem(selectedQueueItem)}
                    className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Descartar Cambio Local
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-600 block">
                <Sparkles className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <h4 className="text-xs font-black uppercase text-slate-500">Inspección Offline</h4>
                <p className="text-[10px] text-slate-600 mt-1 max-w-[200px] mx-auto">
                  Selecciona una transacción de la lista para auditar su payload, ver sus datos en crudo o resolver conflictos de sincronización manual.
                </p>
              </div>
            )}
          </div>
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

      {/* TAB 3: SYSTEM INCIDENTS & ERROR LOG */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Panel de Incidencias de Transacción
            </h2>
            {incidents && incidents.length > 0 && (
              <button
                onClick={clearIncidents}
                className="text-[10px] font-black text-rose-400 hover:text-rose-300 flex items-center gap-1.5 uppercase transition-all"
              >
                <Trash2 className="w-3 h-3" /> Purgar Historial de Errores
              </button>
            )}
          </div>

          {incidents && incidents.length === 0 ? (
            <div className="bg-slate-950/40 border border-slate-905 rounded-3xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-md font-black text-white uppercase">Cero Incidencias Registradas</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
                Tu motor de sincronización de datos no ha registrado fallas de integridad o errores de servidor de base de datos recientemente.
              </p>
            </div>
          ) : (
            <div className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-900 divide-y divide-slate-800">
              {incidents?.map((inc, index) => {
                const dateStr = format(new Date(inc.time || Date.now()), 'HH:mm:ss dd/MM', { locale: es });
                return (
                  <div key={index} className="p-4.5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 h-fit mt-0.5">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          ESQUEMA: {inc.table}
                        </span>
                        <p className="text-rose-400 text-xs font-bold font-mono mt-1.5 leading-relaxed leading-tighter">
                          {inc.error}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      Ocurrido: {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sync Logging Flow (Recent Activity) */}
      <AnimatePresence>
        {syncLogs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-950 p-4 border border-slate-900 rounded-3xl"
          >
            <h3 className="text-slate-400 text-xs font-black uppercase mb-3.5 flex items-center gap-2">
              <History className="w-3.5 h-3.5" />
              Log del Canal de Sync (Flujo de Reconciliación Activo)
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar font-mono text-[10px]">
              {syncLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-900 last:border-0 text-slate-300">
                  <span className="font-bold capitalize">{log.table}</span>
                  <div className="flex items-center gap-3">
                    <span className={
                      log.status === 'success' ? 'text-emerald-400' : 
                      log.status === 'error' ? 'text-rose-400' : 'text-blue-400'
                    }>
                      {log.msg}
                    </span>
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : log.status === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <RefreshCcw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-amber-500/5 border border-amber-500/10 p-5 rounded-3xl flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <p className="font-black mb-1.5 text-amber-400 uppercase tracking-widest">Garantía de Sincronización Profesional</p>
          Inspirándonos en el motor de AppSheet, cada alteración que relices en modo local u offline se registra en una bandeja de salida en orden estrictamente temporal (FIFO). El aplicativo vigilará de forma automática las fluctuaciones de red. Al momento de reconectarse con los servidores en línea, el sistema despachará el cargamento transaccional acumulado y auditará/resolverá cualquier conflicto de manera íntegra, asegurando cero pérdidas de información de inventario.
        </div>
      </div>
    </div>
  );
};

export default SyncCenterPage;
