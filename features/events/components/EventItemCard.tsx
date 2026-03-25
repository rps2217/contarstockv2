import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertCircle, 
  CheckSquare, 
  MapPin, 
  Package, 
  MoreVertical,
  CheckCircle2,
  Undo2,
  Trash2,
  ExternalLink,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

interface EventItemCardProps {
  item: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateStatus?: (id: string, isAdjusted: boolean) => void;
  onRemove?: (item: any) => void;
  onFrcClick?: (frc: string) => void;
  theme?: 'dark' | 'light';
  isCompact?: boolean;
}

export const EventItemCard: React.FC<EventItemCardProps> = React.memo(({
  item,
  isSelected,
  onToggleSelect,
  onUpdateStatus,
  onRemove,
  onFrcClick,
  theme = 'dark',
  isCompact = false
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`border rounded-2xl flex flex-col md:grid md:grid-cols-[80px_120px_1.5fr_1fr_1fr] items-start md:items-center gap-4 md:gap-6 group transition-all relative ${
        isCompact ? 'p-3 md:p-2' : 'p-4'
      } ${
        theme === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'
      } ${
        isSelected ? 'border-indigo-500 bg-indigo-500/10' :
        theme === 'dark' ? 'border-white/5' : 'border-slate-200'
      }`}
    >
      {/* MOBILE TOP ROW & DESKTOP COLUMN 1 & 3 */}
      <div className="flex items-start gap-3 w-full md:contents">
        {/* COLUMN 1: ICON */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id);
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-lg hover:scale-105 ${
              isSelected ? 'bg-indigo-500 text-white' :
              'bg-blue-500/20 text-blue-500 border border-blue-500/30'
            }`}
          >
            {isSelected ? <CheckSquare className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
        </div>

        {/* COLUMN 3: PRODUCT (Mobile View) */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 md:hidden">
          <h3 className={`text-base font-black uppercase tracking-tighter italic truncate ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            {item.productName}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
              theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              {item.barcode}
            </span>
            {item.frc && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFrcClick?.(item.frc);
                }}
                className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-colors"
              >
                {item.frc}
              </button>
            )}
            {item.erp && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[8px] font-black uppercase tracking-widest">
                {item.erp}
              </span>
            )}
            {item.nguia && (
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[8px] font-black uppercase tracking-widest">
                {item.nguia}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP COLUMN 2: EVENT TYPE */}
      <div className="hidden md:flex flex-col gap-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${
          theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
        }`}>Evento</span>
        <div className="flex flex-col gap-1">
          <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border inline-flex w-fit ${
            theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-blue-50 border-blue-200 text-blue-600'
          }`}>
            {item.event}
          </span>
        </div>
      </div>

      {/* DESKTOP COLUMN 3: PRODUCT (Desktop View) */}
      <div className="hidden md:flex flex-col gap-1 min-w-0">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${
          theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
        }`}>Producto</span>
        <h3 className={`text-sm font-black uppercase tracking-tighter italic truncate ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>
          {item.productName}
        </h3>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${
          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
        }`}>
          {item.barcode}
        </span>
      </div>

      {/* DESKTOP COLUMN 4: FRC (Priority Column) */}
      <div className="hidden md:flex flex-col gap-1">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${
          theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
        }`}>Folio FRC</span>
        {item.frc ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFrcClick?.(item.frc);
            }}
            className={`text-lg font-black tracking-tighter italic transition-all hover:scale-110 active:scale-95 text-left ${
              theme === 'dark' ? 'text-amber-500 hover:text-amber-400' : 'text-amber-600 hover:text-amber-700'
            }`}
          >
            {item.frc}
          </button>
        ) : (
          <span className="text-xs text-slate-500 italic">N/A</span>
        )}
      </div>

      {/* COLUMN 5: QUANTITY & LOCATION */}
      <div className="flex items-center justify-between w-full md:w-auto md:flex-col md:items-start gap-2 md:gap-1">
        <div className="flex items-center gap-2">
          <Package className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {item.quantity} <span className="text-[10px] text-slate-500">UN</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            {item.location}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
