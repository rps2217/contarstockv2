
import React, { memo } from 'react';
import { Truck, Cloud, MoreVertical, Trash2, Layers, Zap, Package, ShieldCheck, AlertCircle, Camera } from 'lucide-react';

export const SessionRow = memo(({ index, style, data }: any) => {
  const session = data.items[index];
  if (!session) return null;
  
  const { onSelect, activeMenuId, onMenuToggle, onDelete, erpCounts, theme = 'dark' } = data;
  const isHammer = session.sessionType === 'hammer';
  const erpCount = erpCounts ? erpCounts[session.erpOrder] || 0 : 0;
  const isMultiBulto = erpCount > 1;

  // Lógica de Veredicto de Auditoría
  const isVerified = session.auditStatus === 'verified' || (session.totalUnits > 0 && session.lastSyncTimestamp);
  const hasIssues = session.auditStatus === 'failed';

  return (
    <div style={style} className="px-4 py-2">
      <div 
        onClick={() => onSelect(session.id)}
        className={`border-4 rounded-[2.5rem] h-full flex items-center px-6 gap-5 transition-all active:scale-[0.98] shadow-sm relative ${
          theme === 'dark' 
            ? `bg-brand-surface ${isMultiBulto ? 'border-brand-info/30' : 'border-white/5'}` 
            : `bg-white ${isMultiBulto ? 'border-indigo-100' : 'border-slate-100'}`
        }`}
      >
        {/* INDICADOR LATERAL OPERATIVO DINÁMICO */}
        <div className={`absolute left-0 top-0 bottom-0 w-2.5 rounded-l-[2.5rem] ${hasIssues ? 'bg-rose-500' : isVerified ? 'bg-emerald-500' : 'bg-brand-info'}`} />

        <div className="flex-1 min-w-0 py-4">
          <div className="flex items-center gap-2 mb-2">
            {/* Badge de Estado de Auditoría */}
            {isVerified ? (
              <div className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Certificado
              </div>
            ) : hasIssues ? (
              <div className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Discrepancia
              </div>
            ) : (
              <div className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                theme === 'dark' ? 'bg-brand-info/10 text-brand-info' : 'bg-blue-50 text-blue-600'
              }`}>
                En Proceso
              </div>
            )}
            
            {isMultiBulto && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest shadow-lg ${
                theme === 'dark' ? 'bg-brand-info text-black shadow-brand-info/10' : 'bg-indigo-600 text-white shadow-indigo-200'
              }`}>
                <Layers className="w-3 h-3" /> Agrupado ({erpCount})
              </div>
            )}

            <div className="flex items-center gap-1.5 ml-1">
              {session.lastSyncTimestamp && <Cloud className={`w-4 h-4 ${theme === 'dark' ? 'text-brand-info' : 'text-blue-500'}`} />}
              {session.photoUrl && <Camera className="w-4 h-4 text-emerald-500" />}
            </div>
          </div>
          
          <h3 className={`text-2xl font-black uppercase truncate tracking-tighter leading-none mb-1 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            {session.erpOrder}
          </h3>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Truck className="w-3.5 h-3.5" /> 
            <span className="truncate">{session.logisticsLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className={`text-4xl font-black tabular-nums tracking-tighter leading-none ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {session.totalUnits || 0}
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Picks</div>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onMenuToggle(e, session.id); }}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors ${
              theme === 'dark' ? 'bg-brand-dark/50 hover:bg-brand-dark text-slate-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-400'
            }`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {activeMenuId === session.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => onMenuToggle(e, '')}></div>
              <div className={`absolute right-4 top-16 w-56 border-2 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150 ${
                theme === 'dark' ? 'bg-brand-surface border-white/10' : 'bg-white border-black'
              }`}>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(e, session.id); }}
                  className={`w-full text-left px-6 py-6 text-[11px] text-rose-600 font-black uppercase flex items-center gap-4 transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-rose-50'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> Borrar de Local
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

// Forced GitHub sync
