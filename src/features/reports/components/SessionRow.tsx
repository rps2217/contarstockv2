import React, { memo } from 'react';
import { Truck, Cloud, MoreVertical, Trash2, Layers, ShieldCheck, AlertCircle, Camera } from 'lucide-react';

export const SessionRow = memo(({ index, style, data }: any) => {
  const session = data.items[index];
  if (!session) return null;

  const { onSelect, activeMenuId, onMenuToggle, onDelete, erpCounts, theme = 'dark' } = data;
  const erpCount = erpCounts ? erpCounts[session.erpOrder] || 0 : 0;
  const isMultiBulto = erpCount > 1;

  // Lógica de Veredicto de Auditoría
  const isVerified = session.auditStatus === 'verified' || (session.totalUnits > 0 && session.lastSyncTimestamp);
  const hasIssues = session.auditStatus === 'failed';

  // Clases según tema
  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  const containerBg = isHighContrast ? 'bg-black' : isLight ? 'bg-white' : 'bg-brand-surface';
  const containerBorder = isHighContrast ? 'border-yellow-400' : isLight ? (isMultiBulto ? 'border-indigo-100' : 'border-slate-100') : (isMultiBulto ? 'border-brand-info/30' : 'border-white/5');
  
  const textPrimary = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const textSecondary = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-600' : 'text-muted';
  
  const badgeVerified = isHighContrast ? 'bg-yellow-400 text-black' : isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400';
  const badgeIssue = isHighContrast ? 'bg-red-500 text-white' : isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/10 text-rose-400';
  const badgePending = isHighContrast ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-400' : isLight ? 'bg-blue-50 text-blue-600' : 'bg-brand-info/10 text-brand-info';
  
  const badgeMulti = isHighContrast ? 'bg-yellow-400 text-black' : isLight ? 'bg-indigo-600 text-white' : 'bg-brand-info text-black';
  
  const syncIcon = isHighContrast ? 'text-yellow-400' : isLight ? 'text-blue-500' : 'text-brand-info';
  
  const headerBg = isHighContrast ? 'bg-yellow-950/30' : isLight ? 'bg-slate-50' : 'bg-brand-dark/50';
  
  const menuBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-black' : 'bg-brand-surface border-white/10';
  const menuHover = isHighContrast ? 'hover:bg-yellow-900/20' : isLight ? 'hover:bg-rose-50' : 'hover:bg-white/5';

  return (
    <div style={style} className="px-4 py-2">
      <div 
        onClick={() => onSelect(session.id)}
        className={`border-4 rounded-[2.5rem] h-full flex items-center px-6 gap-5 transition-all active:scale-[0.98] shadow-sm relative ${containerBg} ${containerBorder}`}
      >
        {/* INDICADOR LATERAL OPERATIVO DINÁMICO */}
        <div className={`absolute left-0 top-0 bottom-0 w-2.5 rounded-l-[2.5rem] ${hasIssues ? 'bg-rose-500' : isVerified ? 'bg-emerald-500' : (isHighContrast ? 'bg-yellow-400' : 'bg-brand-info')}`} />
	
        <div className="flex-1 min-w-0 py-4">
          <div className="flex items-center gap-2 mb-2">
            {/* Badge de Estado de Auditoría */}
            {isVerified ? (
              <div className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${badgeVerified}`}>
                <ShieldCheck className="w-3 h-3" /> Certificado
              </div>
            ) : hasIssues ? (
              <div className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${badgeIssue}`}>
                <AlertCircle className="w-3 h-3" /> Discrepancia
              </div>
            ) : (
              <div className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${badgePending}`}>
                En Proceso
              </div>
            )}
            
            {isMultiBulto && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest shadow-lg ${badgeMulti}`}>
                <Layers className="w-3 h-3" /> Agrupado ({erpCount})
              </div>
            )}

            <div className="flex items-center gap-1.5 ml-1">
              {session.lastSyncTimestamp && <Cloud className={`w-4 h-4 ${syncIcon}`} />}
              {session.photoUrl && <Camera className="w-4 h-4 text-emerald-500" />}
            </div>
          </div>
          
          <h3 className={`text-2xl font-black uppercase truncate tracking-tighter leading-none mb-1 ${textPrimary}`}>
            {session.erpOrder}
          </h3>
          
          <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${textSecondary}`}>
            <Truck className="w-3.5 h-3.5" /> 
            <span className="truncate">{session.logisticsLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className={`text-4xl font-black tabular-nums tracking-tighter leading-none ${textPrimary}`}>
              {session.totalUnits || 0}
            </div>
            <div className={`text-[9px] font-black uppercase tracking-widest mt-1 italic ${textSecondary}`}>Picks</div>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onMenuToggle(e, session.id); }}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors ${headerBg} ${textSecondary}`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {activeMenuId === session.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => onMenuToggle(e, '')}></div>
              <div className={`absolute right-4 top-16 w-56 border-2 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150 ${menuBg}`}>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(e, session.id); }}
                  className={`w-full text-left px-6 py-6 text-[11px] font-black uppercase flex items-center gap-4 transition-colors ${isHighContrast ? 'text-yellow-400' : 'text-rose-600'} ${menuHover}`}
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
