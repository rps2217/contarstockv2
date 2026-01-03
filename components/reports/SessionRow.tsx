
import React from 'react';
import { Truck, Cloud, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { CountingSession } from '../../types';

export const SessionRow = ({ index, style, data }: { index: number; style: React.CSSProperties; data: { sessions: CountingSession[]; onSelect: (id: string) => void; activeMenuId: string | null; onMenuToggle: (e: any, id: string) => void; onDelete: (e: any, id: string) => void } }) => {
    const session = data.sessions[index];
    const { onSelect, activeMenuId, onMenuToggle, onDelete } = data;

    return (
        <div style={style} className="px-4 py-2">
            <div 
                onClick={() => onSelect(session.id)}
                className={`bg-white border-2 rounded-3xl h-full flex items-center px-6 gap-5 transition-all active:scale-[0.98] shadow-sm ${session.lastSyncTimestamp ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200 hover:border-blue-400'}`}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                         <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{new Date(session.createdAt).toLocaleDateString()}</span>
                         {session.lastSyncTimestamp && <Cloud className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase truncate tracking-tight">{session.erpOrder}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase truncate mt-1">
                        <Truck className="w-4 h-4 text-blue-600" /> <span className="bg-slate-100 px-2 py-0.5 rounded">{session.logisticsLabel}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">{session.totalUnits || 0}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UNID.</div>
                    </div>
                    
                    <div className="h-10 w-0.5 bg-slate-100"></div>

                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onMenuToggle(e, session.id); }}
                            className="p-3 text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 rounded-xl"
                        >
                            <MoreVertical className="w-6 h-6" />
                        </button>
                        
                        {activeMenuId === session.id && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={(e) => onMenuToggle(e, '')}></div>
                                <div className="absolute right-0 top-14 w-40 bg-white rounded-2xl shadow-2xl border-2 border-slate-100 z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDelete(e, session.id); }}
                                        className="w-full text-left px-5 py-4 text-xs text-rose-700 hover:bg-rose-50 font-black uppercase flex items-center gap-3"
                                    >
                                        <Trash2 className="w-5 h-5" /> Eliminar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <ChevronRight className="w-6 h-6 text-slate-300" />
                </div>
            </div>
        </div>
    );
};
