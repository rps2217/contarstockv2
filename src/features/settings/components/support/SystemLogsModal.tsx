import React, { useState, useEffect } from 'react';
import { X, Terminal, Trash2, Download, AlertCircle, ShieldCheck, Info } from 'lucide-react';
import { SystemLog } from '../../../../db';
import { logger } from '../../../../services/logger';
import { systemLogRepository } from '../../../../repositories/SystemLogRepository';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const SystemLogsModal: React.FC<Props> = ({ isOpen, onClose, theme = 'dark' }) => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'success'>('all');

  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const modalBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-slate-200' : 'bg-base border-subtle';
  const headerBg = isHighContrast ? 'bg-yellow-950/30' : isLight ? 'bg-slate-100' : 'bg-surface/50';
  const headerBorder = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-subtle';
  const headerText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const subtitleText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-muted';
  const btnSecondary = isHighContrast ? 'bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-400' : isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-600' : 'bg-elevated hover:bg-slate-700 text-secondary';
  const filterBg = isHighContrast ? 'bg-yellow-950/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-surface/30 border-subtle';
  const filterActive = isHighContrast ? 'bg-yellow-400 text-black' : isLight ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white';
  const filterInactive = isHighContrast ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50' : isLight ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' : 'bg-elevated text-muted hover:bg-slate-700';
  const logBg = isHighContrast ? 'bg-yellow-950' : isLight ? 'bg-slate-50' : 'bg-[#0a0a0a]';
  const emptyText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-muted' : 'text-slate-600';

  // Log entry colors
  const getLogBg = (level: string) => {
    if (level === 'error') return isHighContrast ? 'bg-red-500/20 border-red-500/50 text-red-300' : isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/30 border-rose-900/50 text-rose-200';
    if (level === 'warn') return isHighContrast ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-300' : isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-900/50 text-amber-200';
    if (level === 'success') return isHighContrast ? 'bg-green-500/20 border-green-500/50 text-green-300' : isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200';
    return isHighContrast ? 'bg-yellow-900/10 border-yellow-500/30 text-yellow-400' : isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-surface/50 border-subtle text-secondary';
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const allLogs = await systemLogRepository.getRecentLogs(500);
      setLogs(allLogs);
    } catch (e) {
      console.error("Error loading logs", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const handleClear = async () => {
    if (confirm('¿Estás seguro de borrar todos los logs del sistema? Esto no se puede deshacer.')) {
      await logger.clear();
      await loadLogs();
    }
  };

  const handleExport = () => {
    const safeStringify = (obj: any) => {
      const cache = new Set();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]';
          }
          cache.add(value);
        }
        return value;
      }, 2);
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(safeStringify(logs));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `logicount_system_logs_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (!isOpen) return null;

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm font-mono animate-in fade-in duration-200 ${isHighContrast ? 'bg-yellow-950/80' : 'bg-black/80'}`}>
      <div className={`w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 ${modalBg}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b shrink-0 ${headerBg} ${headerBorder}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isHighContrast ? 'bg-yellow-900/30 border-yellow-400/50' : isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/30 border-blue-500/30'}`}>
              <Terminal className={`w-6 h-6 ${isHighContrast ? 'text-yellow-400' : 'text-blue-400'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-black uppercase tracking-tighter ${headerText}`}>System Logs</h2>
              <p className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${subtitleText}`}>Auditoría del Kernel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className={`p-3 rounded-xl transition-colors ${btnSecondary}`}
              title="Exportar JSON"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={handleClear}
              className={`p-3 rounded-xl transition-colors ${isHighContrast ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : isLight ? 'bg-rose-100 hover:bg-rose-200 text-rose-600' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500'}`}
              title="Limpiar Logs"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className={`p-3 rounded-xl transition-colors ml-2 ${btnSecondary}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`flex gap-2 p-4 border-b overflow-x-auto no-scrollbar shrink-0 ${filterBg} ${headerBorder}`}>
          {(['all', 'error', 'warn', 'info', 'success'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${filter === f ? filterActive : filterInactive}`}
            >
              {f === 'all' ? 'Todos' : f}
            </button>
          ))}
        </div>

        {/* Log List */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${logBg}`}>
          {isLoading ? (
            <div className={`h-full flex items-center justify-center text-sm uppercase tracking-widest ${emptyText}`}>
              Cargando logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className={`h-full flex flex-col items-center justify-center space-y-4 ${emptyText}`}>
              <Terminal className="w-12 h-12 opacity-20" />
              <p className="text-xs uppercase tracking-widest font-bold">No hay registros</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`p-3 rounded-xl border flex gap-4 text-xs ${getLogBg(log.level)}`}
              >
                <div className="shrink-0 mt-0.5">
                  {log.level === 'error' ? <AlertCircle className={`w-4 h-4 ${isHighContrast ? 'text-red-400' : 'text-rose-500'}`} /> :
                   log.level === 'warn' ? <AlertCircle className={`w-4 h-4 ${isHighContrast ? 'text-yellow-400' : 'text-amber-500'}`} /> :
                   log.level === 'success' ? <ShieldCheck className={`w-4 h-4 ${isHighContrast ? 'text-green-400' : 'text-emerald-500'}`} /> :
                   <Info className={`w-4 h-4 ${isHighContrast ? 'text-blue-400' : 'text-blue-500'}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-black uppercase tracking-wider opacity-80">[{log.module}]</span>
                    <span className="text-[9px] opacity-50 whitespace-nowrap ml-4">
                      {new Date(log.timestamp).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <p className="font-medium leading-relaxed break-words">
                    {typeof log.message === 'object' ? (() => {
                      const cache = new Set();
                      return JSON.stringify(log.message, (key, value) => {
                        if (typeof value === 'object' && value !== null) {
                          if (cache.has(value)) return '[Circular]';
                          cache.add(value);
                        }
                        return value;
                      }, 2);
                    })() : String(log.message)}
                  </p>
                  {log.details && (
                    <pre className={`mt-2 p-2 rounded-lg text-[10px] overflow-x-auto border ${isHighContrast ? 'bg-yellow-950/50 border-yellow-500/20 text-yellow-400' : isLight ? 'bg-slate-200 border-slate-200 text-slate-600' : 'bg-black/40 border-white/5 text-muted'}`}>
                      {typeof log.details === 'object' ? (() => {
                        const cache = new Set();
                        return JSON.stringify(log.details, (key, value) => {
                          if (typeof value === 'object' && value !== null) {
                            if (cache.has(value)) return '[Circular]';
                            cache.add(value);
                          }
                          return value;
                        }, 2);
                      })() : String(log.details)}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
