import React from 'react';
import { motion } from 'motion/react';
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
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      className={`px-4 py-3 flex justify-between items-center border-b border-white/5 relative ${isActive ? 'bg-blue-600/5' : 'bg-transparent'}`}
    >
      {isActive && (
        <motion.div 
          layoutId="activeIndicator"
          className="absolute left-0 w-1 h-8 bg-blue-500 rounded-r-full"
        />
      )}
      
      <div className="flex flex-col min-w-0 flex-1 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono font-black text-white tracking-widest">{item.barcode}</span>
          {isActive && (
            <motion.span 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" 
            />
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight line-clamp-1 tracking-wide">{item.name || 'SIN DESCRIPCIÓN'}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.expectedQty !== undefined && (
          <div className="flex flex-col items-end justify-center mr-3">
            <span className="text-[7px] text-slate-600 font-black uppercase tracking-widest mb-1">Manifiesto</span>
            <span className={`text-xs font-black leading-none ${
              item.totalQuantity === item.expectedQty ? 'text-emerald-500' : 
              item.totalQuantity > item.expectedQty ? 'text-blue-500' : 'text-amber-500'
            }`}>
              {item.totalQuantity}/{item.expectedQty}
            </span>
          </div>
        )}
        
        <div className="flex items-center bg-slate-900 border border-white/5 rounded-xl p-1 gap-1">
          <button 
            onClick={() => onScan(item.barcode, -1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all active:scale-90"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => onEditQty && onEditQty(item)}
            disabled={!onEditQty}
            className={`min-w-[2.5rem] px-2 h-8 flex items-center justify-center font-mono font-black text-white text-sm rounded-lg transition-colors ${onEditQty ? 'hover:bg-white/10 active:bg-blue-600' : 'cursor-default'}`}
          >
            {item.totalQuantity}
          </button>
          
          <button 
            onClick={() => onScan(item.barcode, 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all active:scale-90"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Forced GitHub sync
