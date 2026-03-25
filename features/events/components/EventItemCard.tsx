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
  theme?: 'dark' | 'light';
  isCompact?: boolean;
}

export const EventItemCard: React.FC<EventItemCardProps> = React.memo(({
  item,
  isSelected,
  onToggleSelect,
  onUpdateStatus,
  onRemove,
  theme = 'dark',
  isCompact = false
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setIsMenuOpen(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`border rounded-2xl flex flex-col md:grid md:grid-cols-[80px_150px_1.5fr_1fr_1fr_60px] items-start md:items-center gap-4 md:gap-6 group transition-all relative ${
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
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest">
                {item.frc}
              </span>
            )}
            {item.erp && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[8px] font-black uppercase tracking-widest">
                {item.erp}
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
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md w-fit border ${
            item.isAdjusted 
              ? theme === 'dark' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : theme === 'dark' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            {item.isAdjusted ? 'Ajustado' : 'Pendiente'}
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
        <div className="flex flex-wrap gap-1 mt-1">
          {item.frc && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest">
              FRC: {item.frc}
            </span>
          )}
          {item.erp && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[8px] font-black uppercase tracking-widest">
              ERP: {item.erp}
            </span>
          )}
        </div>
      </div>

      {/* COLUMN 4: QUANTITY & LOCATION */}
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

      {/* COLUMN 5: DATE */}
      <div className="flex items-center justify-between w-full md:w-auto md:flex-col md:items-end gap-2 md:gap-1">
        <div className="flex items-center gap-2 md:hidden">
          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
            theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-blue-50 border-blue-200 text-blue-600'
          }`}>
            {item.event}
          </span>
          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
            item.isAdjusted 
              ? theme === 'dark' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : theme === 'dark' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            {item.isAdjusted ? 'Ajustado' : 'Pendiente'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`}>Fecha de Registro</span>
          <span className={`text-xs font-black ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            {format(item.timestamp, 'dd/MM/yyyy HH:mm')}
          </span>
        </div>
      </div>

      {/* COLUMN 6: ACTION MENU */}
      <div className="flex items-center justify-end w-full md:w-auto">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className={`p-2 rounded-xl transition-all border ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' 
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsMenuOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className={`absolute right-0 bottom-full md:bottom-auto md:top-full mt-2 w-48 rounded-2xl border shadow-2xl z-50 overflow-hidden ${
                    theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="p-2 space-y-1">
                    {!item.isAdjusted ? (
                      <button
                        onClick={(e) => handleAction(e, () => onUpdateStatus?.(item.id, true))}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Marcar Ajustado
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleAction(e, () => onUpdateStatus?.(item.id, false))}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500/10 transition-colors"
                      >
                        <Undo2 className="w-4 h-4" />
                        Revertir Ajuste
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => handleAction(e, () => {
                        // Placeholder for details
                        alert(`Detalles de ${item.productName}\nEvento: ${item.event}\nCantidad: ${item.quantity}`);
                      })}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                        theme === 'dark' ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Info className="w-4 h-4" />
                      Ver Detalles
                    </button>

                    <div className={`h-px my-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />

                    <button
                      onClick={(e) => handleAction(e, () => onRemove?.(item))}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});
