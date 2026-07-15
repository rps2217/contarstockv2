/**
 * AuditPanel - Panel de auditoría estilo AppSheet
 * 
 * Muestra el historial de cambios de un registro o tabla.
 */

import React, { useState, useEffect } from 'react'
import { logger } from '@/services/logger';
;
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  History, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Edit3, 
  Trash2,
  Clock,
  User,
  Database,
  Filter,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import type { AuditLogEntry } from '@/db';

interface AuditPanelProps {
  /** ID del registro a auditar (opcional) */
  recordId?: string;
  /** Nombre de la tabla */
  tableName?: string;
  /** Función para cargar historial de tabla (con límite) */
  loadHistory: (tableName: string, limit?: number) => Promise<AuditLogEntry[]>;
  /** Título personalizado */
  title?: string;
  /** Límite de entradas a mostrar */
  limit?: number;
  /** Callback cuando se selecciona ver detalle de registro */
  onViewRecord?: (recordId: string, tableName: string) => void;
  /** Función para sincronizar a la nube */
  onSyncToCloud?: () => Promise<{ synced: number; failed: number }>;
  /** Número de entradas pendientes de sincronizar */
  pendingCount?: number;
}

const ACTION_CONFIG = {
  CREATE: { icon: Plus, color: 'emerald', label: 'Creado' },
  UPDATE: { icon: Edit3, color: 'blue', label: 'Editado' },
  DELETE: { icon: Trash2, color: 'rose', label: 'Eliminado' },
} as const;

const COLOR_MAP = {
  emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
  blue: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
  rose: 'text-rose-400 bg-rose-400/10 border-rose-500/20',
};

