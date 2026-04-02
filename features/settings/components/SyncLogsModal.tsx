import React, { useState, useEffect } from 'react';
import { X, Activity, Server, Database, Clock, ChevronRight, ChevronDown, AlertCircle, CheckCircle2, Copy, Trash2, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, SyncLog } from '../../../db';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SyncLogsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    setIsLoading(true);
    let query = db.sync_logs.orderBy('timestamp').reverse();
    
    let results = await query.limit(50).toArray();
    
    if (filter !== 'all') {
      results = results.filter(l => l.status === filter);
    }
    
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(l => 
        l.tableName.toLowerCase().includes(s) || 
        l.action.toLowerCase().includes(s) ||
        l.errorMessage?.toLowerCase().includes(s)
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
      await db.sync_logs.clear();
      setLogs([]);
      toast.success('Logs borrados');
    }
  };

  const copyToClipboard = (text: any) => {
    const stringified = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    navigator.clipboard.writeText(stringified);
    toast.success('Copiado al portapapeles');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-900/40">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-white leading-none">Centro de Diagnóstico</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Logs de Red y Sincronización en Tiempo Real</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="p-4 bg-black/20 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('success')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'success' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400'}`}
            >
              Éxitos
            </button>
            <button 
              onClick={() => setFilter('error')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'error' ? 'bg-rose-600 text-white' : 'bg-white/5 text-slate-400'}`}
            >
              Errores
            </button>
          </div>

          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por tabla, acción o error..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-2 text-xs text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <button 
            onClick={clearLogs}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar Logs
          </button>
        </div>

        {/* LOGS LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-slate-500">
                <Activity className="w-12 h-12 animate-pulse" />
                <p className="text-[10px] uppercase font-black tracking-widest">Analizando Tráfico...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-full flex items-center justify-center border-4 border-dashed border-white/5 rounded-[2rem]">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Database className="w-10 h-10 text-slate-700" />
                </div>
                <h4 className="text-lg font-black text-slate-600 uppercase italic">Sin actividad registrada</h4>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest max-w-xs mx-auto">
                  Los intentos de sincronización aparecerán aquí para diagnóstico técnica.
                </p>
              </div>
            </div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id} 
                className={`bg-black/40 rounded-3xl border transition-all overflow-hidden ${expandedLogId === log.id ? 'border-indigo-500/50 shadow-lg' : 'border-white/5 hover:border-white/10'}`}
              >
                <div 
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id || null)}
                  className="p-4 flex items-center gap-4 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${log.status === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    {log.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-tighter text-white">{log.action}</span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">•</span>
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{log.tableName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString()}
                      {log.errorMessage && (
                        <>
                          <span className="mx-1 text-slate-700">|</span>
                          <span className="text-rose-400 font-bold uppercase truncate">{log.errorMessage}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {expandedLogId === log.id ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                </div>

                <AnimatePresence>
                  {expandedLogId === log.id && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="border-t border-white/5 bg-black/40 p-6 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* PAYLOAD */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                              <Server className="w-4 h-4 text-indigo-400" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Datos Enviados (Body)</span>
                            </div>
                            <button onClick={() => copyToClipboard(log.payload)} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <pre className="bg-black/80 rounded-2xl p-4 text-[10px] font-mono text-blue-300 overflow-x-auto max-h-60 custom-scrollbar border border-white/5">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>

                        {/* RESPONSE */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-emerald-400" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Respuesta del Servidor</span>
                            </div>
                            <button onClick={() => copyToClipboard(log.response)} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <pre className={`bg-black/80 rounded-2xl p-4 text-[10px] font-mono overflow-x-auto max-h-60 custom-scrollbar border ${log.status === 'success' ? 'text-emerald-300 border-emerald-500/20' : 'text-rose-300 border-rose-500/20'}`}>
                            {typeof log.response === 'string' ? log.response : JSON.stringify(log.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-black/40 border-t border-white/5 text-center">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
            Sugerencia: Si ves errores de "Missing or insufficient permissions", verifica las reglas de seguridad en la consola de Firebase.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
