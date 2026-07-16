"use client";
/**
 * AuditPanel - Panel de visualización de logs de auditoría
 */

import React, { useState, useMemo, useCallback } from 'react'
import { logger } from '@/services/logger';
;
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Search,
  Filter,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Package,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Send,
  XCircle,
  X,
  Info,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuditStore, AuditLog, AuditAction, AuditSeverity } from '@/stores';
import { exportAuditLogs } from '@/lib/auditExport';
import { toast } from 'sonner';

interface AuditPanelProps {
  className?: string;
  maxHeight?: number | string;
}

const ACTION_ICONS: Record<AuditAction, React.ReactNode> = {
  create: <Package className="w-4 h-4" />,
  read: <Search className="w-4 h-4" />,
  update: <RefreshCw className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
  login: <User className="w-4 h-4" />,
  logout: <User className="w-4 h-4" />,
  sync: <RefreshCw className="w-4 h-4" />,
  export: <Download className="w-4 h-4" />,
  import: <Download className="w-4 h-4" />,
  permission_change: <Shield className="w-4 h-4" />,
  settings_change: <Shield className="w-4 h-4" />,
  approve: <CheckCircle2 className="w-4 h-4" />,
  reject: <XCircle className="w-4 h-4" />,
  submit: <Send className="w-4 h-4" />,
  cancel: <X className="w-4 h-4" />,
  error: <AlertTriangle className="w-4 h-4" />,
  custom: <Info className="w-4 h-4" />,
};

const SEVERITY_CONFIG: Record<AuditSeverity, { color: string; bg: string; label: string }> = {
  info: { color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Info' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Advertencia' },
  error: { color: 'text-rose-400', bg: 'bg-rose-500/20', label: 'Error' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Crítico' },
  success: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Éxito' },
};

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Creación',
  read: 'Lectura',
  update: 'Actualización',
  delete: 'Eliminación',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  sync: 'Sincronización',
  export: 'Exportación',
  import: 'Importación',
  permission_change: 'Cambio de permisos',
  settings_change: 'Cambio de configuración',
  approve: 'Aprobación',
  reject: 'Rechazo',
  submit: 'Envío',
  cancel: 'Cancelación',
  error: 'Error',
  custom: 'Personalizada',
};

