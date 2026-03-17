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
      className={`px-4 py-4 flex justify-between items-center ${index % 2 === 0 ? 'bg-slate-900/40' : 'bg-transparent'} ${isActive ? 'bg-blue-900/20' : ''}`}
    >
      <div className="flex flex-col min-w-0 flex-1 pr-4">
        <span className="text-xl font-mono text-white leading-none mb-1.5">{item.barcode}</span>
        <span className="text-[11px] font-bold text-slate-400 uppercase leading-tight line-clamp-2">{item.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {item.expectedQty !== undefined && (
          <div className="flex flex-col items-end justify-center mr-1">
            <span className="text-[8px] text-slate-500 font-bold tracking-widest leading-none mb-0.5">TEÓRICO</span>
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
          className="w-8 h-8 rounded-full border-2 border-rose-500 flex items-center justify-center text-rose-500 active:bg-rose-500 active:text-white transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onEditQty && onEditQty(item)}
          disabled={!onEditQty}
          className={`text-xl font-mono text-white min-w-[2.5rem] text-center pb-0.5 rounded transition-colors ${onEditQty ? 'border-b border-slate-600 active:bg-white/10' : ''}`}
        >
          {item.totalQuantity}
        </button>
        <button 
          onClick={() => onScan(item.barcode, 1)}
          className="w-8 h-8 rounded-full border-2 border-rose-500 flex items-center justify-center text-rose-500 active:bg-rose-500 active:text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
