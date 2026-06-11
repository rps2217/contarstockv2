import React from 'react';
import { 
  ShieldAlert, 
  Download, 
  Trash2, 
  AlertTriangle 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ExpiryItem } from '../hooks/useExpiryDatabase';

interface ExpiryCaptureRowProps {
  item: ExpiryItem;
  onDelete: (id: string) => void;
}

const getDaysUntilExpiry = (mm: number, yyyy: number) => {
  const expiryDate = new Date(yyyy, mm - 1, 1);
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  expiryDate.setDate(0);
  return differenceInDays(expiryDate, new Date());
};

export const ExpiryCaptureRow: React.FC<ExpiryCaptureRowProps> = React.memo(({ 
  item, 
  onDelete 
}) => {
  const isWarning = item.daysLeft <= 90;
  const isExpired = item.daysLeft <= 0;
  const formattedWithdrawalDate = item.withdrawalDate ? format(item.withdrawalDate, 'dd/MM/yyyy') : 'N/A';

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border ${
        isExpired ? 'border-rose-500/30' : isWarning ? 'border-amber-500/20' : 'border-indigo-500/20'
      }`}
    >
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative border ${
          isExpired ? 'bg-rose-500/10 border-rose-500/30' : isWarning ? 'bg-amber-500/5 border-amber-500/30' : 'bg-indigo-500/5 border-indigo-500/30'
        }`}>
          {isExpired ? (
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          ) : isWarning ? (
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          ) : (
            <Download className="w-6 h-6 text-indigo-500" />
          )}
          <div className={`absolute -top-2 -right-2 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            isExpired ? 'bg-rose-500 text-white' : isWarning ? 'bg-amber-500 text-black' : 'bg-indigo-500 text-white'
          }`}>
            {item.daysLeft > 0 ? item.daysLeft : 0}
          </div>
        </div>
        <div className={`mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
          item.syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
          item.syncStatus === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
          'bg-amber-500/10 text-amber-500 border-amber-500/20'
        }`}>
          {item.syncStatus === 'synced' ? 'NUBE' : item.syncStatus === 'error' ? 'ERROR' : 'COLA'}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-white uppercase truncate">
          {item.productName}
        </h3>
        {item.observaciones && (
          <p className="text-[10px] font-bold text-amber-500/80 uppercase italic truncate">
             {item.observaciones}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
            {item.barcode}
          </span>
          <span className="text-slate-500 text-[10px] font-bold uppercase truncate">
            {item.providerName || 'SIN PROVEEDOR'}
          </span>
          {item.withdrawalDays !== undefined && (
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${
              item.hasCanje 
                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' 
                : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
            }`}>
              {item.withdrawalDays}D {item.hasCanje ? 'CANJE' : 'MERMA'}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
          Retiro
        </span>
        <span className={`text-sm font-black mt-0.5 ${isExpired ? 'text-rose-500' : 'text-white'}`}>
          {formattedWithdrawalDate}
        </span>
        <button
          onClick={() => onDelete(item.id)}
          className="mt-2 w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 active:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

ExpiryCaptureRow.displayName = 'ExpiryCaptureRow';
