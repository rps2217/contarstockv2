/**
 * SyncQueuePanel - Cola de sincronización unificada
 * 
 * Combina SyncQueueList + SyncQueueDetail en un solo componente
 * con detalle inline (expandir/colapsar).
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight, ChevronDown, Send, Check, Trash2, X, FileText, CheckCircle2 } from 'lucide-react';
import type { SyncQueueItem } from '@/types/global/sync';

interface SyncQueuePanelProps {
  items: SyncQueueItem[] | undefined;
  selectedItem: SyncQueueItem | null;
  onSelectItem: (item: SyncQueueItem | null) => void;
  onForceSync?: (tableKey: string) => void;
  onForceComplete?: () => void;
  onDiscard?: () => void;
}

export const SyncQueuePanel: React.FC<SyncQueuePanelProps> = ({
  items,
  selectedItem,
  onSelectItem,
  onForceSync,
  onForceComplete,
  onDiscard,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Empty state
  if (!items || items.length === 0) {
    return (
      <div className="bg-slate-950/40 border border-slate-900 rounded-3xl p-12 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-md font-black text-white uppercase">¡Bandeja de Salida Limpia!</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          Todos tus cambios locales han sido totalmente persistidos y garantizados en el servidor de la nube.
        </p>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    if (status === 'error') return 'error';
    if (status === 'pending_delete') return 'delete';
    return 'pending';
  };

  const renderItem = (item: SyncQueueItem) => {
    const statusType = getStatusStyle(item.status);
    const isExpanded = expandedId === item.id || selectedItem?.id === item.id;
    const dateStr = format(new Date(item.timestamp), 'HH:mm:ss (dd/MM)', { locale: es });

    return (
      <div key={`${item.key}-${item.id}`} className="space-y-2">
        {/* Item Row */}
        <motion.div
          onClick={() => {
            setExpandedId(isExpanded ? null : item.id);
            onSelectItem(isExpanded ? null : item);
          }}
          whileHover={{ x: 2 }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
            isExpanded
              ? 'bg-blue-600/10 border-blue-500'
              : statusType === 'error'
                ? 'bg-rose-950/10 border-rose-900/50 hover:bg-rose-950/20'
                : statusType === 'delete'
                  ? 'bg-amber-950/10 border-amber-900/50 hover:bg-amber-950/20'
                  : 'bg-slate-900/30 border-slate-800 hover:bg-slate-900/50'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className={`w-2.5 h-2.5 rounded-full ${
              statusType === 'error' ? 'bg-rose-500 animate-pulse' : 
              statusType === 'delete' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wide block">
                {item.key.toUpperCase()} • <span className="text-[10px] font-mono lowercase">
                  {item.displayName.substring(0, 30)}
                </span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                {dateStr}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
              statusType === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              statusType === 'delete' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {item.status}
            </span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-blue-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            )}
          </div>
        </motion.div>

        {/* Expanded Detail */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                  <h4 className="text-[10px] font-black text-white uppercase flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" /> Detalle de Operación
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(null);
                      onSelectItem(null);
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 uppercase font-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <span className="text-slate-500 font-bold uppercase block mb-1">Tabla Cloud</span>
                    <span className="font-mono text-blue-400 bg-blue-400/5 px-2 py-1 rounded border border-blue-500/10">
                      {item.remoteTable}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase block mb-1">Primary Key</span>
                    <span className="font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded">
                      {item.primaryKey}
                    </span>
                  </div>
                </div>

                {/* Raw Data Preview */}
                <div>
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">
                    Datos ({Object.keys(item.rawData || {}).length} campos)
                  </span>
                  <div className="bg-slate-950 p-2 rounded-xl text-[9px] font-mono text-slate-400 max-h-24 overflow-y-auto custom-scrollbar">
                    {item.rawData && Object.entries(item.rawData).slice(0, 8).map(([key, value]) => {
                      if (['syncStatus', 'lastSyncTimestamp', 'tableName'].includes(key)) return null;
                      return (
                        <div key={key} className="flex justify-between gap-4 border-b border-white/5 py-1 last:border-0">
                          <span className="text-slate-500 font-bold">{key}:</span>
                          <span className="text-slate-300 break-all">
                            {typeof value === 'string' ? value.substring(0, 40) : JSON.stringify(value).substring(0, 40)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {onForceSync && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onForceSync(item.key);
                      }}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-[10px] uppercase tracking-wider text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Send className="w-3 h-3" /> Enviar
                    </button>
                  )}
                  {onForceComplete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onForceComplete();
                      }}
                      className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Check className="w-3 h-3" /> Marcar OK
                    </button>
                  )}
                  {onDiscard && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDiscard();
                      }}
                      className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" /> Descartar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
      {items.map(renderItem)}
    </div>
  );
};

export default SyncQueuePanel;
