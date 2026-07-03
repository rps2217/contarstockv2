import React, { useState, useEffect } from 'react';
import { X, Activity, Server, Database, Clock, ChevronRight, ChevronDown, AlertCircle, CheckCircle2, Copy, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SyncLog } from '../../../db';
import { toast } from 'sonner';
import { syncLogRepository } from '../../../repositories/SyncLogRepository';
import { getSyncLogStatusBadge } from '@/lib/ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const SyncLogsModal: React.FC<Props> = ({ isOpen, onClose, theme = 'dark' }) => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const modalBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-slate-200' : 'bg-surface border-white/10';
  const overlayBg = isHighContrast ? 'bg-yellow-950/80' : 'bg-black/90';
  const headerBg = isHighContrast ? 'bg-yellow-950/30' : isLight ? 'bg-slate-50' : 'bg-white/5';
  const headerBorder = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5';
  const headerText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const subtitleText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-muted';
  const closeBtn = isHighContrast ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30' : isLight ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10';
  const toolbarBg = isHighContrast ? 'bg-yellow-950/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5';
  const filterActive = isHighContrast ? 'bg-yellow-400 text-black' : isLight ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white';
  const filterInactive = isHighContrast ? 'bg-yellow-900/30 text-yellow-400' : isLight ? 'bg-slate-100 text-muted' : 'bg-white/5 text-muted';
  const searchBg = isHighContrast ? 'bg-yellow-950 border-yellow-400/30' : isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/40 border-white/10';
  const searchText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const logCardBg = isHighContrast ? 'bg-yellow-950 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5';
  const logCardExpanded = isHighContrast ? 'border-yellow-400/50 shadow-lg' : isLight ? 'border-indigo-500 shadow-lg' : 'border-indigo-500/50 shadow-lg';
  const emptyStateBg = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5';
  const emptyText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-muted' : 'text-slate-600';
  const footerBg = isHighContrast ? 'bg-yellow-950/20' : isLight ? 'bg-slate-50' : 'bg-black/40';

  const loadLogs = async () => {
    setIsLoading(true);
    let results = await syncLogRepository.getRecentLogs(50, filter);
    
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(l => 
        l.tableName.toLowerCase().includes(s) || 
        l.action.toLowerCase().includes(s) ||
        (l.errorMessage?.toLowerCase().includes(s) ?? false)
      );
    }

    setLogs(results);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, filter, search]);

  const clearLogs = async () => {
    if (confirm('¿Estás seguro de borrar todos los logs de diagnóstico?')) {
      await syncLogRepository.clearAllLogs();
      setLogs([]);
      toast.success('Logs borrados');
    }
  };

  const copyToClipboard = (text: any) => {
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
    const stringified = typeof text === 'string' ? text : safeStringify(text);
    navigator.clipboard.writeText(stringified);
    toast.success('Copiado al portapapeles');
  };

  const getDetailBg = (status: string) => {
    if (status === 'success') {
      return isHighContrast ? 'bg-yellow-950/30 text-green-300 border-green-500/20' : isLight ? 'bg-slate-100 text-emerald-700 border-emerald-200' : 'bg-black/80 text-emerald-300 border-emerald-500/20';
    }
    return isHighContrast ? 'bg-yellow-950/30 text-red-300 border-red-500/20' : isLight ? 'bg-slate-100 text-rose-700 border-rose-200' : 'bg-black/80 text-rose-300 border-rose-500/20';
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[300] backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200 ${overlayBg}`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl ${modalBg}`}
      >
        {/* HEADER */}
        <div className={`p-6 border-b flex items-center justify-between backdrop-blur-xl ${headerBg} ${headerBorder}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-lg ${isHighContrast ? 'bg-yellow-400 text-black' : isLight ? 'bg-indigo-600 shadow-indigo-900/40 text-white' : 'bg-indigo-600 shadow-lg shadow-indigo-900/40 text-white'}`}>
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-xl font-black uppercase italic tracking-tighter leading-none ${headerText}`}>Centro de Diagnóstico</h3>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${subtitleText}`}>Logs de Red y Sincronización en Tiempo Real</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${closeBtn}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className={`p-4 flex flex-col md:flex-row gap-4 items-center justify-between ${toolbarBg} ${headerBorder}`}>
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? filterActive : filterInactive}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('success')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'success' ? (isHighContrast ? 'bg-green-400 text-black' : 'bg-emerald-600 text-white') : filterInactive}`}
            >
              Éxitos
            </button>
            <button 
              onClick={() => setFilter('error')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'error' ? 'bg-rose-600 text-white' : filterInactive}`}
            >
              Errores
            </button>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${subtitleText}`} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por tabla, acción o error..."
              className={`w-full border rounded-xl pl-11 pr-4 py-2 text-xs focus:border-indigo-500 outline-none ${searchBg} ${searchText} ${isHighContrast ? 'placeholder:text-yellow-600' : isLight ? 'placeholder:text-muted' : 'placeholder:text-slate-500'}`}
            />
          </div>

          <button 
            onClick={clearLogs}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl hover:transition-all text-[10px] font-black uppercase tracking-widest ${isHighContrast ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white' : isLight ? 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white'}`}
          >
            <Trash2 className="w-4 h-4" />
            Limpiar Logs
          </button>
        </div>

        {/* LOGS LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className={`flex flex-col items-center gap-4 ${emptyText}`}>
                <Activity className="w-12 h-12 animate-pulse" />
                <p className="text-[10px] uppercase font-black tracking-widest">Analizando Tráfico...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className={`h-full flex items-center justify-center border-4 border-dashed rounded-[2rem] ${emptyStateBg}`}>
              <div className="text-center space-y-4">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${isHighContrast ? 'bg-yellow-900/20' : isLight ? 'bg-slate-100' : 'bg-white/5'}`}>
                  <Database className={`w-10 h-10 ${emptyText}`} />
                </div>
                <h4 className={`text-lg font-black uppercase italic ${emptyText}`}>Sin actividad registrada</h4>
                <p className={`text-[10px] uppercase font-bold tracking-widest max-w-xs mx-auto ${emptyText}`}>
                  Los intentos de sincronización aparecerán aquí para diagnóstico técnica.
                </p>
              </div>
            </div>
          ) : (
            logs.map((log) => {
              const status = getSyncLogStatusBadge(log.status, { isHighContrast, isLight });
              return (
                <div 
                  key={log.id} 
                  className={`rounded-3xl border transition-all overflow-hidden ${logCardBg} ${expandedLogId === log.id ? logCardExpanded : ''}`}
                >
                  <div 
                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id || null)}
                    className="p-4 flex items-center gap-4 cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${status.bg}`}>
                      {status.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${headerText}`}>{log.action}</span>
                        <span className={`text-[8px] font-bold uppercase ${subtitleText}`}>•</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>{log.tableName}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-[9px] ${subtitleText}`}>
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString()}
                        {log.errorMessage && (
                          <>
                            <span className={`mx-1 ${isHighContrast ? 'text-yellow-700' : isLight ? 'text-secondary' : 'text-slate-700'}`}>|</span>
                            <span className={`font-bold uppercase truncate ${isHighContrast ? 'text-red-400' : 'text-rose-400'}`}>{log.errorMessage}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {expandedLogId === log.id 
                      ? <ChevronDown className={`w-5 h-5 ${subtitleText}`} /> 
                      : <ChevronRight className={`w-5 h-5 ${subtitleText}`} />}
                  </div>

                  <AnimatePresence>
                    {expandedLogId === log.id && (
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className={`border-t p-6 overflow-hidden ${headerBorder}`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* PAYLOAD */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                              <div className={`flex items-center gap-2 ${isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                                <Server className="w-4 h-4" />
                                <span className={`text-[9px] font-black uppercase tracking-widest`}>Datos Enviados (Body)</span>
                              </div>
                              <button onClick={() => copyToClipboard(log.payload)} className={`p-2 rounded-lg transition-colors ${isHighContrast ? 'bg-yellow-900/20 text-yellow-400 hover:text-yellow-300' : isLight ? 'bg-slate-100 text-muted hover:text-slate-600' : 'bg-white/5 text-muted hover:text-white'}`}>
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <pre className={`rounded-2xl p-4 text-[10px] font-mono overflow-x-auto max-h-60 custom-scrollbar border ${isHighContrast ? 'bg-yellow-950 border-yellow-400/30 text-yellow-300' : isLight ? 'bg-slate-200 border-slate-200 text-indigo-700' : 'bg-black/80 border-white/5 text-blue-300'}`}>
                              {(() => {
                                const cache = new Set();
                                return JSON.stringify(log.payload, (key, value) => {
                                  if (typeof value === 'object' && value !== null) {
                                    if (cache.has(value)) return '[Circular]';
                                    cache.add(value);
                                  }
                                  return value;
                                }, 2);
                              })()}
                            </pre>
                          </div>

                          {/* RESPONSE */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                              <div className={`flex items-center gap-2 ${isHighContrast ? 'text-green-400' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                                <Database className="w-4 h-4" />
                                <span className={`text-[9px] font-black uppercase tracking-widest`}>Respuesta del Servidor</span>
                              </div>
                              <button onClick={() => copyToClipboard(log.response)} className={`p-2 rounded-lg transition-colors ${isHighContrast ? 'bg-yellow-900/20 text-yellow-400 hover:text-yellow-300' : isLight ? 'bg-slate-100 text-muted hover:text-slate-600' : 'bg-white/5 text-muted hover:text-white'}`}>
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <pre className={`rounded-2xl p-4 text-[10px] font-mono overflow-x-auto max-h-60 custom-scrollbar border ${getDetailBg(log.status)}`}>
                              {typeof log.response === 'string' ? log.response : (() => {
                                const cache = new Set();
                                return JSON.stringify(log.response, (key, value) => {
                                  if (typeof value === 'object' && value !== null) {
                                    if (cache.has(value)) return '[Circular]';
                                    cache.add(value);
                                  }
                                  return value;
                                }, 2);
                              })()}
                            </pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className={`p-4 border-t text-center ${footerBg} ${headerBorder}`}>
          <p className={`text-[9px] font-bold uppercase tracking-widest ${emptyText}`}>
            Sugerencia: Si ves errores de "Missing or insufficient permissions", verifica las reglas de seguridad en la consola de Firebase.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