export const AuditPanel: React.FC<AuditPanelProps> = ({ className, maxHeight = 600 }) => {
  const { logs, getLogs, getActionStats, clearLogs, isEnabled } = useAuditStore();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('');
  const [filterSeverity, setFilterSeverity] = useState<AuditSeverity | ''>('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const filteredLogs = useMemo(() => {
    return getLogs({
      search: search || undefined,
      action: filterAction || undefined,
      severity: filterSeverity || undefined,
    }, 100);
  }, [logs, search, filterAction, filterSeverity, getLogs]);

  const stats = useMemo(() => getActionStats(), [logs]);

  const toggleExpand = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString('es-CL', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportXLSX = useCallback(async () => {
    if (filteredLogs.length === 0) {
      toast.error('No hay registros para exportar');
      return;
    }
    setIsExporting(true);
    try {
      await exportAuditLogs(filteredLogs, { format: 'xlsx' });
      toast.success(`Exportados ${filteredLogs.length} registros a Excel`);
    } catch (err) {
      toast.error('Error al exportar');
      logger.error('AuditPanel', 'Error exporting audit', err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  }, [filteredLogs]);

  const handleExportCSV = useCallback(async () => {
    if (filteredLogs.length === 0) {
      toast.error('No hay registros para exportar');
      return;
    }
    setIsExporting(true);
    try {
      await exportAuditLogs(filteredLogs, { format: 'csv' });
      toast.success(`Exportados ${filteredLogs.length} registros a CSV`);
    } catch (err) {
      toast.error('Error al exportar');
      logger.error('AuditPanel', 'Error exporting audit', err instanceof Error ? err.message : String(err));
    } finally {
      setIsExporting(false);
    }
  }, [filteredLogs]);

  const handleExportJSON = useCallback(() => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportados ${filteredLogs.length} registros a JSON`);
  }, [filteredLogs]);

  if (!isEnabled) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <Shield className="w-12 h-12 text-muted mx-auto mb-4" />
        <p className="text-muted">La auditoría está deshabilitada</p>
      </div>
    );
  }

  return (
    <div className={cn('bg-surface border border-subtle rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-subtle">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">Auditoría</h2>
              <p className="text-sm text-muted">{logs.length} registros totales</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className={cn(
              'p-2 rounded-lg transition-colors',
              showFilters ? 'bg-blue-500/20 text-blue-500' : 'hover:bg-elevated text-muted'
            )}>
              <Filter className="w-5 h-5" />
            </button>
            <div className="relative group">
              <button className="p-2 rounded-lg hover:bg-elevated text-muted flex items-center gap-1" title="Exportar">
                <Download className="w-5 h-5" />
                <ChevronDown className="w-3 h-3" />
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-subtle rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={handleExportXLSX}
                  disabled={isExporting}
                  className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-elevated text-left text-sm disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  Exportar Excel
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-elevated text-left text-sm disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                  Exportar CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-elevated text-left text-sm"
                >
                  <FileJson className="w-4 h-4 text-amber-500" />
                  Exportar JSON
                </button>
              </div>
            </div>
            <button onClick={() => clearLogs()} className="p-2 rounded-lg hover:bg-rose-500/20 text-muted hover:text-rose-500" title="Limpiar">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en registros..."
            className="w-full pl-10 pr-4 py-2.5 bg-base border border-subtle rounded-xl text-primary placeholder:text-muted focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-4 flex flex-wrap gap-4">
                <select value={filterAction} onChange={(e) => setFilterAction(e.target.value as AuditAction | '')}
                  className="px-3 py-2 bg-base border border-subtle rounded-lg text-sm">
                  <option value="">Todas las acciones</option>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as AuditSeverity | '')}
                  className="px-3 py-2 bg-base border border-subtle rounded-lg text-sm">
                  <option value="">Todos los niveles</option>
                  {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-b border-subtle bg-base/50">
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats).filter(([, count]) => count > 0).map(([action, count]) => (
            <div key={action} className="px-2 py-1 bg-elevated rounded-lg text-xs flex items-center gap-1.5">
              {ACTION_ICONS[action as AuditAction]}
              <span className="text-muted">{ACTION_LABELS[action as AuditAction]}:</span>
              <span className="font-medium text-primary">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="overflow-y-auto" style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}>
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted">No hay registros de auditoría</p>
          </div>
        ) : (
          <div className="divide-y divide-subtle">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const config = SEVERITY_CONFIG[log.severity];
              return (
                <div key={log.id} className="p-4 hover:bg-elevated/30 transition-colors">
                  <div className="flex items-start gap-3 cursor-pointer" onClick={() => toggleExpand(log.id)}>
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
                      <span className={config.color}>{ACTION_ICONS[log.action]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-primary">{log.description}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium uppercase', config.bg, config.color)}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimestamp(log.timestamp)}</span>
                        <span>{log.entityType}</span>
                        <span className="font-mono">{log.entityId}</span>
                        {log.userName && <span className="flex items-center gap-1"><User className="w-3 h-3" />{log.userName}</span>}
                      </div>
                    </div>
                    <div className={cn('w-5 h-5 rounded flex items-center justify-center transition-transform', isExpanded && 'rotate-90')}>
                      <ChevronRight className="w-4 h-4 text-muted" />
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && log.changes && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t border-subtle space-y-2">
                          {log.changes.fields?.length! > 0 && (
                            <div>
                              <p className="text-xs text-muted mb-1">Campos modificados:</p>
                              <div className="flex flex-wrap gap-1">
                                {log.changes.fields?.map((field) => (
                                  <span key={field} className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">{field}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {log.changes.before && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted mb-1">Antes:</p>
                                <pre className="p-2 bg-rose-500/10 rounded-lg text-xs font-mono overflow-x-auto">{JSON.stringify(log.changes.before, null, 2)}</pre>
                              </div>
                              <div>
                                <p className="text-xs text-muted mb-1">Después:</p>
                                <pre className="p-2 bg-emerald-500/10 rounded-lg text-xs font-mono overflow-x-auto">{JSON.stringify(log.changes.after, null, 2)}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditPanel;