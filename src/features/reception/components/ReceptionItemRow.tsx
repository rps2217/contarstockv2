import React from 'react';
import { Box, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export interface ReceptionItemRowProps {
  item: any;
  onDelete: (id: string) => void;
  onShowPhoto: (item: any) => void;
}

export const ReceptionItemRow = React.memo(({ item, onDelete, onShowPhoto }: ReceptionItemRowProps) => {
  const isSynced = !!item.lastSyncTimestamp;
  const hasPhoto = !!(item.labelPhoto || item.photoUrl);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
      isSynced ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-blue-500/5 border-blue-500/20'
    }`}>
      <button 
        onClick={() => hasPhoto && onShowPhoto(item)}
        disabled={!hasPhoto}
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden active:scale-90 transition-transform ${
        isSynced ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/20 text-blue-500 border-blue-500/20'
      }`}>
        {item.labelPhoto || item.photoUrl ? (
          <img 
            src={item.labelPhoto || item.photoUrl} 
            alt="Etiqueta" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Box className="w-6 h-6" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-black uppercase truncate ${isSynced ? 'text-emerald-400' : 'text-white'}`}>
            {item.logisticsLabel}
          </h3>
          {isSynced && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-slate-500 text-[10px] font-bold uppercase">
            {format(item.createdAt, 'HH:mm:ss')}
          </span>
          {item.erpOrder && item.erpOrder !== 'RECEPCION_BORRADOR' && (
            <>
              <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
              <span className="text-blue-500 text-[10px] font-black uppercase">ERP: {item.erpOrder}</span>
            </>
          )}
        </div>
      </div>
      {!isSynced && (
        <button
          onClick={() => onDelete(item.id)}
          className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 active:bg-rose-500/20 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});

ReceptionItemRow.displayName = 'ReceptionItemRow';
