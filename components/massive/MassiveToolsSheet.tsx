
import React from 'react';
import { Lock, Barcode, RotateCcw, Download, X } from 'lucide-react';
import { Modal } from '../common/Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    hasActiveItem: boolean;
    onLock: () => void;
    onShowLabel: () => void;
    onReset: () => void;
    onImport: () => void;
}

export const MassiveToolsSheet: React.FC<Props> = ({ 
    isOpen, onClose, hasActiveItem, onLock, onShowLabel, onReset, onImport 
}) => {
    
    const ToolButton = ({ onClick, icon: Icon, label, color, disabled = false }: any) => (
        <button
            disabled={disabled}
            onClick={() => { onClick(); onClose(); }}
            className={`flex flex-col items-center justify-center p-6 bg-slate-900 rounded-[2rem] border-2 border-white/5 active:scale-95 transition-all disabled:opacity-20 ${color}`}
        >
            <Icon className="w-8 h-8 mb-3" />
            <span className="text-[10px] font-black uppercase tracking-widest text-center">{label}</span>
        </button>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            variant="bottom-sheet" 
            className="bg-black border-t-4 border-slate-800"
            showCloseButton={false}
        >
            <div className="p-8 pb-12 bg-black text-white">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight">Utilidades</h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configuración y Herramientas</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ToolButton 
                        onClick={onLock} 
                        icon={Lock} 
                        label="Bloquear Pantalla" 
                        color="text-amber-400 border-amber-500/20" 
                    />
                    <ToolButton 
                        disabled={!hasActiveItem}
                        onClick={onShowLabel} 
                        icon={Barcode} 
                        label="Imprimir Etiqueta" 
                        color="text-blue-400 border-blue-500/20" 
                    />
                    <ToolButton 
                        onClick={onImport} 
                        icon={Download} 
                        label="Importar Stock Cloud" 
                        color="text-indigo-400 border-indigo-500/20" 
                    />
                    <ToolButton 
                        onClick={onReset} 
                        icon={RotateCcw} 
                        label="Borrar Todo" 
                        color="text-rose-500 border-rose-500/20" 
                    />
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">LogiCount Pro Engine v4.5</p>
                </div>
            </div>
        </Modal>
    );
};
