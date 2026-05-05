import React from 'react';
import { Minus, Plus, Box } from 'lucide-react';
import { ScannedItemProps } from './ScannedItemRow';

interface EditQuantityModalProps {
  editingItem: ScannedItemProps | null;
  editQty: number;
  setEditQty: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onSave: () => void;
}

export const EditQuantityModal: React.FC<EditQuantityModalProps> = ({
  editingItem,
  editQty,
  setEditQty,
  onClose,
  onSave
}) => {
  if (!editingItem) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl border-2 border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-rose-600 px-4 py-3 flex items-center justify-center gap-2 border-b-2 border-rose-700">
          <Box className="w-5 h-5 text-white" />
          <span className="text-white font-black text-lg tracking-widest uppercase">Cantidad</span>
        </div>
        
        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-4 bg-slate-800">
          <button 
            onClick={() => setEditQty(q => q + 1)}
            className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center active:bg-emerald-500/30 active:scale-95 transition-all"
          >
            <Plus className="w-8 h-8 text-emerald-400" />
          </button>
          
          <div className="w-full bg-black/40 rounded-2xl py-4 border-2 border-slate-700 text-center shadow-inner">
            <span className="text-5xl font-mono font-black text-white tracking-tighter">{editQty}</span>
          </div>
          
          <button 
            onClick={() => setEditQty(q => Math.max(0, q - 1))}
            className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center active:bg-rose-500/30 active:scale-95 transition-all"
          >
            <Minus className="w-8 h-8 text-rose-400" />
          </button>
        </div>
        
        {/* Footer */}
        <div className="p-4 flex gap-3 bg-slate-900 border-t-2 border-slate-800">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-slate-700 text-white font-black rounded-xl active:bg-slate-600 active:scale-95 transition-all text-sm tracking-widest"
          >
            CANCELAR
          </button>
          <button 
            onClick={onSave}
            className="flex-1 py-3 bg-rose-600 text-white font-black rounded-xl active:bg-rose-700 active:scale-95 transition-all text-sm tracking-widest"
          >
            GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
};

