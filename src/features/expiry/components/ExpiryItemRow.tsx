
import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, CheckSquare, Trash2, Barcode } from 'lucide-react';
import { format } from 'date-fns';
import { useToastStore } from '../../../store/useToastStore';

interface ExpiryItemRowProps {
  item: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRemove: (item: any) => void;
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
  theme = 'dark'
}) => {
  const { addToast } = useToastStore.getState();
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.safe;
  const StatusIcon = isSelected ? CheckSquare : statusConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`group flex items-center gap-4 px-4 py-2 border-b transition-all ${
        isSelected 
          ? 'bg-indigo-500/10 border-indigo-500/30' 
          : theme === 'dark' 
            ? 'bg-brand-surface/60 border-white/10 hover:bg-brand-surface/80' 
            : 'bg-white border-stone-100 hover:bg-stone-50'
      }`}
    >
      {/* SELECTOR */}
      <div 
        onClick={() => onToggleSelect(item.id)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all shrink-0 ${
          isSelected 
            ? 'bg-indigo-500 text-white' 
            : `${statusConfig.bgClass} ${statusConfig.colorClass} border border-transparent hover:border-current`
        }`}
      >
        <StatusIcon className="w-4 h-4" />
      </div>

      {/* SKU */}
      <div className="w-32 shrink-0">
        <span 
          onClick={() => {
            navigator.clipboard.writeText(item.barcode);
            addToast(`SKU ${item.barcode} copiado`, 'success');
          }}
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border cursor-pointer transition-colors ${
            theme === 'dark' ? 'bg-brand-dark text-slate-300 border-white/10' : 'bg-stone-100 text-stone-600 border-stone-200'
          }`}
        >
          {item.barcode}
        </span>
      </div>

      {/* PRODUCT NAME */}
      <div className="flex-1 min-w-0">
        <h3 className={`text-xs font-black uppercase tracking-tight truncate ${
          theme === 'dark' ? 'text-white' : 'text-stone-900'
        }`}>
          {item.productName}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">
            {item.providerName}
          </p>
          {item.withdrawalDays !== undefined && (
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${
              item.hasCanje 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              {item.withdrawalDays}D {item.hasCanje ? 'CANJE' : 'MERMA'}
            </span>
          )}
        </div>
      </div>

      {/* FRC / ESTADO */}
      <div className="w-24 hidden lg:block">
        {item.frc && (
          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
            FRC: {item.frc}
          </span>
        )}
      </div>

      {/* EXPIRY DATE */}
      <div className="w-32 text-right">
        <div className={`text-xs font-black ${statusConfig.colorClass}`}>
          {item.expiryDateObj ? format(item.expiryDateObj, 'dd/MM/yyyy') : 'N/A'}
        </div>
        <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
          {item.daysLeft} DÍAS RESTANTES
        </div>
      </div>

      {/* ACTIONS */}
      <div className="w-12 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onRemove(item)}
          className="w-8 h-8 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg flex items-center justify-center transition-all border border-rose-500/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
});
