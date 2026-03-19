
import React from 'react';
import { Lock, Unlock, X, Trash2, Cloud, Printer } from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isAutoLockEnabled: boolean;
  onToggleAutoLock: () => void;
  onDiscardAll: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const ReceptionToolsSheet: React.FC<Props> = ({ 
  isOpen, onClose, isAutoLockEnabled, onToggleAutoLock, onDiscardAll, onSync, isSyncing 
}) => {
  
  const ToolButton = ({ onClick, icon: Icon, label, color, disabled = false, loading = false }: any) => (
    <button
      disabled={disabled || loading}
      onClick={() => { onClick(); if(!loading) onClose(); }}
      className={`flex flex-col items-center justify-center p-4 bg-slate-900 rounded-2xl border border-white/5 active:scale-95 transition-all disabled:opacity-20 ${color}`}
    >
      <Icon className={`w-6 h-6 mb-2 ${loading ? 'animate-spin' : ''}`} />
      <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">{loading ? 'Sincronizando...' : label}</span>
    </button>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      variant="bottom-sheet" 
      className="bg-black border-t-2 border-slate-800"
      showCloseButton={false}
    >
      <div className="p-6 pb-8 bg-black text-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Herramientas</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Recepción de Bultos v2.1</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ToolButton 
            onClick={onToggleAutoLock} 
            icon={isAutoLockEnabled ? Lock : Unlock} 
            label={isAutoLockEnabled ? "Auto-Bloqueo ON" : "Auto-Bloqueo OFF"} 
            color={isAutoLockEnabled ? "text-blue-400 border-blue-500/20" : "text-slate-400 border-slate-500/20"} 
          />
          <ToolButton 
            onClick={onSync} 
            icon={Cloud} 
            label="Sincronizar Nube" 
            color="text-blue-400 border-blue-500/20" 
            loading={isSyncing}
          />
          <ToolButton 
            onClick={() => {}} 
            icon={Printer} 
            label="Imprimir Resumen" 
            color="text-emerald-400 border-emerald-500/20" 
          />
          <ToolButton 
            onClick={onDiscardAll} 
            icon={Trash2} 
            label="Vaciar Todo" 
            color="text-rose-500 border-rose-500/20" 
          />
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">LogiCount Pro Reception-Link</p>
        </div>
      </div>
    </Modal>
  );
};
