/**
 * EventFormHeader - Header del formulario de eventos
 */

import React from 'react';
import { X, FileText, Plus } from 'lucide-react';

interface Props {
  isEditing: boolean;
  onClose: () => void;
  theme: 'dark' | 'light' | 'high-contrast';
}

export const EventFormHeader: React.FC<Props> = ({ isEditing, onClose, theme }) => {
  return (
    <div className="bg-black p-6 flex items-center justify-between border-b-4 border-black shrink-0">
      <div className="flex items-center gap-4">
        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
          {isEditing ? <FileText className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
        </div>
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">
            {isEditing ? 'Editar Registro' : 'Nuevo Registro'}
          </h2>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Gestión de Eventos Críticos</p>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </button>
    </div>
  );
};
