
import React from 'react';
import { Package, Zap, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
 group: any;
 uiStatus: 'idle' | 'uploading' | 'success' | 'error';
}

export const SyncGroupCard: React.FC<Props> = ({ group, uiStatus }) => {
 const isOrphan = group.erpOrder === 'REGISTROS_HUERFANOS';
 
 return (
 <div className={`bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 shadow-sm flex justify-between items-center transition-all ${isOrphan ? 'border-amber-200 bg-amber-50/30' : (group.isHammer ? 'border-blue-100 dark:border-blue-900/30' : 'border-slate-100 dark:border-white/5')}`}>
 <div className="flex items-center gap-5">
 <div className={`p-4 rounded-2xl ${uiStatus === 'success' ? 'bg-emerald-100 text-emerald-600' : (isOrphan ? 'bg-amber-500 text-white' : (group.isHammer ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'))}`}>
 {isOrphan ? <AlertCircle className="w-6 h-6" /> : (group.isHammer ? <Zap className="w-6 h-6" /> : <Package className="w-6 h-6" />)}
 </div>
 <div>
 <div className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
 {isOrphan ? 'Registros Residuales' : group.erpOrder}
 {group.isHammer && !isOrphan && <span className="text-[7px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">Martillo</span>}
 </div>
 <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">
 {isOrphan ? 'Picks sin bulto asignado' : `${group.sessionCount} Bultos`} • {group.totalUnits} Unidades
 </div>
 </div>
 </div>
 <div>
 {uiStatus === 'uploading' ? (
 <Loader2 className="animate-spin text-blue-600 w-6 h-6" />
 ) : uiStatus === 'success' ? (
 <CheckCircle2 className="text-emerald-500 w-8 h-8" />
 ) : (
 <div className={`w-3 h-3 rounded-full animate-pulse ${isOrphan ? 'bg-amber-500' : (group.isHammer ? 'bg-blue-500' : 'bg-slate-300')}`}></div>
 )}
 </div>
 </div>
 );
};
