import React, { memo } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface ScannedItemProps {
  barcode: string;
  name?: string;
  totalQuantity: number;
  expectedQty?: number;
}

interface ScannedItemRowProps {
  item: ScannedItemProps;
  isActive: boolean;
  onScan: (code: string, qtyOverride?: number) => void;
  onEditQty?: (item: ScannedItemProps) => void;
}

export const ScannedItemRow: React.FC<ScannedItemRowProps> = memo(({
  item,
  isActive,
  onScan,
  onEditQty
}) => {
  return (
    <div 
      className={`px-5 py-4 flex justify-between items-center border-b border-white/5 relative hover:bg-white/5 transition-colors ${isActive ? 'bg-blue-600/10' : 'bg-transparent'} animate-in fade-in slide-in-from-left-4 duration-300`}
      style={{ height: '86px' }}
    >
      {isActive && (
        <div className="absolute left-0 w-1.5 h-12 bg-blue-500 rounded-r-xl" />
      )}
      
      <div className="flex flex-col min-w-0 flex-1 pr-6 justify-center">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-base sm:text-lg font-mono font-bold text-white tracking-widest leading-none">
            {item.barcode}
          </span>
          {isActive && (
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-pulse" />
          )}
        </div>
        <span className="text-xs font-semibold text-muted uppercase leading-none line-clamp-1 tracking-wider">
          {item.name || 'SIN DESCRIPCIÓN'}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {item.expectedQty !== undefined && (
          <div className="flex flex-col items-end justify-center mr-2">
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 leading-none">Manifiesto</span>
            <span className={`text-sm font-black leading-none ${
              item.totalQuantity === item.expectedQty ? 'text-emerald-400' : 
              item.totalQuantity > item.expectedQty ? 'text-blue-400' : 'text-amber-400'
            }`}>
              {item.totalQuantity}/{item.expectedQty}
            </span>
          </div>
        )}
        
        <div className="flex items-center bg-surface border border-white/10 rounded-2xl p-1 gap-1.5">
          <button 
            onClick={() => onScan(item.barcode, -1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-all active:scale-90"
            title="Restar 1"
          >
            <Minus className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => onEditQty && onEditQty(item)}
            disabled={!onEditQty}
            className={`min-w-[2.75rem] px-2 h-10 flex items-center justify-center font-mono font-black text-white text-base rounded-xl transition-colors ${onEditQty ? 'hover:bg-white/10 active:bg-blue-600' : 'cursor-default'}`}
          >
            {item.totalQuantity}
          </button>
          
          <button 
            onClick={() => onScan(item.barcode, 1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition-all active:scale-90"
            title="Sumar 1"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
});

