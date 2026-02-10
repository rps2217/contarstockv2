
import React from 'react';
import { Barcode, RotateCcw, Download, X, MapPin, Printer, ChevronRight, FileSpreadsheet } from 'lucide-react';
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
    
    const ToolButton = ({ onClick, icon: Icon, label, color, disabled = false, sublabel, variant = "default" }: any) => (
        <button
            disabled={disabled}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={`
                w-full flex items-center gap-5 p-6 rounded-[2rem] border-2 transition-all active:scale-[0.97] disabled:opacity-20
                ${variant === "danger" ? 'bg-rose-950/20 border-rose-500/40 text-rose-500' : 'bg-slate-900 border-white/5 text-white'}
                hover:bg-slate-800
            `}
        >
            <div className={`p-4 rounded-2xl bg-black/40 ${color} shadow-inner`}>
                <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 text-left">
                <div className="text-xs font-black uppercase tracking-widest leading-none mb-1.5">{label}</div>
                {sublabel && <div className="text-[9px] font-bold opacity-40 uppercase tracking-tight italic">{sublabel}</div>}
            </div>
            <ChevronRight className="w-5 h-5 opacity-20" />
        </button>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            variant="bottom-sheet" 
            className="bg-black border-t-8 border-slate-900 overflow-visible"
            showCloseButton={false}
        >
            {/* Barra de Arrastre Visual */}
            <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mt-4 mb-2"></div>

            <div className="p-8 pb-12 bg-black text-white">
                <div className="flex justify-between items-center mb-10 px-2">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Acciones Martillo</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Industrial_Tools_Kernel_v4</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-full text-slate-400 active:bg-rose-600 active:text-white transition-all shadow-lg">
                        <X className="w-7 h-7" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <ToolButton 
                        onClick={() => { onChangeLocation(); onClose(); }} 
                        icon={MapPin} 
                        label="Cambiar Ubicación" 
                        sublabel={`Actual: ${location || 'SIN_DEFINIR'}`}
                        color="text-blue-400" 
                    />
                    
                    <ToolButton 
                        onClick={() => { onImport(); onClose(); }} 
                        icon={Download} 
                        label="Descargar Stock Teórico" 
                        sublabel="Sincronizar Guía desde Cloud"
                        color="text-amber-400" 
                    />

                    <ToolButton 
                        disabled={!hasActiveItem}
                        onClick={() => { onShowLabel(); onClose(); }} 
                        icon={Barcode} 
                        label="Generar Etiqueta SKU" 
                        sublabel="Código 128 para Lector Láser"
                        color="text-indigo-400" 
                    />

                    <ToolButton 
                        onClick={() => { onPrintSummary(); onClose(); }} 
                        icon={Printer} 
                        label="Imprimir Manifiesto" 
                        sublabel="Exportar discrepancias a PDF"
                        color="text-emerald-400" 
                    />

                    <div className="pt-6 mt-2 border-t border-white/5">
                        <ToolButton 
                            onClick={() => { onReset(); onClose(); }} 
                            icon={RotateCcw} 
                            label="Vaciar Todo el Lote" 
                            sublabel="Resetear conteos de esta sesión"
                            variant="danger"
                            color="text-rose-500" 
                        />
                    </div>
                </div>
                
                <div className="mt-8 text-center opacity-20">
                    <p className="text-[8px] font-black text-white uppercase tracking-[0.5em]">LogiCount Pro Hardware-Bridge</p>
                </div>
            </div>
        </Modal>
    );
};
