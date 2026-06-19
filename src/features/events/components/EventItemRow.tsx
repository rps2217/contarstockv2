import React from 'react';
import { Package, Trash2 } from 'lucide-react';

interface EventItemRowProps {
  item: any;
  onDelete: (id: string) => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const EventItemRow: React.FC<EventItemRowProps> = React.memo(({ 
  item, 
  onDelete,
  theme = 'dark'
}) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-yellow-950 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0a] border-white/5';
  const iconBg = isHighContrast ? 'bg-yellow-900/30 border-yellow-400/30 text-yellow-400' : isLight ? 'bg-blue-50 border-blue-200 text-blue-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500';
  const badgeAdjusted = isHighContrast ? 'bg-green-500/20 text-green-400 border-green-500/30' : isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  const badgePending = isHighContrast ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : isLight ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  const titleText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const barcodeBg = isHighContrast ? 'bg-yellow-900/20 text-yellow-400' : isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300';
  const eventText = isHighContrast ? 'text-yellow-300' : isLight ? 'text-blue-600' : 'text-blue-400';
  const quantityText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500';
  const deleteBtn = isHighContrast ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30' : isLight ? 'bg-rose-100 border-rose-200 text-rose-500 hover:bg-rose-200' : 'bg-red-500/10 border-red-500/20 text-red-500 active:bg-red-500/20';

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl ${cardBg}`}>
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${iconBg}`}>
          <Package className="w-6 h-6" />
        </div>
        <div className={`mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
          item.isAdjusted ? badgeAdjusted : badgePending
        }`}>
          {item.isAdjusted ? 'AJUSTADO' : 'PENDIENTE'}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-black uppercase truncate ${titleText}`}>
          {item.productName}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${barcodeBg}`}>
            {item.barcode}
          </span>
          <span className={`text-[10px] font-black uppercase ${eventText}`}>
            {item.event}
          </span>
          <span className={`text-[10px] font-bold uppercase truncate ${quantityText}`}>
            {item.quantity} UNID
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <button
          onClick={() => onDelete(item.id)}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${deleteBtn}`}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

EventItemRow.displayName = 'EventItemRow';
