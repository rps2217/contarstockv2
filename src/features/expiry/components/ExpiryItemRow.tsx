
import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, CheckSquare, Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { useToastStore } from '../../../store/useToastStore';

interface ExpiryItemRowProps {
  item: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRemove: (item: any) => void;
  onEdit?: (item: any) => void;
  onOpenDetail?: (item: any) => void;
  theme?: 'dark' | 'light';
}

const STATUS_CONFIG: Record<string, {
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}> = {
  expired: { icon: AlertTriangle, colorClass: 'text-rose-500', bgClass: 'bg-rose-500/10' },
  critical: { icon: ShieldAlert, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
  withdrawal: { icon: Download, colorClass: 'text-indigo-500', bgClass: 'bg-indigo-500/10' },
  next_expiry: { icon: Clock, colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10' },
  safe: { icon: CheckCircle2, colorClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10' }
};

export const ExpiryItemRow: React.FC<ExpiryItemRowProps> = React.memo(({
  item,
  isSelected,
  onToggleSelect,
  onRemove,
  onEdit,
  onOpenDetail,
  theme = 'dark'
}) => {
  const { addToast } = useToastStore.getState();
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.safe;
  const StatusIcon = isSelected ? CheckSquare : statusConfig.icon;

  const isDark = theme === 'dark';

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`group flex items-center gap-4 px-4 py-3 border-b border-transparent transition-colors cursor-pointer ${
        isSelected 
          ? isDark ? 'bg-indigo-500/10 border-b-indigo-500/20' : 'bg-indigo-50 border-b-indigo-100'
          : isDark ? 'hover:bg-white/[0.02] border-b-white/5' : 'hover:bg-slate-50 border-b-slate-100'
      }`}
    >
      {/* Checkbox / Status */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(item.id);
        }}
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          isSelected 
            ? 'bg-indigo-500 text-white' 
            : `${statusConfig.bgClass} ${statusConfig.colorClass} hover:opacity-80`
        }`}
      >
        <StatusIcon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center">
        {/* Product Details */}
        <div 
          className="flex flex-col min-w-0" 
          onClick={() => onOpenDetail ? onOpenDetail(item) : onEdit?.(item)}
        >
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {item.productName}
            </h3>
            {item.observaciones && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded truncate max-w-[100px] ${
                isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700'
              }`} title={item.observaciones}>
                {item.observaciones}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5" onClick={(e) => e.stopPropagation()}>
            <span 
              onClick={() => {
                navigator.clipboard.writeText(item.barcode);
                addToast(`SKU copiado`, 'success');
              }}
              className={`text-xs font-mono cursor-pointer hover:underline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {item.barcode}
            </span>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>•</span>
            <span className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              {item.providerName || 'Sin Proveedor'}
            </span>
          </div>
        </div>

        {/* Withdrawal Info */}
        <div className="hidden md:flex flex-col" onClick={() => onOpenDetail ? onOpenDetail(item) : onEdit?.(item)}>
          <div className="flex items-center gap-2">
            {item.hasCanje !== undefined && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                item.hasCanje 
                  ? isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  : isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
              }`}>
                {item.hasCanje ? 'Canje' : 'Merma'}
              </span>
            )}
            {item.withdrawalDays !== undefined && (
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {item.withdrawalDays}D Pol.
              </span>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between md:justify-start gap-6" onClick={() => onOpenDetail ? onOpenDetail(item) : onEdit?.(item)}>
          <div className="flex flex-col">
            <span className={`text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Retiro</span>
            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {item.withdrawalDate ? format(item.withdrawalDate, 'dd/MM/yy') : '--/--'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className={`text-[10px] uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Venc.</span>
            <span className={`text-sm font-medium ${statusConfig.colorClass}`}>
              {item.expiryDateObj ? format(item.expiryDateObj, 'dd/MM/yy') : '--/--'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(item);
            }}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item);
            }}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

