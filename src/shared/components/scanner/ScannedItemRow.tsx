import React from 'react';
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
  index: number;
  onScan: (code: string, qtyOverride?: number) => void;
  onEditQty?: (item: ScannedItemProps) => void;
}

export const ScannedItemRow: React.FC<ScannedItemRowProps> = ({
  item,
  isActive,
  index,
  onScan,
  onEditQty
}) => {
  return (
    <div 
      className={`px-4 py-3 flex justify-between items-center border-b border-white/5 ${index % 2 === 0 ? 'bg-slate-900/40' : 'bg-transparent'} ${isActive ? 'bg-blue-900/40 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
    >
      <div className="flex flex-col min-w-0 flex-1 pr-4">
        <span className="text-lg font-mono font-black text-white leading-none mb-1 tracking-wider">{item.barcode}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase leading-tight line-clamp-1">{item.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {item.expectedQty !== undefined && (
          <div className="flex flex-col items-end justify-center mr-1">
            <span className="text-[8px] text-slate-500 font-black tracking-[0.2em] leading-none mb-1">TEO</span>
            <span className={`text-sm font-mono font-black leading-none ${
              item.totalQuantity === item.expectedQty ? 'text-emerald-400' : 
              item.totalQuantity > item.expectedQty ? 'text-blue-400' : 'text-amber-400'
            }`}>
              {item.expectedQty}
            </span>
          </div>
        )}
        <button 
          onClick={() => onScan(item.barcode, -1)}
          className="w-10 h-10 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-center text-rose-500 active:bg-rose-500 active:text-white active:scale-90 transition-all"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button 
          onClick={() => onEditQty && onEditQty(item)}
          disabled={!onEditQty}
          className={`text-xl font-mono font-black text-white min-w-[2.5rem] text-center pb-0.5 rounded-lg transition-colors ${onEditQty ? 'border-b-2 border-slate-600 active:bg-white/10' : ''}`}
        >
          {item.totalQuantity}
        </button>
        <button 
          onClick={() => onScan(item.barcode, 1)}
          className="w-10 h-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-500 active:bg-emerald-500 active:text-white active:scale-90 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Forced GitHub sync
