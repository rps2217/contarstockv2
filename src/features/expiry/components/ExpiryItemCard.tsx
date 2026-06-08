
import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, CheckSquare, Trash2, Edit2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useToastStore } from '../../../store/useToastStore';

interface ExpiryItemCardProps {
  item: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRemove: (item: any) => void;
  onEdit?: (item: any) => void;
  onOpenDetail?: (item: any) => void;
  onFilterProvider?: (provider: string) => void;
  onFilterEstado?: (estado: string) => void;
  onFilterFrc?: (frc: string) => void;
  theme?: 'dark' | 'light';
  isCompact?: boolean;
}

const STATUS_CONFIG: Record<string, {
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  expired: { icon: AlertTriangle, colorClass: 'text-rose-500', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/20' },
  critical: { icon: ShieldAlert, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/20' },
  withdrawal: { icon: Download, colorClass: 'text-indigo-500', bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/20' },
  next_expiry: { icon: Clock, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/20' },
  safe: { icon: CheckCircle2, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20' }
};

export const ExpiryItemCard: React.FC<ExpiryItemCardProps> = React.memo(({
  item,
  isSelected,
  onToggleSelect,
  onRemove,
  onEdit,
  onOpenDetail,
  theme = 'dark',
  isCompact = false
}) => {
  const { addToast } = useToastStore.getState();
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.safe;
  const StatusIcon = isSelected ? CheckSquare : statusConfig.icon;
  const isDark = theme === 'dark';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative group rounded-xl border p-4 transition-all cursor-pointer ${
        isSelected 
          ? isDark ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-indigo-50 border-indigo-300'
          : isDark ? 'bg-brand-surface border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
      onClick={() => onOpenDetail ? onOpenDetail(item) : onEdit?.(item)}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(item.id);
          }}
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isSelected 
              ? 'bg-indigo-500 text-white' 
              : `${statusConfig.bgClass} ${statusConfig.colorClass} border ${statusConfig.borderClass}`
          }`}
        >
          <StatusIcon className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between gap-2">
            <h3 className={`text-base font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {item.productName}
            </h3>
            
            {/* Quick Actions (Hover) */}
            <div className="hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
               <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
                className={`p-1.5 rounded-md ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove?.(item); }}
                className={`p-1.5 rounded-md ${isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-1 whitespace-nowrap overflow-x-auto no-scrollbar">
            <span 
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(item.barcode);
                addToast('SKU copiado', 'success');
              }}
              className={`flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.barcode}
            </span>
            <span className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {item.providerName || 'Sin Proveedor'}
            </span>
            {item.observaciones && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded truncate max-w-[100px] ${
                isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'
              }`}>
                {item.observaciones}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dates Grid */}
      <div className={`mt-4 grid grid-cols-2 gap-3 pt-3 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
        <div>
          <div className={`text-[10px] uppercase mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Retiro Previsto</div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
               {item.withdrawalDate ? format(item.withdrawalDate, 'dd/MM/yy') : '--/--'}
            </span>
            {item.hasCanje !== undefined && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                item.hasCanje 
                  ? isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  : isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
              }`}>
                {item.hasCanje ? 'Canje' : 'Merma'}
              </span>
            )}
          </div>
        </div>
        <div>
          <div className={`text-[10px] uppercase mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Vencimiento</div>
          <div className={`text-sm font-medium ${statusConfig.colorClass}`}>
             {item.expiryDateObj ? format(item.expiryDateObj, 'dd/MM/yy') : '--/--'}
          </div>
        </div>
      </div>
      
      {/* Mobile only actions bottom row */}
      <div className="md:hidden mt-3 flex items-center justify-end border-t pt-2 gap-2 border-transparent">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
          className={`flex-1 p-2 rounded-lg border text-xs font-medium ${isDark ? 'border-white/10 text-slate-300 bg-white/5' : 'border-slate-200 text-slate-600 bg-slate-50'}`}
        >
          Editar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(item); }}
          className={`flex-1 p-2 rounded-lg border text-xs font-medium ${isDark ? 'border-rose-500/20 text-rose-400 bg-rose-500/10' : 'border-rose-200 text-rose-600 bg-rose-50'}`}
        >
          Retirar
        </button>
      </div>
    </motion.div>
  );
});

