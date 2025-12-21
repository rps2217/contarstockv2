
import React from 'react';
import { Calendar, MoreVertical, Trash2, Truck, Cloud, ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react';
import { CountingSession } from '../../types';

export const SessionRow = ({ index, style, data }: { index: number; style: React.CSSProperties; data: { sessions: CountingSession[]; onSelect: (id: string) => void; activeMenuId: string | null; onMenuToggle: (e: any, id: string) => void; onDelete: (e: any, id: string) => void } }) => {
    const session = data.sessions[index];
    const { onSelect, activeMenuId, onMenuToggle, onDelete } = data;

    return (
        <div style={style} className="px-4 py-1.5">
            <div 
                onClick={() => onSelect(session.id)}
                className={`bg-white border rounded-2xl h-full flex items-center px-4 gap-4 transition-all active:scale-[0.98] ${session.lastSyncTimestamp ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 hover:border-blue-200'}`}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(session.createdAt).toLocaleDateString()}</span>
                         {session.lastSyncTimestamp && <Cloud className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase truncate tracking-tight">{session.erpOrder}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase truncate opacity-70">
                        <Truck className="w-3 h-3" /> {session.logisticsLabel}
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                        <div className="text-sm font-black text-slate-900">{session.totalUnits || 0}</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unid.</div>
                    </div>
                    
                    <div className="h-8 w-px bg-slate-100"></div>

                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onMenuToggle(e, session.id); }}
                            className="p-2 text-slate-300 hover:text-slate-900 transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {activeMenuId === session.id && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={(e) => onMenuToggle(e, '')}></div>
                                <div className="absolute right-0 top-10 w-32 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDelete(e, session.id); }}
                                        className="w-full text-left px-4 py-3 text-[10px] text-rose-600 hover:bg-rose-50 font-black uppercase flex items-center gap-2"
                                    >
                                        <Trash2 className="w-3 h-3" /> Eliminar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-slate-200" />
                </div>
            </div>
        </div>
    );
};
