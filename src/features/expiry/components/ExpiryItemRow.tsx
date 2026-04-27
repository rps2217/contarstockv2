
import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, CheckSquare, Trash2, Barcode, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { useToastStore } from '../../../store/useToastStore';

interface ExpiryItemRowProps {
  item: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRemove: (item: any) => void;
  onEdit?: (item: any) => void;
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
      onClick={() => onEdit?.(item)}
      className={`group flex items-center gap-4 px-6 py-4 border-b transition-all cursor-pointer ${
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
      <div className="w-44 shrink-0">
        <span 
          onClick={() => {
            navigator.clipboard.writeText(item.barcode);
            addToast(`SKU ${item.barcode} copiado`, 'success');
          }}
          className={`text-sm font-mono font-black px-4 py-1.5 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm inline-block ${
            theme === 'dark' ? 'bg-brand-dark text-white border-white/20' : 'bg-stone-100 text-stone-900 border-stone-300'
          }`}
        >
          {item.barcode}
        </span>
      </div>

      {/* PRODUCT NAME */}
      <div className="flex-1 min-w-0">
        <h3 className={`text-base font-black uppercase tracking-tighter italic truncate mb-1 ${
          theme === 'dark' ? 'text-white' : 'text-stone-900'
        }`}>
          {item.productName}
        </h3>
        {item.observaciones && (
          <p className={`text-[10px] font-bold uppercase italic mb-1 ${
            theme === 'dark' ? 'text-amber-500/80' : 'text-amber-600'
          }`}>
            {item.observaciones}
          </p>
        )}
        <div className="flex items-center gap-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest truncate">
            {item.providerName}
          </p>
          
          {/* POLÍTICA DE RETIRO (Días definidos por proveedor - Cuadrado Rojo) */}
          <div className="px-3 py-1 rounded-lg bg-rose-500/20 border-2 border-rose-500/50 text-rose-500 text-[12px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/10">
            {item.withdrawalDays}D Política
          </div>
        </div>
      </div>

      {/* ESTADO DE RETIRO (Indicador Central - Grande) */}
      <div className="w-72 shrink-0 flex items-center justify-center px-4">
        <div className={`px-10 py-4 rounded-3xl border-2 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-default flex flex-col items-center justify-center min-w-[180px] ${
          item.hasCanje 
            ? 'bg-indigo-600/10 border-indigo-500/60 text-indigo-400 shadow-indigo-500/10' 
            : 'bg-amber-600/10 border-amber-500/60 text-amber-500 shadow-amber-500/10'
        }`}>
          <div className="text-[14px] font-black uppercase tracking-[0.3em] mb-1">
            {item.hasCanje ? 'Canje' : 'Merma'}
          </div>
          <div className="text-xl font-black uppercase tracking-tighter">
            {item.withdrawalDate ? format(item.withdrawalDate, 'MMMM yyyy', { locale: es }) : 'SIN FECHA'}
          </div>
        </div>
      </div>

      {/* COLUMNAS DE FECHAS DESTACADAS (GIGANTE - VISIBILIDAD MÁXIMA) */}
      <div className="w-[450px] flex gap-12 shrink-0 px-8 border-l border-white/5 ml-4">
        {/* RETIRO */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[14px] font-black text-indigo-500 uppercase tracking-[0.3em] italic">RETIRO</span>
          <span className="text-4xl font-black text-indigo-400 font-mono tracking-tighter italic tabular-nums leading-none">
            {item.withdrawalDate ? format(item.withdrawalDate, 'dd/MM/yyyy') : '--/--/----'}
          </span>
        </div>

        {/* VENCIMIENTO */}
        <div className="flex flex-col items-center gap-1 border-l-4 border-white/10 pl-12">
          <span className="text-[14px] font-black text-slate-500 uppercase tracking-[0.3em] italic">VENCIMIENTO</span>
          <span className={`text-4xl font-black font-mono tracking-tighter italic tabular-nums leading-none ${statusConfig.colorClass}`}>
            {item.expiryDateObj ? format(item.expiryDateObj, 'dd/MM/yyyy') : '--/--/----'}
          </span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="w-20 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(item);
          }}
          className="w-8 h-8 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-lg flex items-center justify-center transition-all border border-blue-500/20"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item);
          }}
          className="w-8 h-8 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg flex items-center justify-center transition-all border border-rose-500/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
});
