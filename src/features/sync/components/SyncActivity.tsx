/**
 * SyncActivity - Panel unificado para logs e incidentes de sincronización
 * 
 * Combina historial de sincronización y errores en un solo componente con tabs.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  History, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  AlertTriangle,
  Trash2,
  Clock,
  Database
} from 'lucide-react';

interface SyncIncident {
  table: string;
  error: string;
  time?: number;
}

interface SyncLogEntry {
  table: string;
  status: 'syncing' | 'success' | 'error';
  msg: string;
  timestamp?: number;
}

interface SyncActivityProps {
  incidents: SyncIncident[];
  logs: SyncLogEntry[];
  lastSyncTime?: number | null;
  onClearIncidents?: () => void;
}

type TabType = 'logs' | 'incidents';

export const SyncActivity: React.FC<SyncActivityProps> = ({
  incidents,
  logs,
  lastSyncTime,
  onClearIncidents,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('logs');

  const formatDate = (timestamp?: number | null): string => {
    if (!timestamp) return 'Nunca';
    return format(new Date(timestamp), "dd 'de' MMM, HH:mm", { locale: es });
  };

  return (
    <div className="space-y-4">
      {/* Header con última sync */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Última Sincronización
            </p>
            <p className="text-sm font-black text-white">
              {formatDate(lastSyncTime)}
            </p>
          </div>
        </div>
        {lastSyncTime && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-400 uppercase">Exitosa</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/20 p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2.5 text-center text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'logs' 
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex-1 py-2.5 text-center text-[11px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'incidents' 
              ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Incidentes ({incidents.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {/* LOGS TAB */}
        <AnimatePresence mode="wait">
          {activeTab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {logs.length === 0 ? (
                <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-8 text-center">
                  <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-medium">Sin actividad reciente</p>
                </div>
              ) : (
                <div className="bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden">
                  {logs.map((log, i) => (
                    <div 
                      key={i} 
                      className="p-3 flex items-center justify-between border-b border-slate-900 last:border-0 hover:bg-slate-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-500' :
                          log.status === 'error' ? 'bg-rose-500 animate-pulse' :
                          'bg-blue-500 animate-pulse'
                        }`} />
                        <div>
                          <span className="text-xs font-bold text-slate-300 capitalize">{log.table}</span>
                          <span className="text-[10px] text-slate-500 ml-2">{log.msg}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {log.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                        {log.status === 'syncing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* INCIDENTS TAB */}
          {activeTab === 'incidents' && (
            <motion.div
              key="incidents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {incidents.length === 0 ? (
                <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-sm font-black text-white uppercase">Cero Incidencias</h3>
                  <p className="text-slate-500 text-[10px] mt-1 max-w-xs mx-auto">
                    Tu motor de sincronización no ha registrado fallas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {onClearIncidents && (
                    <button
                      onClick={onClearIncidents}
                      className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Purgar Todos los Errores
                    </button>
                  )}
                  <div className="bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden divide-y divide-slate-900">
                    {incidents.map((inc, index) => {
                      const dateStr = format(new Date(inc.time || Date.now()), 'HH:mm:ss (dd/MM)', { locale: es });
                      return (
                        <div key={index} className="p-4 flex items-start gap-3">
                          <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 mt-0.5">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                {inc.table}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {dateStr}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-rose-400 leading-relaxed break-words">
                              {inc.error}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SyncActivity;
