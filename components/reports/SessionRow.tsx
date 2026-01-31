
import React, { memo } from 'react';
import { Truck, Cloud, MoreVertical, Trash2, ShieldCheck, AlertCircle, Zap, Package } from 'lucide-react';

export const SessionRow = memo(({ index, style, data }: any) => {
    const session = data.items[index];
    if (!session) return null;
    
    const { onSelect, activeMenuId, onMenuToggle, onDelete } = data;
    const isHammer = session.sessionType === 'hammer';
    const isCertified = session.auditStatus === 'verified';
    const hasIssues = session.auditStatus === 'failed';

    return (
        <div style={style} className="px-4 py-2">
            <div 
                onClick={() => onSelect(session.id)}
                className={`bg-white dark:bg-slate-900 border-2 rounded-[2rem] h-full flex items-center px-6 gap-5 transition-all active:scale-[0.98] shadow-sm relative overflow-hidden ${isCertified ? 'border-emerald-500/30 bg-emerald-50/5' : (hasIssues ? 'border-rose-500/30 bg-rose-50/5' : 'border-slate-100 dark:border-white/5')}`}
            >
                {/* INDICADOR LATERAL DE FIRMA OPERATIVA */}
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${isHammer ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} />

                <div className="flex-1 min-w-0 py-3">
                    <div className="flex items-center gap-2 mb-2">
                         <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${isHammer ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                            {isHammer ? <Zap className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                            {isHammer ? 'Modo Martillo' : 'Nueva Carga'}
                         </div>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{new Date(session.createdAt).toLocaleDateString()}</span>
                         {session.lastSyncTimestamp && <Cloud className="w-4 h-4 text-blue-500 animate-pulse" />}
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase truncate tracking-tight leading-none mb-1">
                        {session.erpOrder}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                        <Truck className="w-3.5 h-3.5" /> 
                        <span className="tracking-widest truncate">{session.logisticsLabel}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                        <div className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter leading-none">{session.totalUnits || 0}</div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">U. Totales</div>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMenuToggle(e, session.id); }}
                        className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-2xl active:bg-slate-100 transition-colors"
                    >
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                    </button>
                    
                    {activeMenuId === session.id && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={(e) => onMenuToggle(e, '')}></div>
                            <div className="absolute right-4 top-16 w-56 bg-white dark:bg-slate-800 border-2 border-black rounded-3xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(e, session.id); }}
                                    className="w-full text-left px-6 py-6 text-[11px] text-rose-600 font-black uppercase flex items-center gap-4 hover:bg-rose-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" /> Eliminar Bulto
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});
