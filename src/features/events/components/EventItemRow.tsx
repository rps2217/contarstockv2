import React from 'react';
import { Package, Trash2 } from 'lucide-react';

interface EventItemRowProps {
  item: any;
  onDelete: (id: string) => void;
}

export const EventItemRow: React.FC<EventItemRowProps> = React.memo(({ 
  item, 
  onDelete 
}) => {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a0a0a] border border-white/5">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
          <Package className="w-6 h-6 text-blue-500" />
        </div>
        <div className={`mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
          item.isAdjusted ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        }`}>
          {item.isAdjusted ? 'AJUSTADO' : 'PENDIENTE'}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-white uppercase truncate">
          {item.productName}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
            {item.barcode}
          </span>
          <span className="text-blue-400 text-[10px] font-black uppercase">
            {item.event}
          </span>
          <span className="text-slate-500 text-[10px] font-bold uppercase truncate">
            {item.quantity} UNID
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <button
          onClick={() => onDelete(item.id)}
          className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 active:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

EventItemRow.displayName = 'EventItemRow';
