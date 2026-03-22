
import React from 'react';
import { AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2 } from 'lucide-react';

interface ExpiryStatsProps {
  stats: {
    expired: number;
    critical: number;
    withdrawal: number;
    next_expiry: number;
    total: number;
  };
}

export const ExpiryStats: React.FC<ExpiryStatsProps> = ({ stats }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-2">
        <AlertTriangle className="w-3 h-3 text-rose-500" />
        <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">{stats.expired} Vencidos</span>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-2">
        <ShieldAlert className="w-3 h-3 text-amber-500" />
        <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">{stats.critical} Críticos</span>
      </div>
      <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full flex items-center gap-2">
        <Download className="w-3 h-3 text-indigo-500" />
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{stats.withdrawal} Retiros</span>
      </div>
      <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full flex items-center gap-2">
        <Clock className="w-3 h-3 text-blue-500" />
        <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{stats.next_expiry} Próx</span>
      </div>
      <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-2">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">{stats.total - stats.expired - stats.critical - stats.next_expiry - stats.withdrawal} Vigentes</span>
      </div>
    </div>
  );
};
