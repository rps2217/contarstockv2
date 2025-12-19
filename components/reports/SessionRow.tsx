
import React from 'react';
import { Calendar, MoreVertical, Trash2, Truck, Cloud, ShieldCheck, AlertTriangle } from 'lucide-react';
import { CountingSession } from '../../types';

export const SessionRow = ({ index, style, data }: { index: number; style: React.CSSProperties; data: { sessions: CountingSession[]; onSelect: (id: string) => void; activeMenuId: string | null; onMenuToggle: (e: any, id: string) => void; onDelete: (e: any, id: string) => void } }) => {
    const session = data.sessions[index];
    const { onSelect, activeMenuId, onMenuToggle, onDelete } = data;

    let AuditIcon = null;
    if (session.auditStatus === 'verified') AuditIcon = <ShieldCheck className="w-3 h-3 text-emerald-600" />;
    else if (session.auditStatus === 'warning') AuditIcon = <AlertTriangle className="w-3 h-3 text-amber-500" />;

    return (
        <div style={style} className="px-1 py-2">
            <div className={`bg-white rounded-2xl shadow-sm border transition-shadow relative z-0 h-full flex flex-col ${session.lastSyncTimestamp ? 'border-green-200' : 'border-slate-200 hover:shadow-md'}`}>
                <div className="p-4 flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <Calendar className="w-3 h-3" /> {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                            {session.auditStatus && <div className={`p-1 rounded-full ${session.auditStatus === 'verified' ? 'bg-emerald-100' : 'bg-amber-100'}`}>{AuditIcon}</div>}
                            {session.lastSyncTimestamp && <div className="bg-green-100 text-green-700 p-1 rounded-full"><Cloud className="w-3 h-3" /></div>}
                            <div className="relative">
                                <button type="button" onClick={(e) => onMenuToggle(e, session.id)} className="p-1.5 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><MoreVertical className="w-4 h-4" /></button>
                                {activeMenuId === session.id && (
                                    <>
                                        <div className="fixed inset-0 z-40 bg-transparent" onClick={(e) => onMenuToggle(e, '')}></div>
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                            <button type="button" onClick={(e) => onDelete(e, session.id)} className="w-full text-left px-4 py-3 text-xs text-red-600 hover:bg-red-50 font-bold flex items-center gap-2"><Trash2 className="w-3 h-3" /> Eliminar</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight line-clamp-1">{session.erpOrder}</h3>
                    <div className="flex items-center gap-2 mb-1"><Truck className="w-3 h-3 text-slate-400" /><span className="text-xs text-slate-600 truncate">{session.logisticsLabel}</span></div>
                </div>
                <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
                    <div className="text-xs text-slate-700">Total: <span className="font-bold">{session.totalUnits || 0}</span></div>
                    <button onClick={() => onSelect(session.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm">Ver</button>
                </div>
            </div>
        </div>
    );
};
