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
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-rose-700 px-4 py-3 flex items-center justify-center gap-2">
          <Box className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-lg tracking-wide uppercase">Cantidad</span>
        </div>
        
        {/* Body */}
        <div className="p-8 flex flex-col items-center gap-6 bg-slate-600">
          <button 
            onClick={() => setEditQty(q => q + 1)}
            className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center active:bg-slate-300 transition-colors shadow-inner"
          >
            <Plus className="w-8 h-8 text-rose-600" />
          </button>
          
          <div className="w-full border-b-2 border-rose-600 text-center pb-2">
            <span className="text-5xl font-mono text-white">{editQty}</span>
          </div>
          
          <button 
            onClick={() => setEditQty(q => Math.max(0, q - 1))}
            className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center active:bg-slate-300 transition-colors shadow-inner"
          >
            <Minus className="w-8 h-8 text-rose-600" />
          </button>
        </div>
        
        {/* Footer */}
        <div className="p-4 flex gap-3 bg-slate-600">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-white text-black font-bold rounded-xl active:bg-gray-200 transition-colors text-sm tracking-wider"
          >
            CANCEL
          </button>
          <button 
            onClick={onSave}
            className="flex-1 py-3 bg-rose-800 text-white font-bold rounded-xl active:bg-rose-900 transition-colors text-sm tracking-wider"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
};
