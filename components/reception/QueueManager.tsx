
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
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-white/10 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-8">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <List className="w-5 h-5 text-blue-500" /> Cola de Recepción
                        </h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Pendientes de sincronización</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                    {drafts.length === 0 ? (
                        <div className="text-center py-20 text-slate-700">
                            <Box className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p className="font-black uppercase tracking-widest text-xs">Vacio</p>
                        </div>
                    ) : (
                        drafts.map((draft, idx) => (
                            <div key={draft.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center group border border-transparent hover:border-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-800 text-slate-500 w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0">
                                        {drafts.length - idx}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-mono font-bold text-white truncate text-sm uppercase tracking-tighter">{draft.logisticsLabel}</div>
                                        <div className="text-[10px] font-bold text-slate-600 uppercase mt-1">{new Date(draft.createdAt).toLocaleTimeString()}</div>
                                    </div>
                                </div>
                                <button onClick={() => onDelete(draft.id)} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-white/5 grid grid-cols-2 gap-4 bg-black/20 rounded-b-[2rem]">
                    <button onClick={onDiscardAll} disabled={drafts.length === 0} className="bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-30">
                        Vaciar Cola
                    </button>
                    <button onClick={onClose} className="bg-slate-800 text-white hover:bg-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
