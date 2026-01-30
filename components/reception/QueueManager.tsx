import React from 'react';
import { List, Box, Trash2 } from 'lucide-react';
import { CountingSession } from '../../types';
import { Modal } from '../common/Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    drafts: CountingSession[];
    onDelete: (id: string) => void;
    onDiscardAll: () => void;
}

export const QueueManager: React.FC<Props> = ({ isOpen, onClose, drafts, onDelete, onDiscardAll }) => {
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            className="md:max-w-lg bg-slate-50 h-[85vh] md:h-[80vh]"
            showCloseButton={true}
        >
            <div className="p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <List className="w-5 h-5 text-blue-600" /> Cola de Recepción
                </h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Pendientes de sincronización</p>
            </div>

            <div className="p-4 space-y-2 pb-32">
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

            <div className="p-6 border-t border-slate-200 grid grid-cols-2 gap-4 bg-white absolute bottom-0 left-0 right-0 z-20 pb-8 md:pb-6">
                <button onClick={onDiscardAll} disabled={drafts.length === 0} className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">
                    Vaciar Cola
                </button>
                <button onClick={onClose} className="bg-slate-900 text-white hover:bg-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg">
                    Cerrar Panel
                </button>
            </div>
        </Modal>
    );
};