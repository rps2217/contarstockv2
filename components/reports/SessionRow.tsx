
import React from 'react';
import { Truck, Cloud, ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { CountingSession } from '../../types';

// Fix: Broadened props type to 'any' to resolve strict type checking errors when used in .map() in Reports.tsx
export const SessionRow = ({ index, style, data }: any) => {
    const session = data.sessions[index];
    const { onSelect, activeMenuId, onMenuToggle, onDelete } = data;

    return (
        <div style={style} className="px-4 py-2">
            <div 
                onClick={() => onSelect(session.id)}
                className={`bg-white border-4 rounded-[2rem] h-full flex items-center px-6 gap-5 transition-all active:scale-[0.98] shadow-md ${session.lastSyncTimestamp ? 'border-emerald-500 bg-emerald-50' : 'border-black'}`}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                         <span className="text-[10px] font-black text-slate-700 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-widest">{new Date(session.createdAt).toLocaleDateString()}</span>
                         {session.lastSyncTimestamp && <Cloud className="w-5 h-5 text-emerald-600" />}
                    </div>
                    <h3 className="text-2xl font-black text-black uppercase truncate tracking-tight leading-none">{session.erpOrder}</h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase truncate mt-2">
                        <Truck className="w-4 h-4" /> <span className="bg-blue-100 px-2 py-1 rounded border border-blue-200">{session.logisticsLabel}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                        <div className="text-4xl font-black text-black tabular-nums">{session.totalUnits || 0}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">UNID.</div>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMenuToggle(e, session.id); }}
                        className="p-3 bg-slate-100 border-2 border-slate-300 rounded-xl active:bg-slate-200"
                    >
                        <MoreVertical className="w-6 h-6 text-black" />
                    </button>
                    
                    {activeMenuId === session.id && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={(e) => onMenuToggle(e, '')}></div>
                            <div className="absolute right-4 top-14 w-48 bg-white border-4 border-black rounded-2xl shadow-2xl z-50 overflow-hidden">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(e, session.id); }}
                                    className="w-full text-left px-5 py-5 text-xs text-red-700 hover:bg-red-50 font-black uppercase flex items-center gap-3"
                                >
                                    <Trash2 className="w-6 h-6" /> ELIMINAR REGISTRO
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
