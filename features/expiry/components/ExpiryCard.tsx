import React from 'react';
import { ShieldAlert, AlertTriangle, Download, Clock, CheckCircle2, Trash2, CheckSquare, Square } from 'lucide-react';
import { ExpiryItem } from '../../../store/useExpiryStore';

interface Props {
  item: ExpiryItem;
  onVerify: (id: string) => void;
  onDelete: (id: string) => void;
  isVerified: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const ExpiryCard: React.FC<Props> = ({ item, onVerify, onDelete, isVerified, isSelected, onSelect }) => {
  const statusConfig = {
    expired: { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: AlertTriangle },
    critical: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: ShieldAlert },
    withdrawal: { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', icon: Download },
    next_expiry: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Clock },
    safe: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2 },
  };

  const config = statusConfig[item.status] || statusConfig.safe;
  const Icon = config.icon;

  return (
    <div className={`flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-2xl border transition-colors ${isSelected ? 'bg-amber-500/10 border-amber-500/50' : `bg-[#0f1219] hover:bg-[#151923] ${config.border}`}`}>
      
      {/* Checkbox for selection */}
      <button 
        onClick={() => onSelect(item.id)}
        className="hidden md:flex items-center justify-center shrink-0 w-8 h-8 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
      >
        {isSelected ? <CheckSquare className="w-5 h-5 text-amber-500" /> : <Square className="w-5 h-5" />}
      </button>

      {/* Left Section: Icon & Verify */}
      <div className="flex flex-row md:flex-col items-center gap-3 md:gap-2 md:w-16 shrink-0">
        <div className="flex md:hidden w-full justify-between items-center mb-2">
           <button 
            onClick={() => onSelect(item.id)}
            className="flex items-center justify-center shrink-0 w-8 h-8 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
          >
            {isSelected ? <CheckSquare className="w-5 h-5 text-amber-500" /> : <Square className="w-5 h-5" />}
          </button>
        </div>
        <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center border ${config.border} ${config.bg}`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
          {item.quantity > 0 && (
            <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {item.quantity}
            </span>
          )}
        </div>
        <button 
          onClick={() => onVerify(item.id)}
          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 md:px-2 md:py-1 rounded-md border transition-colors ${isVerified ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
        >
          Verif
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="text-white font-black italic uppercase tracking-tight truncate text-lg leading-tight mb-2 md:mb-1">
          {item.productName}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700">
            {item.barcode}
          </span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
            {item.providerName || 'PROVEEDOR DESCONOCIDO'}
          </span>
        </div>
      </div>

      {/* Canje Pill */}
      {item.hasCanje && (
        <div className="flex items-center md:justify-center md:w-36 shrink-0 mt-2 md:mt-0">
          <span className="border border-amber-500/30 text-amber-500 bg-amber-500/5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
            CANJE {item.mm && item.yyyy ? `${new Date(item.yyyy, item.mm - 1).toLocaleString('es', { month: 'short' }).substring(0,3)} ${item.yyyy}` : ''}
          </span>
        </div>
      )}

      {/* Days / Status */}
      <div className="flex items-center md:justify-center md:w-24 shrink-0 mt-2 md:mt-0">
        {item.status === 'withdrawal' ? (
          <span className="text-indigo-400 font-black uppercase tracking-widest text-base">RETIRO</span>
        ) : item.status === 'expired' ? (
          <span className="text-rose-500 font-black uppercase tracking-widest text-base">VENCIDO</span>
        ) : (
          <span className={`${config.color} font-black uppercase tracking-widest text-2xl`}>
            {item.daysLeft}D
          </span>
        )}
      </div>

      {/* Expiration Date */}
      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center md:w-32 shrink-0 mt-4 md:mt-0 border-t border-white/5 md:border-0 pt-3 md:pt-0">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest md:mb-0.5">Vencimiento</span>
        <span className="text-white font-bold text-sm">
          {item.expiryDate || `${String(item.mm).padStart(2, '0')}/${item.yyyy}`}
        </span>
      </div>

      {/* Delete Button */}
      <button 
        onClick={() => onDelete(item.id)}
        className="hidden md:flex w-10 h-10 rounded-xl items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors shrink-0"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
};