export const AuditPanel: React.FC<AuditPanelProps> = ({
  recordId,
  tableName,
  loadHistory,
  title = 'Historial de Cambios',
  limit = 50,
  onViewRecord,
  onSyncToCloud,
  pendingCount = 0,
}) => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterTable, setFilterTable] = useState<string>(tableName || '');
  const [showAll, setShowAll] = useState(!recordId);
  const [syncing, setSyncing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = limit || 50;

  // Obtener tablas únicas
  const tables = [...new Set(entries.map(e => e.tableName))];

  // Cargar historial con offset para paginación
  const fetchHistory = async (offset = 0) => {
    setLoading(true);
    try {
      const targetTable = showAll ? filterTable : (tableName || '');
      
      if (!targetTable) {
        setEntries([]);
        return;
      }

      // Cargar PAGE_SIZE + 1 para verificar si hay más
      const history = await loadHistory(targetTable, PAGE_SIZE + 1);
      const hasMoreResults = history.length > PAGE_SIZE;
      const items = hasMoreResults ? history.slice(0, PAGE_SIZE) : history;
      
      if (offset === 0) {
        setEntries(items);
      } else {
        setEntries(prev => [...prev, ...items]);
      }
      setHasMore(hasMoreResults);
    } catch (err) {
      console.error('Error loading audit history:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    fetchHistory(entries.length);
  };

  useEffect(() => {
    fetchHistory();
  }, [recordId, tableName, filterTable, showAll, loadHistory, limit]);

  // Sincronizar a la nube
  const handleSync = async () => {
    if (!onSyncToCloud || syncing) return;
    
    setSyncing(true);
    try {
      const result = await onSyncToCloud();
      if (result.synced > 0) {
        await fetchHistory(); // Refresh
      }
    } finally {
      setSyncing(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    return format(new Date(ts), "dd MMM, HH:mm:ss", { locale: es });
  };

  const parseValue = (value?: string) => {
    if (!value) return 'N/A';
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : String(parsed);
    } catch {
      return value;
    }
  };

  const renderEntry = (entry: AuditLogEntry) => {
    const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.UPDATE;
    const Icon = config.icon;
    const isExpanded = expandedId === entry.id;

    return (
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-subtle rounded-2xl overflow-hidden bg-base/30"
      >
        {/* Header */}
        <div
          onClick={() => setExpandedId(isExpanded ? null : entry.id!)}
          className="p-4 flex items-center gap-3 cursor-pointer hover:bg-surface/30 transition-colors"
        >
          {/* Action Badge */}
          <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 border ${COLOR_MAP[config.color]}`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-secondary uppercase">
                {entry.tableName}
              </span>
              {entry.fieldName && (
                <span className="text-[10px] text-slate-500 font-mono">
                  • {entry.fieldName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(entry.timestamp)}
              </span>
              {entry.userId && entry.userId !== 'anonymous' && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {entry.userId}
                </span>
              )}
            </div>
          </div>

          {/* Expand Icon */}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>

        {/* Expanded Detail */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-900">
                {/* Record ID */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                      ID Registro
                    </span>
                    <p className="text-xs font-mono text-secondary bg-surface px-2.5 py-1.5 rounded-lg mt-1">
                      {entry.recordId}
                    </p>
                  </div>
                  {onViewRecord && (
                    <button
                      onClick={() => onViewRecord(entry.recordId, entry.tableName)}
                      className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20 uppercase transition-colors"
                    >
                      Ver Detalle →
                    </button>
                  )}
                </div>

                {/* Values */}
                {(entry.oldValue || entry.newValue) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                        Antes
                      </span>
                      <pre className="text-[10px] font-mono text-rose-400 bg-rose-500/5 px-2.5 py-1.5 rounded-lg mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all">
                        {parseValue(entry.oldValue)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                        Después
                      </span>
                      <pre className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 px-2.5 py-1.5 rounded-lg mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all">
                        {parseValue(entry.newValue)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Device Info */}
                {entry.deviceInfo && (
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                      Dispositivo
                    </span>
                    <p className="text-[10px] font-mono text-muted mt-1">
                      {entry.deviceInfo}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-secondary flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          {title}
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full">
              {pendingCount} pendientes
            </span>
          )}
        </h3>
        
        <div className="flex items-center gap-2">
          {showAll && (
            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="text-[10px] bg-surface border border-subtle rounded-lg px-2 py-1.5 text-muted focus:border-blue-500 outline-none"
            >
              <option value="">Todas las tablas</option>
              {tables.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
          
          {onSyncToCloud && (
            <button
              onClick={handleSync}
              disabled={syncing || pendingCount === 0}
              className={`p-1.5 rounded-lg transition-colors ${
                pendingCount > 0 
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' 
                  : 'bg-surface text-slate-500 cursor-not-allowed'
              }`}
              title="Sincronizar a la nube"
            >
              <Upload className={`w-3.5 h-3.5 ${syncing ? 'animate-pulse' : ''}`} />
            </button>
          )}
          
          <button
            onClick={() => fetchHistory()}
            className="p-1.5 rounded-lg bg-surface hover:bg-elevated text-muted transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toggle View */}
      {!recordId && (
        <div className="flex bg-base rounded-xl p-1 gap-1">
          <button
            onClick={() => setShowAll(true)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              showAll 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'text-slate-500'
            }`}
          >
            <Database className="w-3 h-3" />
            Ver Todo
          </button>
          <button
            onClick={() => {
              setShowAll(false);
              setFilterTable(tableName || '');
            }}
            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              !showAll 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'text-slate-500'
            }`}
          >
            <Filter className="w-3 h-3" />
            Este Registro
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-base/40 border border-slate-900 rounded-2xl p-8 text-center">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-muted">Sin historial de cambios</p>
          <p className="text-[10px] text-slate-500 mt-1">
            Los cambios aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {entries.map(renderEntry)}
        </div>
      )}

      {/* Footer */}
      {entries.length > 0 && (
        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2">
          <span>{entries.length} entradas</span>
          {hasMore && (
            <button 
              onClick={loadMore} 
              disabled={loading}
              className="text-blue-400 hover:text-blue-300 font-bold disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Ver más →'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditPanel;
