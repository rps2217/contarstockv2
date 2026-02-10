
import React, { useState } from 'react';
import { Printer, FileText, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { IndustrialButton } from '../../../components/common/IndustrialButton';
import { thermalPrinter } from '../../../services/thermalPrinterService';

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
    const [isPrinting, setIsPrinting] = useState(false);
    const [printStatus, setPrintStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handlePrintThermal = async () => {
        setIsPrinting(true);
        setPrintStatus('idle');
        try {
            // Intento de reconexión automática si se perdió
            if (!thermalPrinter.isConnected()) {
                const connected = await thermalPrinter.connectBluetooth();
                if (!connected) {
                    // Fallback a USB si Bluetooth falla
                    const usbConnected = await thermalPrinter.connectUSB();
                    if (!usbConnected) throw new Error("No se detectó impresora Sewoo/Zebra.");
                }
            }

            await thermalPrinter.printLabel(
                barcode, 
                productName || 'PRODUCTO SIN DESCRIPCIÓN', 
                quantity || 1
            );
            
            setPrintStatus('success');
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
            
            // Cerrar feedback automáticamente tras 2s
            setTimeout(() => setPrintStatus('idle'), 2000);

        } catch (e: any) {
            console.error(e);
            setPrintStatus('error');
            alert(e.message || "Error de comunicación con la impresora");
        } finally {
            setIsPrinting(false);
        }
    };

    const handlePrintBrowser = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Habilite ventanas emergentes para imprimir PDF.");
            return;
        }

        const html = `
            <html>
            <head>
                <title>Etiqueta ${barcode}</title>
                <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&family=Inter:wght@700&display=swap" rel="stylesheet">
                <style>
                    body { margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; }
                    .label { border: 4px solid black; padding: 40px; border-radius: 20px; text-align: center; max-width: 500px; width: 100%; }
                    .barcode { font-family: 'Libre Barcode 128', cursive; font-size: 100px; line-height: 1; margin: 20px 0; }
                    .sku { font-size: 40px; font-weight: 900; letter-spacing: 0.1em; }
                    .name { font-size: 20px; margin-bottom: 20px; text-transform: uppercase; line-height: 1.2; }
                    .meta { font-size: 16px; border-top: 2px dashed #ccc; margin-top: 20px; padding-top: 10px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="label">
                    <div class="sku">${barcode}</div>
                    <div class="barcode">${barcode}</div>
                    <div class="name">${productName || ''}</div>
                    <div class="sku">CANT: ${quantity || 1}</div>
                    ${meta ? `<div class="meta">${meta}</div>` : ''}
                </div>
                <script>
                    window.onload = () => { window.print(); window.onafterprint = () => window.close(); }
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} variant="center" className="max-w-sm w-[92vw] overflow-hidden rounded-[2.5rem]">
            <div className="bg-white text-black p-6 flex flex-col items-center relative">
                
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all z-20">
                    <X className="w-5 h-5" />
                </button>

                {/* AREA VISUAL DE ETIQUETA */}
                <div className="w-full mt-6 mb-8 flex flex-col items-center justify-center relative">
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-6 italic">
                        Preview
                    </div>
                    
                    <div className="w-full bg-white flex items-center justify-center py-10 px-2 border-4 border-slate-900 rounded-3xl shadow-2xl overflow-hidden relative">
                        {/* Estado de impresión superpuesto */}
                        {printStatus === 'success' && (
                            <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center animate-in fade-in zoom-in">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-2" />
                                <span className="text-emerald-700 font-black uppercase text-xs tracking-widest">Impreso</span>
                            </div>
                        )}
                        {printStatus === 'error' && (
                            <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center animate-in fade-in zoom-in">
                                <AlertTriangle className="w-16 h-16 text-rose-500 mb-2" />
                                <span className="text-rose-700 font-black uppercase text-xs tracking-widest">Error</span>
                            </div>
                        )}

                        <div className="barcode-font select-none whitespace-nowrap text-center transform-gpu scale-125">
                            {barcode}
                        </div>
                    </div>

                    <div className="mt-6 text-3xl font-black tracking-[0.2em] font-mono text-slate-900 break-all text-center px-4">
                        {barcode}
                    </div>
                </div>

                {/* DETALLES */}
                <div className="w-full space-y-4 border-t border-slate-100 pt-6">
                    {productName && (
                        <div className="text-center px-2">
                            <h3 className="text-xs font-black uppercase leading-tight text-slate-500 line-clamp-2">
                                {productName}
                            </h3>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cantidad</span>
                            <span className="text-2xl font-black text-slate-900 tabular-nums">{quantity || 0}</span>
                        </div>
                        {meta && (
                            <div className="text-right flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ref</span>
                                <span className="text-[10px] font-bold text-blue-600 truncate max-w-[120px]">{meta}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ACCIONES */}
                <div className="w-full mt-8 grid grid-cols-1 gap-3">
                    <IndustrialButton 
                        onClick={handlePrintThermal} 
                        isLoading={isPrinting} 
                        variant="primary" 
                        icon={Printer} 
                        fullWidth
                        className="h-16 text-sm bg-slate-900 hover:bg-black"
                    >
                        Imprimir Etiqueta
                    </IndustrialButton>
                    
                    <div className="grid grid-cols-2 gap-3">
                         <IndustrialButton 
                            onClick={handlePrintBrowser} 
                            variant="outline" 
                            icon={FileText} 
                            fullWidth 
                            className="h-14 text-[10px]"
                        >
                             PDF / A4
                         </IndustrialButton>
                        <button 
                            onClick={onClose} 
                            className="h-14 bg-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl active:bg-slate-200 transition-colors"
                        >
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
                    font-size: 60px;
                }
            `}</style>
        </Modal>
    );
};
