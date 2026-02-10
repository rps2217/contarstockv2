
import React from 'react';
import { Barcode, Trash2, Box, X, MapPin, Printer } from 'lucide-react';
import { Modal } from '../common/Modal';
import { IndustrialActionCard } from '../../shared/components/ui/IndustrialActionCard';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    hasActiveItem: boolean;
    location: string;
    label: string;
    onChangeLocation: () => void;
    onChangeLabel: () => void;
    onShowLabel: () => void;
    onReset: () => void;
    onPrintSummary: () => void;
}

export const ScannerToolsSheet: React.FC<Props> = ({ 
    isOpen, onClose, hasActiveItem, location, label, 
    onChangeLocation, onChangeLabel, onShowLabel, onReset, onPrintSummary
}) => {
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            variant="bottom-sheet" 
            className="bg-black border-t-8 border-slate-900"
            showCloseButton={false}
        >
            <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mt-4 mb-2"></div>
            
            <div className="p-8 pb-12 bg-black text-white">
                <div className="flex justify-between items-center mb-8 px-2">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">Utilidades</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Gestión de Carga Actual</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-full text-slate-400 active:bg-rose-600 active:text-white transition-all shadow-lg">
                        <X className="w-7 h-7" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <IndustrialActionCard 
                        onClick={onChangeLocation}
                        icon={MapPin}
                        label="Set Ubicación"
                        sublabel={location}
                        color="text-blue-400"
                    />

                    <IndustrialActionCard 
                        onClick={onChangeLabel}
                        icon={Box}
                        label="Cambiar Bulto"
                        sublabel={label}
                        color="text-indigo-400"
                    />

                    <IndustrialActionCard 
                        onClick={onPrintSummary}
                        icon={Printer}
                        label="Imprimir Resumen"
                        color="text-emerald-400"
                    />

                    <IndustrialActionCard 
                        onClick={onShowLabel}
                        icon={Barcode}
                        label="Etiqueta SKU"
                        disabled={!hasActiveItem}
                        color="text-amber-400"
                    />

                    <div className="pt-6 mt-2 border-t border-white/5">
                        <IndustrialActionCard 
                            onClick={onReset}
                            icon={Trash2}
                            label="Vaciar Bulto"
                            variant="danger"
                            color="text-rose-500"
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};
