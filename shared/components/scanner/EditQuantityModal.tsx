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
    <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-rose-600 px-6 py-4 flex items-center justify-center gap-3 border-b-4 border-rose-700">
          <Box className="w-6 h-6 text-white" />
          <span className="text-white font-black text-xl tracking-widest uppercase">Cantidad</span>
        </div>
        
        {/* Body */}
        <div className="p-8 flex flex-col items-center gap-8 bg-slate-800">
          <button 
            onClick={() => setEditQty(q => q + 1)}
            className="w-24 h-24 rounded-full bg-emerald-500/10 border-4 border-emerald-500/50 flex items-center justify-center active:bg-emerald-500/30 active:scale-95 transition-all shadow-lg"
          >
            <Plus className="w-12 h-12 text-emerald-500" />
          </button>
          
          <div className="w-full bg-black/50 rounded-3xl py-6 border-4 border-slate-700 text-center shadow-inner">
            <span className="text-7xl font-mono font-black text-white tracking-tighter">{editQty}</span>
          </div>
          
          <button 
            onClick={() => setEditQty(q => Math.max(0, q - 1))}
            className="w-24 h-24 rounded-full bg-rose-500/10 border-4 border-rose-500/50 flex items-center justify-center active:bg-rose-500/30 active:scale-95 transition-all shadow-lg"
          >
            <Minus className="w-12 h-12 text-rose-500" />
          </button>
        </div>
        
        {/* Footer */}
        <div className="p-6 flex gap-4 bg-slate-900 border-t-4 border-slate-800">
          <button 
            onClick={onClose}
            className="flex-1 py-5 bg-slate-700 text-white font-black rounded-2xl active:bg-slate-600 active:scale-95 transition-all text-lg tracking-widest"
          >
            CANCELAR
          </button>
          <button 
            onClick={onSave}
            className="flex-1 py-5 bg-rose-600 text-white font-black rounded-2xl active:bg-rose-700 active:scale-95 transition-all text-lg tracking-widest shadow-[0_10px_20px_rgba(225,29,72,0.3)]"
          >
            GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
};
