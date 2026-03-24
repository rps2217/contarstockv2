
import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, CheckSquare, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToastStore } from '../../../store/useToastStore';

interface ExpiryItemCardProps {
  item: any;
  isSelected: boolean;
  isVerified: boolean;
  onToggleSelect: (id: string) => void;
  onToggleVerified: (id: string) => void;
  onRemove: (item: any) => void;
  onFilterProvider?: (provider: string) => void;
  onFilterEstado?: (estado: string) => void;
  theme?: 'dark' | 'light';
  isCompact?: boolean;
}

const STATUS_CONFIG: Record<string, {
  icon: React.ElementType;
  label: (daysLeft: number) => string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  shadowClass: string;
  cardBorder: string;
  cardBg: string;
}> = {
  expired: {
    icon: AlertTriangle,
    label: () => 'VENCIDO',
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-500/20',
    borderClass: 'border-rose-500/30',
    shadowClass: 'drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]',
    cardBorder: 'border-rose-500/30',
    cardBg: 'bg-rose-500/5'
  },
  critical: {
    icon: ShieldAlert,
    label: (days) => `${days}D`,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-500/30',
    shadowClass: 'drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]',
    cardBorder: 'border-amber-500/30',
    cardBg: 'bg-amber-500/5'
  },
  withdrawal: {
    icon: Download,
    label: () => 'RETIRO',
    colorClass: 'text-indigo-500',
    bgClass: 'bg-indigo-500/20',
    borderClass: 'border-indigo-500/30',
    shadowClass: 'drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]',
    cardBorder: 'border-indigo-500/30',
    cardBg: 'bg-indigo-500/5'
  },
  next_expiry: {
    icon: Clock,
    label: () => 'PRÓX',
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/30',
    shadowClass: '',
    cardBorder: 'border-blue-500/30',
    cardBg: 'bg-blue-500/5'
  },
  safe: {
    icon: CheckCircle2,
    label: () => 'OK',
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/20',
    borderClass: 'border-emerald-500/30',
    shadowClass: '',
    cardBorder: '',
    cardBg: ''
  }
};

export const ExpiryItemCard: React.FC<ExpiryItemCardProps> = React.memo(({
  item,
  isSelected,
  isVerified,
  onToggleSelect,
  onToggleVerified,
  onRemove,
  onFilterProvider,
  onFilterEstado,
  theme = 'dark',
  isCompact = false
}) => {
  const { addToast } = useToastStore.getState();
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.safe;
  const StatusIcon = isSelected ? CheckSquare : statusConfig.icon;

  const getCardStyles = () => {
    let base = isCompact ? 'p-3 md:p-2' : 'p-4';
    let themeBase = theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-stone-50 shadow-sm border-stone-200';
    
    if (isSelected) {
      return `${base} border-indigo-500 bg-indigo-500/10`;
    }
    if (isVerified) {
      return `${base} border-emerald-500/50 bg-emerald-500/10 opacity-60`;
    }
    
    return `${base} ${themeBase} ${statusConfig.cardBorder} ${statusConfig.cardBg}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`border rounded-2xl flex flex-col md:grid md:grid-cols-[80px_2fr_1fr_1fr_1.5fr_80px] items-start md:items-center gap-4 md:gap-6 group transition-all ${getCardStyles()}`}
    >
      {/* COLUMN 1: ICON & VERIF */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(item.id);
          }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-lg hover:scale-105 ${
            isSelected 
              ? 'bg-indigo-500 text-white' 
              : `${statusConfig.bgClass} ${statusConfig.colorClass} border ${statusConfig.borderClass}`
          }`}
        >
          <StatusIcon className="w-6 h-6" />
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVerified(item.id);
          }}
          className={`w-full py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border ${
            isVerified
              ? 'bg-emerald-500 border-emerald-400 text-white'
              : theme === 'dark' 
                ? 'bg-white/5 border-white/10 text-slate-500 hover:border-emerald-500/50'
                : 'bg-stone-100 border-stone-200 text-stone-400 hover:border-emerald-500/50'
          }`}
        >
          {isVerified ? 'OK' : 'VERIF'}
        </button>
      </div>

      {/* COLUMN 2: PRODUCT & PROVIDER */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <h3 className={`text-base font-black uppercase tracking-tighter italic truncate ${
          theme === 'dark' ? 'text-white' : 'text-stone-900'
        }`}>
          {item.productName}
        </h3>
        <div className="flex items-center gap-2">
          <span 
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(item.barcode);
              addToast(`SKU ${item.barcode} copiado al portapapeles`, 'success');
            }}
            className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border cursor-pointer transition-colors ${
            theme === 'dark' ? 'bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700' : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
          }`}
            title="Copiar SKU"
          >
            {item.barcode}
          </span>
          <span 
            onClick={(e) => {
              e.stopPropagation();
              if (onFilterProvider) {
                onFilterProvider(item.providerName);
                addToast(`Filtrando por proveedor: ${item.providerName}`, 'info');
              }
            }}
            className={`text-[9px] font-black uppercase tracking-widest truncate cursor-pointer transition-colors ${
            theme === 'dark' ? 'text-slate-500 hover:text-indigo-400' : 'text-stone-400 hover:text-indigo-600'
          }`}
            title="Filtrar por este proveedor"
          >
            {item.providerName}
          </span>
        </div>
      </div>

      {/* COLUMN 3: ESTADO */}
      <div className="flex items-center">
        {item.estado && (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              if (onFilterEstado) {
                onFilterEstado(item.estado);
                addToast(`Filtrando por estado: ${item.estado}`, 'info');
              }
            }}
            className="text-[10px] font-black bg-amber-500/10 px-3 py-1 rounded text-amber-600 uppercase tracking-widest border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
          >
            {item.estado}
          </span>
        )}
      </div>

      {/* COLUMN 4: STATUS */}
      <div className="flex items-center">
        <div className={`text-lg font-black leading-none ${statusConfig.colorClass} ${statusConfig.shadowClass}`}>
          {statusConfig.label(item.daysLeft)}
        </div>
      </div>

      {/* COLUMN 5: DATES */}
      <div className="flex flex-col gap-1">
        <span className="text-[8px] font-black text-stone-500 uppercase tracking-widest">Vencimiento</span>
        <span className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>
          {item.expiryDateObj ? format(item.expiryDateObj, 'dd/MM/yyyy') : 'N/A'}
        </span>
      </div>

      {/* COLUMN 6: ACTIONS */}
      <div className="flex items-center justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item);
          }}
          className="w-11 h-11 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-rose-500/20 group-hover:scale-110 shrink-0 shadow-lg hover:shadow-rose-500/20"
          title="Retirar Producto"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
});
