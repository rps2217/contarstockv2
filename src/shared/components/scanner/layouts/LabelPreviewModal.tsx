/**
 * LabelPreviewModal - Modal para previsualizar etiqueta física
 */

import React, { useState } from 'react';
import { Box } from 'lucide-react';

interface LabelPreviewModalProps {
  labelPhoto?: string;
  onClose: () => void;
}

export const LabelPreviewModal: React.FC<LabelPreviewModalProps> = ({
  labelPhoto,
  onClose,
}) => {
  if (!labelPhoto) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in">
      <div className="w-full max-w-lg bg-surface rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-elevated">
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Etiqueta Física</h3>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/5 rounded-full text-muted hover:text-white transition-colors"
          >
            <Box className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <div className="aspect-video bg-black">
          <img src={labelPhoto} alt="Label" className="w-full h-full object-contain" />
        </div>
        <div className="p-4 bg-elevated text-center">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-white text-black font-black uppercase text-[10px] rounded-xl"
          >
            Cerrar Vista
          </button>
        </div>
      </div>
    </div>
  );
};
