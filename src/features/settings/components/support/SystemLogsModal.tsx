import React, { useState, useEffect } from 'react';
import { X, Terminal, Trash2, Download, AlertCircle, ShieldCheck, Info } from 'lucide-react';
import { db, SystemLog } from '../../../../db';
import { logger } from '../../../../services/logger';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemLogsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'success'>('all');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      let query = db.logs.orderBy('timestamp').reverse();
      const allLogs = await query.limit(500).toArray();
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 w-full max-w-4xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-900/30 rounded-2xl flex items-center justify-center border border-blue-500/30">
              <Terminal className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">System Logs</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Auditoría del Kernel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              title="Exportar JSON"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={handleClear}
              className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-colors"
              title="Limpiar Logs"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-4 border-b border-slate-800 bg-slate-900/30 overflow-x-auto no-scrollbar shrink-0">
          {(['all', 'error', 'warn', 'info', 'success'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                filter === f 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f === 'all' ? 'Todos' : f}
            </button>
          ))}
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0a0a0a]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm uppercase tracking-widest">
              Cargando logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <Terminal className="w-12 h-12 opacity-20" />
              <p className="text-xs uppercase tracking-widest font-bold">No hay registros</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`p-3 rounded-xl border flex gap-4 text-xs ${
                  log.level === 'error' ? 'bg-rose-950/30 border-rose-900/50 text-rose-200' :
                  log.level === 'warn' ? 'bg-amber-950/30 border-amber-900/50 text-amber-200' :
                  log.level === 'success' ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200' :
                  'bg-slate-900/50 border-slate-800 text-slate-300'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {log.level === 'error' ? <AlertCircle className="w-4 h-4 text-rose-500" /> :
                   log.level === 'warn' ? <AlertCircle className="w-4 h-4 text-amber-500" /> :
                   log.level === 'success' ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> :
                   <Info className="w-4 h-4 text-blue-500" />}
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
                    <pre className="mt-2 p-2 bg-black/40 rounded-lg text-[10px] overflow-x-auto border border-white/5 text-slate-400">
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

// Forced GitHub sync
