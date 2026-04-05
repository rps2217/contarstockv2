import React, { memo } from 'react';
import { FileText, ArrowRight, Trash2 } from 'lucide-react';
import { ExpectedOrder } from '../../../types';

interface OrderRowProps {
  order: ExpectedOrder;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const OrderRow = memo(({ order, onClick, onDelete }: OrderRowProps) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onClick(order.id)}
        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 hover:border-blue-500 hover:shadow-md transition-all text-left group active:scale-[0.98]"
      >
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black truncate">{order.id}</h3>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            {order.totalExpectedUnits} unidades esperadas • {order.totalExpectedSKUs} SKUs
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
      </button>
      
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(order.id);
          }}
          className="w-12 h-12 flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl border border-rose-100 dark:border-rose-500/30 active:scale-90 transition-all"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});

OrderRow.displayName = 'OrderRow';

// Forced GitHub sync
