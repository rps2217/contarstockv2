
import React, { memo } from 'react';
import { Truck, Cloud, MoreVertical, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

export const SessionRow = memo(({ index, style, data }: any) => {
    const session = data.sessions[index];
    if (!session) return null;
    
    const { onSelect, activeMenuId, onMenuToggle, onDelete } = data;

    const isCertified = session.auditStatus === 'verified';
    const hasIssues = session.auditStatus === 'failed';

    return (
        <div style={style} className="px-4 py-2">
            <div 
                onClick={() => onSelect(session.id)}
                className={`bg-white dark:bg-slate-900 border-4 rounded-[2.5rem] h-full flex items-center px-6 gap-5 transition-all active:scale-[0.98] shadow-md relative overflow-hidden group ${isCertified ? 'border-emerald-500 bg-emerald-50/30' : (hasIssues ? 'border-rose-500' : 'border-black dark:border-white/10')}`}
            >
                {/* Indicador sutil de fondo para certificados */}
                {isCertified && <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><ShieldCheck className="w-32 h-32 text-emerald-900" /></div>}

                <div className="flex-1 min-w-0 z-10">
                    <div className="flex items-center gap-3 mb-1">
                         <span className="text-[9px] font-black text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded uppercase tracking-widest">{new Date(session.createdAt).toLocaleDateString()}</span>
                         {session.lastSyncTimestamp && <Cloud className="w-4 h-4 text-blue-500" />}
                         {isCertified && (
                             <span className="flex items-center gap-1 bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">
                                 <ShieldCheck className="w-3 h-3" /> Certificado
                             </span>
                         )}
                         {hasIssues && (
                             <span className="flex items-center gap-1 bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                                 <AlertCircle className="w-3 h-3" /> Discrepancia
                             </span>
                         )}
                    </div>
                    <h3 className="text-2xl font-black text-black dark:text-white uppercase truncate tracking-tight leading-none mb-1">{session.erpOrder}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase truncate">
                        <Truck className="w-3.5 h-3.5" /> <span className="opacity-80">{session.logisticsLabel}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 z-10">
                    <div className="text-right">
                        <div className="text-4xl font-black text-black dark:text-white tabular-nums tracking-tighter leading-none">{session.totalUnits || 0}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">U.</div>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMenuToggle(e, session.id); }}
                        className="p-3 bg-slate-100 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl active:bg-slate-200"
                    >
                        <MoreVertical className="w-6 h-6 text-black dark:text-white" />
                    </button>
                    
                    {activeMenuId === session.id && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={(e) => onMenuToggle(e, '')}></div>
                            <div className="absolute right-4 top-14 w-56 bg-white dark:bg-slate-800 border-4 border-black dark:border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in zoom-in-95">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(e, session.id); }}
                                    className="w-full text-left px-6 py-6 text-xs text-red-700 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/20 font-black uppercase flex items-center gap-4 transition-colors"
                                >
                                    <div className="p-2 bg-rose-50 dark:bg-rose-900/40 rounded-xl"><Trash2 className="w-5 h-5" /></div>
                                    ELIMINAR REGISTRO
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    return prev.index === next.index && 
           prev.data.sessions[prev.index]?.id === next.data.sessions[next.index]?.id &&
           prev.data.activeMenuId === next.data.activeMenuId &&
           prev.data.sessions[prev.index]?.totalUnits === next.data.sessions[next.index]?.totalUnits &&
           prev.data.sessions[prev.index]?.auditStatus === next.data.sessions[next.index]?.auditStatus;
});
