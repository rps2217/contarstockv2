
import React from 'react';
import { Package, Zap, AlertCircle, Loader2, CheckCircle2, Database } from 'lucide-react';
import type { SyncUIGroup } from '../hooks/useSyncManager';

interface Props {
  group: SyncUIGroup;
  uiStatus: SyncUIGroup['uiStatus'];
  progress?: string | number;
}

export const SyncGroupCard: React.FC<Props> = ({ group, uiStatus, progress }) => {
  const isOrphan = group.erpOrder === 'REGISTROS_HUERFANOS';
  const isDynamic = group.type === 'dynamic';
  const isHammer = group.sessionType === 'hammer' || group.type === 'inventory';
  const tableName = group.tableName || (group.sessionIds.length > 0 ? `Bulto ${group.sessionIds[0]}` : 'N/A');
  
  return (
    <div className={`bg-white dark:bg-surface md:hover:shadow-md md:hover:scale-[1.01] p-4 md:p-5 rounded-2xl md:rounded-3xl border transition-all ${
      isOrphan ? 'border-amber-200 bg-amber-50/30' : 
      isDynamic ? 'border-indigo-100 dark:border-indigo-900/30' :
      (isHammer ? 'border-blue-100 dark:border-blue-900/30' : 'border-slate-100 dark:border-white/5')
    }`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl shrink-0 ${
          uiStatus === 'success' ? 'bg-emerald-100 text-emerald-600' : 
          isOrphan ? 'bg-amber-500 text-white shadow-amber-500/20 shadow-lg' : 
          isDynamic ? 'bg-indigo-600 text-white shadow-indigo-600/20 shadow-lg' :
          (isHammer ? 'bg-blue-600 text-white shadow-blue-600/20 shadow-lg' : 'bg-slate-100 text-slate-500')
        }`}>
          {isOrphan ? <AlertCircle className="w-5 h-5 md:w-6 md:h-6" /> : 
           isDynamic ? <Database className="w-5 h-5 md:w-6 md:h-6" /> :
           (isHammer ? <Zap className="w-5 h-5 md:w-6 md:h-6" /> : <Package className="w-5 h-5 md:w-6 md:h-6" />)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold md:font-black text-sm md:text-lg text-slate-900 dark:text-white uppercase tracking-tight truncate">
              {isOrphan ? 'Registros Residuales' : group.erpOrder}
            </h3>
            {isHammer && !isOrphan && <span className="shrink-0 text-[8px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">Martillo</span>}
            {isDynamic && <span className="shrink-0 text-[8px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase">Dinámico</span>}
          </div>
          
          <div className="flex items-center text-[10px] md:text-xs text-slate-500 dark:text-muted font-medium uppercase truncate">
            {isOrphan ? 'Picks sin bulto asignado' : 
             isDynamic ? `Tabla: ${tableName}` :
             <span className="flex items-center gap-1.5">
               <span className="font-bold">{group.sessionCount}</span> Bultos
               <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
               <span className="font-bold">{group.totalUnits}</span> Unidades
             </span>
            }
          </div>
          
          {progress && <div className="text-[9px] text-blue-500 font-bold uppercase mt-1.5 truncate">{progress}</div>}
        </div>
        
        <div className="shrink-0 ml-2">
          {uiStatus === 'uploading' ? (
            <Loader2 className="animate-spin text-blue-600 w-5 h-5 md:w-6 md:h-6" />
          ) : uiStatus === 'success' ? (
            <CheckCircle2 className="text-emerald-500 w-6 h-6 md:w-8 md:h-8" />
          ) : (
            <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full animate-pulse ${
              isOrphan ? 'bg-amber-500' : 
              isDynamic ? 'bg-indigo-500' :
              (isHammer ? 'bg-blue-500' : 'bg-slate-300')
            }`}></div>
          )}
        </div>
      </div>
    </div>
  );
};

