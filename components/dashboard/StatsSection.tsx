
import React from 'react';
import { Calendar, PackageCheck, WifiOff } from 'lucide-react';

interface Props {
 stats: { bultos: number, units: number, pendingSync: number };
}

export const StatsSection: React.FC<Props> = ({ stats }) => {
 return (
 <div className="space-y-6 mb-8 animate-in slide-in-from-top-4">
 <div className="grid grid-cols-3 gap-2 md:gap-4">
 <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
 <div className="text-slate-400 mb-1 md:mb-2"><Calendar className="w-5 h-5 md:w-6 md:h-6" /></div>
 <div className="text-xl md:text-3xl font-black text-slate-900">{stats.bultos}</div>
 <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide">Bultos Hoy</div>
 </div>
 <div className="bg-white p-3 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
 <div className="text-blue-500 mb-1 md:mb-2"><PackageCheck className="w-5 h-5 md:w-6 md:h-6" /></div>
 <div className="text-xl md:text-3xl font-black text-blue-600">{stats.units}</div>
 <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide">Unidades</div>
 </div>
 <div className={`p-3 md:p-5 rounded-2xl shadow-sm border flex flex-col items-center justify-center text-center transition-colors ${stats.pendingSync > 0 ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
 <div className={stats.pendingSync > 0 ? 'text-orange-500 mb-1 md:mb-2' : 'text-emerald-500 mb-1 md:mb-2'}><WifiOff className="w-5 h-5 md:w-6 md:h-6" /></div>
 <div className={`text-xl md:text-3xl font-black ${stats.pendingSync > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{stats.pendingSync}</div>
 <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide">Pendientes</div>
 </div>
 </div>
 </div>
 );
};
