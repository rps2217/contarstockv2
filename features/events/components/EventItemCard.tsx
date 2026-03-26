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
  Info,
  Copy,
  Truck
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EventItemCardProps {
  item: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdateStatus?: (id: string, isAdjusted: boolean) => void;
  onRemove?: (item: any) => void;
  onEdit?: (item: any) => void;
  onFrcClick?: (frc: string) => void;
  onEventClick?: (event: string) => void;
  theme?: 'dark' | 'light';
  isCompact?: boolean;
}

export const EventItemCard: React.FC<EventItemCardProps> = React.memo(({
  item,
  isSelected,
  onToggleSelect,
  onUpdateStatus,
  onRemove,
  onEdit,
  onFrcClick,
  onEventClick,
  theme = 'dark',
  isCompact = false
}) => {
  const handleCopyBarcode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.barcode);
    toast.success(`Copiado: ${item.barcode}`, {
      icon: <Copy className="w-4 h-4 text-blue-500" />
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`border rounded-2xl flex flex-col md:grid md:grid-cols-[60px_2fr_1fr_1fr_140px] items-start md:items-center gap-4 md:gap-6 group transition-all relative ${
        isCompact ? 'p-3 md:p-2' : 'p-4'
      } ${
        theme === 'dark' ? 'bg-slate-900/40 hover:bg-slate-900/60' : 'bg-white shadow-sm hover:shadow-md'
      } ${
        isSelected ? 'border-blue-500 bg-blue-500/5' :
        theme === 'dark' ? 'border-white/5' : 'border-slate-200'
      }`}
    >
      {/* MOBILE TOP ROW & DESKTOP COLUMN 1 & 2 */}
      <div className="flex items-start gap-3 w-full md:contents">
        {/* COLUMN 1: ICON */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id);
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-lg hover:scale-105 ${
              isSelected ? 'bg-blue-600 text-white' :
              'bg-blue-500/10 text-blue-500 border border-blue-500/20'
            }`}
          >
            {isSelected ? <CheckSquare className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
        </div>

        {/* COLUMN 2: PRODUCT (Mobile View) */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 md:hidden">
          <h3 className={`text-base font-black uppercase tracking-tighter italic truncate ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            {item.productName}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyBarcode}
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 flex items-center gap-1 group/copy ${
                theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Copiar SKU"
            >
              {item.barcode}
              <Copy className="w-2.5 h-2.5 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
            </button>
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
            {item.destino && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest">
                {item.destino}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP COLUMN 2: PRODUCT (Desktop View) */}
      <div className="hidden md:flex flex-col gap-1 min-w-0">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${
          theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
        }`}>Producto</span>
        <h3 className={`text-sm font-black uppercase tracking-tighter italic truncate ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>
          {item.productName}
        </h3>
        <button
          onClick={handleCopyBarcode}
          className={`text-[10px] font-bold uppercase tracking-widest transition-all hover:text-blue-500 active:scale-95 text-left flex items-center gap-1 group/copy-desk ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          }`}
          title="Copiar SKU"
        >
          {item.barcode}
          <Copy className="w-2.5 h-2.5 opacity-0 group-hover/copy-desk:opacity-100 transition-opacity" />
        </button>
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

      {/* COLUMN 5: QUANTITY & DESTINO */}
      <div className="flex items-center justify-between w-full md:w-auto md:flex-col md:items-start gap-2 md:gap-1">
        <div className="flex items-center gap-2">
          <Package className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {item.quantity} <span className="text-[10px] text-slate-500 italic">UN</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-emerald-500/80' : 'text-emerald-600/80'}`} />
          <span className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {item.destino || item.location || 'N/A'}
          </span>
        </div>
      </div>

      {/* ACTIONS COLUMN */}
      <div className="flex items-center gap-1.5 w-full md:w-auto justify-end md:justify-center">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            className={`w-9 h-9 rounded-xl transition-all border flex items-center justify-center ${
              theme === 'dark' 
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white' 
                : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white'
            }`}
            title="Editar Registro"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
        
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item);
            }}
            className={`w-9 h-9 rounded-xl transition-all border flex items-center justify-center ${
              theme === 'dark' 
                ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' 
                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-600 hover:text-white'
            }`}
            title="Eliminar Registro"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
});
