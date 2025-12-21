
import React from 'react';
import { List, X, Box, Trash2 } from 'lucide-react';
import { CountingSession } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    drafts: CountingSession[];
    onDelete: (id: string) => void;
    onDiscardAll: () => void;
}

export const QueueManager: React.FC<Props> = ({ isOpen, onClose, drafts, onDelete, onDiscardAll }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 animate-in fade-in duration-200">
            <div className="bg-slate-50 w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <List className="w-5 h-5 text-blue-600" /> Cola de Recepción
                        </h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Pendientes de sincronización</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar bg-slate-50">
                    {drafts.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <Box className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-xs">Cola Vacía</p>
                        </div>
                    ) : (
                        drafts.map((draft, idx) => (
                            <div key={draft.id} className="bg-white p-4 rounded-2xl flex justify-between items-center group border border-slate-200 shadow-sm transition-all hover:border-blue-300">
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-100 text-slate-500 w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0">
                                        {drafts.length - idx}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-mono font-bold text-slate-900 truncate text-sm uppercase tracking-tighter">{draft.logisticsLabel}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(draft.createdAt).toLocaleTimeString()}</div>
                                    </div>
                                </div>
                                <button onClick={() => onDelete(draft.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 grid grid-cols-2 gap-4 bg-white shrink-0 safe-area-pb">
                    <button onClick={onDiscardAll} disabled={drafts.length === 0} className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">
                        Vaciar Cola
                    </button>
                    <button onClick={onClose} className="bg-slate-900 text-white hover:bg-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg">
                        Cerrar Panel
                    </button>
                </div>
            </div>
        </div>
    );
};
