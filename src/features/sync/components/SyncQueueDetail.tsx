/**
 * SyncQueueDetail - Panel de detalle para ítem seleccionado en la cola
 */

import React from 'react';
import { FileText, Send, Check, Trash2 } from 'lucide-react';

interface QueueDetailItem {
  id: string;
  key: string;
  remoteTable?: string;
  displayName?: string;
  status: string;
  rawData?: Record<string, unknown>;
}

interface SyncQueueDetailProps {
  item: QueueDetailItem | null;
  onForceSync?: (tableKey: string) => void;
  onForceComplete?: () => void;
  onDiscard?: () => void;
  onClose?: () => void;
}

export const SyncQueueDetail: React.FC<SyncQueueDetailProps> = ({
  item,
  onForceSync,
  onForceComplete,
  onClose,
}) => {
  if (!item) {
    return (
      <div className="bg-base/40 border border-slate-900 rounded-3xl p-5 text-center">
        <p className="text-slate-500 text-xs font-bold">
          Selecciona un ítem para ver su detalle
        </p>
      </div>
    );
  }

  return (
    <div className="bg-base/40 border border-slate-900 rounded-3xl p-5 space-y-4 h-fit">
      <div className="flex items-center justify-between pb-3 border-b border-slate-900">
        <h3 className="text-xs font-black text-white uppercase flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-400" /> Insccionar Operación
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[10px] text-slate-500 hover:text-secondary uppercase font-black"
          >
            Cerrar
          </button>
        )}
      </div>

      <div className="space-y-1">
        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">
          Tabla Destino (Cloud)
        </span>
        <span className="text-xs font-mono text-blue-400 bg-blue-400/5 px-2.5 py-1 rounded border border-blue-500/10 inline-block">
          {item.remoteTable || item.key}
        </span>
      </div>

      <div className="space-y-1">
        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">
          ID Transaccional
        </span>
        <span className="text-xs font-mono text-secondary font-bold block bg-surface px-2.5 py-1.5 rounded truncate">
          {item.id}
        </span>
      </div>

      <div className="space-y-2">
        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">
          Datos Contenidos
        </span>
        <div className="bg-base p-3 rounded-2xl text-[10px] font-mono text-muted overflow-x-auto max-h-48 custom-scrollbar space-y-1.5 border border-slate-900/50">
          {item.rawData && Object.entries(item.rawData).map(([key, value]) => {
            if (['syncStatus', 'lastSyncTimestamp', 'tableName'].includes(key)) return null;
            return (
              <div key={key} className="flex justify-between gap-4 border-b border-white/5 py-1 last:border-0">
                <span className="text-slate-500 font-bold">{key}:</span>
                <span className="text-secondary break-all text-right">
                  {JSON.stringify(value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-slate-900">
        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">
          Resolución de Conflictos
        </span>

        {onForceSync && (
          <button
            onClick={() => onForceSync(item.key)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            Forzar Envío de Tabla
          </button>
        )}

        {onForceComplete && (
          <button
            onClick={onForceComplete}
            className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            Marcar como Sincronizado
          </button>
        )}

        {onForceComplete && (
          <button
            onClick={onForceComplete}
            className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Descartar Cambio
          </button>
        )}
      </div>
    </div>
  );
};

export default SyncQueueDetail;
