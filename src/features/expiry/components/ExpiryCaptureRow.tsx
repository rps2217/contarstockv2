import React from 'react';
import { 
  ShieldAlert, 
  Download, 
  Trash2, 
  AlertTriangle,
  RotateCcw,
  Package,
  Calendar
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ExpiryItem } from '../hooks/useExpiryDatabase';

interface ExpiryCaptureRowProps {
  item: ExpiryItem;
  onDelete: (id: string) => void;
  onClick?: (item: ExpiryItem) => void;
}

const getDaysUntilExpiry = (mm: number, yyyy: number) => {
  const expiryDate = new Date(yyyy, mm - 1, 1);
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  expiryDate.setDate(0);
  return differenceInDays(expiryDate, new Date());
};

// Badge de política (Canje/Merma)
const PolicyBadge: React.FC<{ hasCanje?: boolean; days?: number }> = ({ hasCanje, days }) => {
  if (days === undefined) return null;
  
  return (
    <span className={`inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-full border ${
      hasCanje 
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
        : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
    }`}>
      {hasCanje ? <RotateCcw className="w-3 h-3" /> : <Package className="w-3 h-3" />}
      {days}D {hasCanje ? 'CANJE' : 'MERMA'}
    </span>
  );
};

export const ExpiryCaptureRow: React.FC<ExpiryCaptureRowProps> = React.memo(({ 
  item, 
  onDelete,
  onClick
}) => {
  const isWarning = item.daysLeft <= 90;
  const isExpired = item.daysLeft <= 0;
  const isSafe = item.status === 'safe';
  
  const formattedWithdrawalDate = item.withdrawalDate 
    ? format(item.withdrawalDate, 'dd/MM/yy') 
    : null;
  
  const formattedExpiry = item.expiryDateObj 
    ? format(item.expiryDateObj, 'MMM yy') 
    : `${item.mm}/${item.yyyy}`;

  // Color según estado
  const statusColor = isExpired 
    ? 'rose' 
    : isWarning 
      ? 'amber' 
      : isSafe 
        ? 'emerald' 
        : 'blue';
        
  const colorClasses = {
    rose: {
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/5',
      icon: 'text-rose-500',
      badge: 'bg-rose-500 text-white',
    },
    amber: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/5',
      icon: 'text-amber-500',
      badge: 'bg-amber-500 text-black',
    },
    emerald: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/5',
      icon: 'text-emerald-500',
      badge: 'bg-emerald-500 text-white',
    },
    blue: {
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/5',
      icon: 'text-blue-500',
      badge: 'bg-blue-500 text-white',
    },
  };
  
  const colors = colorClasses[statusColor];

  return (
    <div
      onClick={() => onClick?.(item)}
      className={`flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border ${colors.border} cursor-pointer active:scale-[0.98] transition-transform`}
    >
      {/* Status Badge */}
      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center relative ${colors.bg} border ${colors.border}`}>
        {isExpired ? (
          <AlertTriangle className={`w-5 h-5 ${colors.icon}`} />
        ) : isWarning ? (
          <ShieldAlert className={`w-5 h-5 ${colors.icon}`} />
        ) : (
          <Download className={`w-5 h-5 ${colors.icon}`} />
        )}
        <div className={`absolute -top-1.5 -right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${colors.badge}`}>
          {item.daysLeft > 0 ? item.daysLeft : '0'}
        </div>
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-xs font-black text-white uppercase leading-tight truncate">
          {item.productName}
        </h3>
        
        {/* Proveedor y Política */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="bg-slate-800/80 text-slate-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
            {item.barcode.slice(-8)}
          </span>
          <span className="text-slate-500 text-[9px] font-bold uppercase truncate max-w-[80px]">
            {item.providerName === 'N/A' || !item.providerName ? 'S/PROV' : item.providerName.slice(0, 10)}
          </span>
          <PolicyBadge hasCanje={item.hasCanje} days={item.withdrawalDays} />
        </div>
        
        {/* Observaciones */}
        {item.observaciones && (
          <p className="text-[9px] font-bold text-amber-500/80 uppercase italic truncate mt-0.5">
            {item.observaciones}
          </p>
        )}
      </div>

      {/* Dates */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-slate-500" />
          <span className={`text-[10px] font-black ${isExpired ? 'text-rose-400' : 'text-slate-300'}`}>
            {formattedWithdrawalDate || 'S/F'}
          </span>
        </div>
        <span className="text-[8px] text-slate-600 font-medium">
          Vence: {formattedExpiry}
        </span>
        
        {/* Sync Status */}
        <div className={`text-[7px] font-black uppercase px-1 py-0.5 rounded ${
          item.syncStatus === 'synced' 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : item.syncStatus === 'error' 
              ? 'bg-red-500/20 text-red-400' 
              : 'bg-amber-500/20 text-amber-400'
        }`}>
          {item.syncStatus === 'synced' ? '✓' : item.syncStatus === 'error' ? '✗' : '○'}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500/70 active:bg-red-500/30 transition-colors shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
});

ExpiryCaptureRow.displayName = 'ExpiryCaptureRow';
