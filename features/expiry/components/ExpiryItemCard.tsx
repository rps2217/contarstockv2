
import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, CheckSquare, MapPin, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ExpiryItemCardProps {
  item: any;
  isSelected: boolean;
  isVerified: boolean;
  onToggleSelect: (id: string) => void;
  onToggleVerified: (id: string) => void;
  onRemove: (item: any) => void;
  theme?: 'dark' | 'light';
}

export const ExpiryItemCard: React.FC<ExpiryItemCardProps> = ({
  item,
  isSelected,
  isVerified,
  onToggleSelect,
  onToggleVerified,
  onRemove,
  theme = 'dark'
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onToggleSelect(item.id)}
      className={`border rounded-2xl p-4 grid grid-cols-[80px_150px_1.5fr_1fr_1fr_1.2fr] items-center gap-6 group cursor-pointer transition-all ${
        theme === 'dark' ? 'bg-white/5' : 'bg-white shadow-sm'
      } ${
        isSelected ? 'border-indigo-500 bg-indigo-500/10' :
        isVerified ? 'border-emerald-500/50 bg-emerald-500/10 opacity-60' :
        item.status === 'expired' ? 'border-rose-500/30 bg-rose-500/5' : 
        item.status === 'critical' ? 'border-amber-500/30 bg-amber-500/5' :
        item.status === 'withdrawal' ? 'border-indigo-500/30 bg-indigo-500/5' :
        item.status === 'next_expiry' ? 'border-blue-500/30 bg-blue-500/5' :
        theme === 'dark' ? 'border-white/5' : 'border-slate-200'
      }`}
    >
      {/* COLUMN 1: ICON & VERIF */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(item.id);
          }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
            isSelected ? 'bg-indigo-500 text-white' :
            item.status === 'expired' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : 
            item.status === 'critical' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
            item.status === 'withdrawal' ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30' :
            item.status === 'next_expiry' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
            'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
          }`}
        >
          {isSelected ? <CheckSquare className="w-6 h-6" /> :
           item.status === 'expired' ? <AlertTriangle className="w-6 h-6" /> : 
           item.status === 'critical' ? <ShieldAlert className="w-6 h-6" /> :
           item.status === 'withdrawal' ? <Download className="w-6 h-6" /> :
           item.status === 'next_expiry' ? <Clock className="w-6 h-6" /> :
           <CheckCircle2 className="w-6 h-6" />}
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
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-500/50'
          }`}
        >
          {isVerified ? 'OK' : 'VERIF'}
        </button>
      </div>

      {/* COLUMN 2: BARCODE & TYPE */}
      <div className="flex flex-col gap-1.5">
        <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest border w-fit ${
          theme === 'dark' ? 'bg-slate-800 text-slate-200 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}>
          {item.barcode}
        </span>
        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest w-fit ${
          item.type === 'Individual' ? 'bg-blue-500/20 text-blue-400' : 
          item.type === 'Bulto/Caja' ? 'bg-purple-500/20 text-purple-400' :
          'bg-emerald-500/20 text-emerald-400'
        }`}>
          {item.type}
        </span>
      </div>

      {/* COLUMN 3: PRODUCT & PROVIDER (LARGER) */}
      <div className="min-w-0 flex flex-col gap-1.5 pr-4">
        <h3 className={`text-base font-black uppercase tracking-tighter italic truncate ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>
          {item.productName}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[9px] font-black uppercase tracking-widest truncate max-w-[180px] ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {item.providerName}
          </span>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
            item.hasCanje ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {item.hasCanje ? 'CON CANJE' : 'SIN CANJE'}
          </span>
          {item.location && item.location !== 'N/A' && (
            <span className="text-[8px] font-black bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-400 uppercase tracking-widest border border-indigo-500/20">
              {item.location}
            </span>
          )}
        </div>
      </div>

      {/* COLUMN 4: EXPIRY DATE */}
      <div className="flex flex-col gap-1">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Vencimiento</span>
        <span className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          {item.expiryDateObj ? format(item.expiryDateObj, 'dd/MM/yyyy') : 'N/A'}
        </span>
      </div>

      {/* COLUMN 5: WITHDRAWAL DATE */}
      <div className="flex flex-col gap-1">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Retiro</span>
        <span className={`text-sm font-black ${
          item.status === 'withdrawal' ? 'text-indigo-400' : 'text-slate-400'
        }`}>
          {item.withdrawalDate ? format(item.withdrawalDate, 'dd/MM/yyyy') : 'N/A'}
        </span>
      </div>

      {/* COLUMN 6: STATUS & ACTION */}
      <div className={`flex items-center gap-6 pl-6 border-l ${
        theme === 'dark' ? 'border-white/5' : 'border-slate-100'
      }`}>
        <div className="text-right flex-1 min-w-[80px]">
          <div className={`text-xl font-black leading-none ${
            item.status === 'expired' ? 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 
            item.status === 'critical' ? 'text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
            item.status === 'withdrawal' ? 'text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]' :
            item.status === 'next_expiry' ? 'text-blue-500' :
            'text-emerald-500'
          }`}>
            {item.status === 'expired' ? 'VENCIDO' : 
             item.status === 'critical' ? `${item.daysLeft}D` :
             item.status === 'withdrawal' ? 'RETIRO' :
             item.status === 'next_expiry' ? 'PRÓX' :
             'OK'}
          </div>
          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1.5">
            {item.status === 'next_expiry' ? 'PRÓXIMO' : 
             item.status === 'withdrawal' ? 'CANJE' :
             item.status === 'critical' ? 'CRÍTICO' : 'VIGENTE'}
          </div>
        </div>

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
};
