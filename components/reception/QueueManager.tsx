
import React from 'react';
import { List, Box, Trash2, X, Archive } from 'lucide-react';
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
 className="md:max-w-lg bg-slate-950 h-[85vh] md:h-[80vh] border-t-4 border-white/10"
 showCloseButton={false}
 >
 {/* Header Oscuro */}
 <div className="p-6 border-b border-white/10 bg-slate-900 sticky top-0 z-10 flex justify-between items-center">
 <div>
 <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase italic tracking-tight">
 <List className="w-6 h-6 text-blue-500" /> Cola de Recepción
 </h2>
 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 pl-9">
 {drafts.length} Bultos Pendientes
 </p>
 </div>
 <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Lista Oscura */}
 <div className="p-4 space-y-3 pb-32 bg-slate-950 min-h-full">
 {drafts.length === 0 ? (
 <div className="text-center py-20 flex flex-col items-center opacity-30">
 <Archive className="w-20 h-20 mb-6 text-slate-500" />
 <p className="font-black text-white uppercase tracking-[0.3em] text-sm">Cola Vacía</p>
 <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Escanee etiquetas para comenzar</p>
 </div>
 ) : (
 drafts.map((draft, idx) => (
 <div key={draft.id} className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center group border border-white/5 shadow-lg active:scale-[0.98] transition-all">
 <div className="flex items-center gap-4 min-w-0">
 <div className="bg-blue-900/30 text-blue-400 border border-blue-500/30 w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 font-mono">
 {drafts.length - idx}
 </div>
 <div className="min-w-0 flex-1">
 <div className="font-mono font-black text-white truncate text-base uppercase tracking-wider">{draft.logisticsLabel}</div>
 <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-2">
 <span>{new Date(draft.createdAt).toLocaleTimeString()}</span>
 <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
 <span className="text-blue-500">BORRADOR</span>
 </div>
 </div>
 </div>
 <button 
 onClick={() => onDelete(draft.id)} 
 className="p-3 text-slate-500 hover:text-rose-500 hover:bg-rose-900/20 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
 >
 <Trash2 className="w-5 h-5" />
 </button>
 </div>
 ))
 )}
 </div>

 {/* Footer de Acciones */}
 <div className="p-6 border-t border-white/10 bg-slate-900 absolute bottom-0 left-0 right-0 z-20 pb-safe-area flex gap-3">
 <button 
 onClick={onDiscardAll} 
 disabled={drafts.length === 0} 
 className="flex-1 bg-rose-900/20 text-rose-500 hover:bg-rose-900/40 border border-rose-900/50 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:pointer-events-none"
 >
 Vaciar Todo
 </button>
 <button 
 onClick={onClose} 
 className="flex-[2] bg-white text-black hover:bg-slate-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl"
 >
 Volver a Escanear
 </button>
 </div>
 </Modal>
 );
};
