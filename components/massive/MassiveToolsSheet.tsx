
import React from 'react';
import { Barcode, RotateCcw, Download, X, MapPin, Printer } from 'lucide-react';
import { Modal } from '../common/Modal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    hasActiveItem: boolean;
    location: string;
    onChangeLocation: () => void;
    onShowLabel: () => void;
    onReset: () => void;
    onImport: () => void;
    onPrintSummary: () => void;
}

export const MassiveToolsSheet: React.FC<Props> = ({ 
    isOpen, onClose, hasActiveItem, location, onChangeLocation, onShowLabel, onReset, onImport, onPrintSummary 
}) => {
    
    const ToolButton = ({ onClick, icon: Icon, label, color, disabled = false, sublabel }: any) => (
        <button
            disabled={disabled}
            onClick={() => { onClick(); onClose(); }}
            className={`flex flex-col items-center justify-center p-6 bg-slate-900 rounded-[2rem] border-2 border-white/5 active:scale-95 transition-all disabled:opacity-20 ${color}`}
        >
            <Icon className="w-8 h-8 mb-3" />
            <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{label}</span>
            {sublabel && (
                <span className="text-[8px] font-bold opacity-60 mt-1 uppercase tracking-tight truncate w-full px-2 text-center">
                    {sublabel}
                </span>
            )}
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
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Acciones de Auditoría</h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Modo Martillo v4.5</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ToolButton 
                        onClick={onPrintSummary} 
                        icon={Printer} 
                        label="Imprimir Resumen" 
                        color="text-emerald-400 border-emerald-500/20" 
                    />
                    <ToolButton 
                        disabled={!hasActiveItem}
                        onClick={onShowLabel} 
                        icon={Barcode} 
                        label="Etiqueta SKU" 
                        color="text-indigo-400 border-indigo-500/20" 
                    />
                    <ToolButton 
                        onClick={onChangeLocation} 
                        icon={MapPin} 
                        label="Ubicación" 
                        sublabel={location}
                        color="text-blue-400 border-blue-500/20" 
                    />
                    <ToolButton 
                        onClick={onImport} 
                        icon={Download} 
                        label="Cargar Teórico" 
                        color="text-amber-400 border-amber-500/20" 
                    />
                    <ToolButton 
                        onClick={onReset} 
                        icon={RotateCcw} 
                        label="Vaciar Todo" 
                        color="text-rose-500 border-rose-500/20" 
                    />
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">LogiCount Pro Hardware-Link</p>
                </div>
            </div>
        </Modal>
    );
};
