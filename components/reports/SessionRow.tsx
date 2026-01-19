
import React, { memo } from 'react';
import { Truck, Cloud, MoreVertical, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

export const SessionRow = memo(({ index, style, data }: any) => {
    const session = data.sessions[index];
    if (!session) return null;
    
    const { onSelect, activeMenuId, onMenuToggle, onDelete } = data;
    const isCertified = session.auditStatus === 'verified';
    const hasIssues = session.auditStatus === 'failed';

    return (
        <div style={style} className="px-4 py-1.5">
            <div 
                onClick={() => onSelect(session.id)}
                className={`bg-white dark:bg-slate-900 border-2 rounded-[1.8rem] h-full flex items-center px-5 gap-4 transition-all active:scale-[0.98] shadow-sm relative overflow-hidden ${isCertified ? 'border-emerald-400/50 bg-emerald-50/20' : (hasIssues ? 'border-rose-400/50' : 'border-slate-100 dark:border-white/5')}`}
            >
                <div className="flex-1 min-w-0 py-2">
                    <div className="flex items-center gap-2 mb-1.5">
                         <span className="text-[10px] font-black text-slate-500 bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-white/10 uppercase tracking-widest">
                            {new Date(session.createdAt).toLocaleDateString()}
                         </span>
                         {session.lastSyncTimestamp && <Cloud className="w-4 h-4 text-blue-500" />}
                         {isCertified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <h3 className="text-xl font-black text-black dark:text-white uppercase truncate tracking-tight leading-tight">
                        {session.erpOrder}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase mt-1">
                        <Truck className="w-3.5 h-3.5" /> <span className="tracking-widest truncate">{session.logisticsLabel}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                        <div className="text-3xl font-black text-black dark:text-white tabular-nums tracking-tighter leading-none">{session.totalUnits || 0}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">U.</div>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMenuToggle(e, session.id); }}
                        className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-xl active:bg-slate-100 transition-colors"
                    >
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                    </button>
                    
                    {activeMenuId === session.id && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={(e) => onMenuToggle(e, '')}></div>
                            <div className="absolute right-4 top-14 w-56 bg-white dark:bg-slate-800 border-2 border-black rounded-2xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(e, session.id); }}
                                    className="w-full text-left px-5 py-5 text-[11px] text-rose-600 font-black uppercase flex items-center gap-3 hover:bg-rose-50"
                                >
                                    <Trash2 className="w-4 h-4" /> ELIMINAR REGISTRO
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});
