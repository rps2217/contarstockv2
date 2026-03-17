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
      className={`px-4 py-6 flex justify-between items-center border-b border-white/5 ${index % 2 === 0 ? 'bg-slate-900/40' : 'bg-transparent'} ${isActive ? 'bg-blue-900/40 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
    >
      <div className="flex flex-col min-w-0 flex-1 pr-4">
        <span className="text-2xl font-mono font-black text-white leading-none mb-2 tracking-wider">{item.barcode}</span>
        <span className="text-xs font-bold text-slate-400 uppercase leading-tight line-clamp-2">{item.name}</span>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {item.expectedQty !== undefined && (
          <div className="flex flex-col items-end justify-center mr-2">
            <span className="text-[9px] text-slate-500 font-black tracking-[0.2em] leading-none mb-1">TEÓRICO</span>
            <span className={`text-lg font-mono font-black leading-none ${
              item.totalQuantity === item.expectedQty ? 'text-emerald-400' : 
              item.totalQuantity > item.expectedQty ? 'text-blue-400' : 'text-amber-400'
            }`}>
              {item.expectedQty}
            </span>
          </div>
        )}
        <button 
          onClick={() => onScan(item.barcode, -1)}
          className="w-14 h-14 rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 flex items-center justify-center text-rose-500 active:bg-rose-500 active:text-white active:scale-90 transition-all shadow-lg"
        >
          <Minus className="w-8 h-8" />
        </button>
        <button 
          onClick={() => onEditQty && onEditQty(item)}
          disabled={!onEditQty}
          className={`text-3xl font-mono font-black text-white min-w-[3.5rem] text-center pb-1 rounded-xl transition-colors ${onEditQty ? 'border-b-4 border-slate-600 active:bg-white/10' : ''}`}
        >
          {item.totalQuantity}
        </button>
        <button 
          onClick={() => onScan(item.barcode, 1)}
          className="w-14 h-14 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center text-emerald-500 active:bg-emerald-500 active:text-white active:scale-90 transition-all shadow-lg"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};
