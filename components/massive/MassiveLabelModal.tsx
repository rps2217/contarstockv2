
import React from 'react';
import { Printer, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { IndustrialButton } from '../common/IndustrialButton';
import { ConsolidatedBlindItem } from '../../hooks/useMassiveScanner';

interface Props {
 isOpen: boolean;
 onClose: () => void;
 item: ConsolidatedBlindItem | null;
 isPrinting: boolean;
 onPrintThermal: () => void;
 onPrintPDF: () => void;
}

export const MassiveLabelModal: React.FC<Props> = ({ isOpen, onClose, item, isPrinting, onPrintThermal, onPrintPDF }) => {
 return (
 <Modal isOpen={isOpen} onClose={onClose} title="Generador de Etiqueta" variant="center" className="max-w-md w-[95vw]">
 <div className="p-4 text-center flex flex-col items-center">
 <div className="w-full bg-white text-black p-4 py-8 rounded-[1.5rem] border-[4px] border-slate-900 mb-6 shadow-2xl relative flex flex-col items-center justify-center overflow-hidden">
 <div className="text-[8px] font-black uppercase tracking-[0.4em] mb-4 text-slate-300">LOGICOUNT SYSTEM v4.5</div>
 <div className="text-sm font-bold uppercase leading-tight mb-4 px-2 w-full break-words max-h-12 overflow-hidden text-center">{item?.name}</div>
 
 <div className="w-full bg-white py-4 flex items-center justify-center overflow-hidden min-h-[140px] border-y border-slate-100 mb-4">
 <div className="barcode-font text-[100px] leading-none select-none tracking-tight whitespace-nowrap px-6 border-x-8 border-transparent scale-[1.0] transform-gpu">
 {item?.barcode}
 </div>
 </div>
 
 <div className="text-3xl font-black tracking-[0.35em] font-mono text-center">{item?.barcode}</div>
 <div className="mt-6 text-[9px] font-black text-slate-300 uppercase tracking-widest border-t border-slate-50 pt-2 w-full">
 Registro Interno: {item?.totalQuantity} U.
 </div>
 </div>
 
 <div className="grid grid-cols-1 gap-3 w-full px-2">
 <IndustrialButton onClick={onPrintThermal} isLoading={isPrinting} variant="primary" icon={Printer} fullWidth>
 Impresión Térmica
 </IndustrialButton>
 <div className="grid grid-cols-2 gap-2">
 <IndustrialButton onClick={onPrintPDF} variant="black" icon={FileText} fullWidth className="h-12 text-[10px]">
 PDF A4
 </IndustrialButton>
 <button onClick={onClose} className="bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-[0.1em] rounded-2xl active:bg-slate-200 transition-colors">
 Cerrar
 </button>
 </div>
 </div>
 </div>
 <style>{`.barcode-font { font-size: min(25vw, 100px); display: inline-block; width: auto; max-width: 100%; }`}</style>
 </Modal>
 );
};
