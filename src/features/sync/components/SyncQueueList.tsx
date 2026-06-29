/**
 * SyncQueueList - Lista de elementos en cola de sincronización
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { SyncQueueItem } from '@/features/sync/types';
import { formatTimeWithDate } from '@/lib/date';

interface Props {
  items: SyncQueueItem[] | undefined;
  selectedItem: SyncQueueItem | null;
  onSelect: (item: SyncQueueItem) => void;
}

export const SyncQueueList: React.FC<Props> = ({ items, selectedItem, onSelect }) => {
  if (!items || items.length === 0) {
    return (
      <div className="bg-base/40 border border-slate-900 rounded-3xl p-12 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-pulse" />
        <h3 className="text-md font-black text-white uppercase">¡Bandeja de Salida Limpia!</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          Todos tus cambios locales han sido totalmente persistidos y garantizados en el servidor de la nube.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
      {items.map((item) => {
        const dateStr = formatTimeWithDate(item.timestamp);
        const isError = item.status === 'error';
        const isDelete = item.status === 'pending_delete';
        
        return (
          <motion.div
            key={`${item.key}-${item.id}`}
            onClick={() => onSelect(item)}
            whileHover={{ x: 2 }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              selectedItem?.id === item.id 
                ? 'bg-blue-600/10 border-blue-500' 
                : isError 
                  ? 'bg-rose-950/10 border-rose-900/50 hover:bg-rose-950/20' 
                  : isDelete 
                    ? 'bg-amber-950/10 border-amber-900/50 hover:bg-amber-950/20'
                    : 'bg-surface/30 border-subtle hover:bg-surface/50'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isError ? 'bg-rose-500 animate-pulse' : isDelete ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              <div className="min-w-0">
                <span className="text-xs font-black text-muted uppercase tracking-wide block">
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
  );
};
