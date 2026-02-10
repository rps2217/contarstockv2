
import React from 'react';
import { Printer, FileText, X } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { IndustrialButton } from '../../../components/common/IndustrialButton';

interface BarcodeLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    barcode: string;
    productName?: string;
    quantity?: number;
    meta?: string;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({ 
    isOpen, onClose, barcode, productName, quantity, meta 
}) => {
    
    const handlePrintThermal = () => {
        alert("Integración térmica Sewoo activada.");
        // Aquí iría el llamado al thermalPrinterService
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} variant="center" className="max-w-sm w-[92vw] overflow-hidden rounded-[2.5rem]">
            <div className="bg-white text-black p-6 flex flex-col items-center">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all z-20">
                    <X className="w-5 h-5" />
                </button>

                <div className="w-full mt-6 mb-8 flex flex-col items-center justify-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-6 italic">Link_Hardware_Active</div>
                    
                    <div className="w-full bg-white flex items-center justify-center py-10 px-2 border-2 border-slate-100 rounded-3xl shadow-inner overflow-hidden">
                        <div className="barcode-font select-none whitespace-nowrap text-center transform-gpu">
                            {barcode}
                        </div>
                    </div>

                    <div className="mt-6 text-2xl font-black tracking-[0.2em] font-mono text-slate-900 break-all text-center px-4">
                        {barcode}
                    </div>
                </div>

                <div className="w-full space-y-4 border-t border-slate-100 pt-6">
                    {productName && (
                        <div className="text-center px-2">
                            <h3 className="text-xs font-black uppercase leading-tight text-slate-400 line-clamp-2 italic">
                                {productName}
                            </h3>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contenido</span>
                            <span className="text-lg font-black text-slate-900">{quantity || 0} <span className="text-[10px]">UNIDADES</span></span>
                        </div>
                        {meta && (
                            <div className="text-right flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Referencia</span>
                                <span className="text-[10px] font-bold text-blue-600 truncate max-w-[120px]">{meta}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full mt-6 grid grid-cols-1 gap-2">
                    <IndustrialButton onClick={handlePrintThermal} variant="primary" icon={Printer} fullWidth>
                        Impresora Térmica
                    </IndustrialButton>
                    <div className="grid grid-cols-2 gap-2">
                         <IndustrialButton onClick={() => {}} variant="black" icon={FileText} fullWidth className="h-12 text-[10px]">
                             Exportar PDF
                         </IndustrialButton>
                        <button onClick={onClose} className="h-12 bg-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl active:bg-slate-200 transition-colors">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
            
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
                .barcode-font { 
                    font-family: 'Libre Barcode 128', cursive;
                    line-height: 1;
                    color: black;
                    font-size: clamp(60px, 18vw, 100px); 
                    letter-spacing: 0;
                }
            `}</style>
        </Modal>
    );
};
