
import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, CheckSquare, Trash2, Barcode } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
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
        <h3 className={`text-xs font-black uppercase tracking-tight truncate mb-1 ${
          theme === 'dark' ? 'text-white' : 'text-stone-900'
        }`}>
          {item.productName}
        </h3>
        <div className="flex items-center gap-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">
            {item.providerName}
          </p>
          
          {/* DÍAS RESTANTES (Cuadrado Rojo - Destacado) */}
          <div className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-500 text-[10px] font-black uppercase tracking-widest shadow-sm">
            {item.daysLeft}D {item.hasCanje ? 'Canje' : 'Merma'}
          </div>
        </div>
      </div>

      {/* ESTADO DE RETIRO (Indicador Central - Grande) */}
      <div className="w-56 shrink-0 flex items-center justify-center">
        <div className={`px-6 py-2.5 rounded-xl border-2 shadow-xl transition-all hover:scale-105 active:scale-95 cursor-default flex flex-col items-center justify-center min-w-[140px] ${
          item.hasCanje 
            ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-400' 
            : 'bg-amber-600/10 border-amber-500/40 text-amber-500'
        }`}>
          <div className="text-[11px] font-black uppercase tracking-[0.2em]">
            {item.hasCanje ? 'Canje' : 'Merma'}
          </div>
          <div className="text-sm font-black uppercase tracking-tight mt-0.5">
            {item.withdrawalDate ? format(item.withdrawalDate, 'MMM yyyy', { locale: es }) : 'SIN FECHA'}
          </div>
        </div>
      </div>

      {/* COLUMNAS DE FECHAS DESTACADAS */}
      <div className="w-64 flex gap-8 shrink-0 px-4">
        {/* RETIRO */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-black text-indigo-500/70 uppercase tracking-[0.15em] italic">Retiro</span>
          <span className="text-base font-black text-indigo-400 font-mono tracking-tighter italic tabular-nums">
            {item.withdrawalDate ? format(item.withdrawalDate, 'dd/MM/yyyy') : '--/--/----'}
          </span>
        </div>

        {/* VENCIMIENTO */}
        <div className="flex flex-col items-center gap-1 border-l border-white/5 pl-8">
          <span className="text-[9px] font-black text-slate-500/70 uppercase tracking-[0.15em] italic">Vencimiento</span>
          <span className={`text-base font-black font-mono tracking-tighter italic tabular-nums ${statusConfig.colorClass}`}>
            {item.expiryDateObj ? format(item.expiryDateObj, 'dd/MM/yyyy') : '--/--/----'}
          </span>
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
