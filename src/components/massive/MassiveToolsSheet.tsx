
import React from 'react';
import { Barcode, RotateCcw, Download, X, MapPin, Printer, ChevronRight } from 'lucide-react';
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
                w-full flex items-center gap-4 p-5 rounded-[1.8rem] border-2 transition-all active:scale-[0.97] disabled:opacity-20
                ${variant === "danger" ? 'bg-rose-950/20 border-rose-500/30 text-rose-500' : 'bg-slate-900 border-white/5 text-white'}
                hover:bg-slate-800
            `}
        >
            <div className={`p-3 rounded-xl bg-black/40 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
                <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{label}</div>
                {sublabel && <div className="text-[8px] font-bold opacity-40 uppercase tracking-tight">{sublabel}</div>}
            </div>
            <ChevronRight className="w-4 h-4 opacity-20" />
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
            {/* Barra de Arrastre */}
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mt-4 mb-2"></div>

            <div className="p-6 pb-12 bg-black text-white">
                <div className="flex justify-between items-center mb-8 px-2">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-white">Auditoría Pro</h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Herramientas_V4</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-slate-400 active:bg-rose-600 active:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <ToolButton 
                        onClick={onChangeLocation} 
                        icon={MapPin} 
                        label="Cambiar Ubicación" 
                        sublabel={`Actual: ${location}`}
                        color="text-blue-400" 
                    />
                    
                    <ToolButton 
                        onClick={onImport} 
                        icon={Download} 
                        label="Cargar Stock Teórico" 
                        sublabel="Sincronizar con Google Sheets"
                        color="text-amber-400" 
                    />

                    <ToolButton 
                        disabled={!hasActiveItem}
                        onClick={onShowLabel} 
                        icon={Barcode} 
                        label="Imprimir Etiqueta SKU" 
                        sublabel="Generar código 128"
                        color="text-indigo-400" 
                    />

                    <ToolButton 
                        onClick={onPrintSummary} 
                        icon={Printer} 
                        label="Resumen de Auditoría" 
                        sublabel="Exportar PDF de discrepancias"
                        color="text-emerald-400" 
                    />

                    <div className="pt-4 mt-2 border-t border-white/5">
                        <ToolButton 
                            onClick={onReset} 
                            icon={RotateCcw} 
                            label="Resetear Todo el Lote" 
                            sublabel="Borrado permanente de la sesión"
                            variant="danger"
                            color="text-rose-500" 
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};
