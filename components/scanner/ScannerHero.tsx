
import React, { memo } from 'react';
import { RotateCcw, AlertCircle, CheckCircle, Target, Minus, Plus, Calendar } from 'lucide-react';
import { ScanRecord, Product, ExpectedItem } from '../../types';
import { ScannerFeedback } from '../../hooks/useScanner';
import { determineItemStatus, getStatusColorClasses } from '../../services/uiLogic';

interface ScannerHeroProps {
    lastScan: ScanRecord | undefined;
    activeProduct: Product | undefined;
    accumulatedQty: number;
    feedback: ScannerFeedback;
    onRegisterPending: () => void;
    expectedItem?: ExpectedItem | null;
    onDecrement?: () => void;
    onIncrement?: () => void;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, 
    activeProduct, 
    accumulatedQty,
    feedback, 
    onRegisterPending,
    expectedItem,
    onDecrement,
    onIncrement
}) => {
    if (feedback === 'undo') {
        return (
            <div className="flex flex-col items-center animate-in zoom-in duration-500">
                <div className="p-12 bg-slate-900 rounded-full mb-8 border-4 border-white/5">
                    <RotateCcw className="w-20 h-20 text-slate-500" />
                </div>
                <h2 className="text-3xl font-black text-slate-500 uppercase tracking-[0.4em]">Deshecho</h2>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.category === 'POR_CLASIFICAR' || activeProduct.name.startsWith('PENDIENTE');
        const displayName = activeProduct?.name || 'SKU_DESCONOCIDO';
        const targetQty = expectedItem?.expectedQty;
        
        // Usar lógica de colores industrial
        const status = determineItemStatus(accumulatedQty, targetQty);
        const bgClass = getStatusColorClasses(status, 'bg');

        return (
            <div className={`w-full h-full flex flex-col relative transition-colors duration-300 ${bgClass}`}>
                {/* Overlay de Brillo para Feedback */}
                <div className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-200 ${feedback === 'success' ? 'opacity-20 bg-white' : 'opacity-0'}`} />

                <div className="flex-1 flex items-stretch relative z-10">
                    {/* BOTÓN DECREMENTAR (Estilo Martillo) */}
                    <button 
                        onPointerDown={(e) => { e.preventDefault(); onDecrement?.(); }}
                        className="w-20 md:w-32 bg-black/10 active:bg-black/30 flex items-center justify-center border-r border-white/5 transition-all"
                    >
                        <Minus className="w-10 h-10 text-white/30 active:text-white" />
                    </button>

                    {/* DISPLAY CENTRAL GIGANTE */}
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                        <div className="mb-4 w-full">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-white/40 font-mono text-[10px] font-black tracking-[0.3em] uppercase truncate">
                                    {lastScan.barcode}
                                </span>
                                {lastScan.mm && (
                                    <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/10 text-blue-300 text-[8px] font-black uppercase">
                                        <Calendar className="w-2.5 h-2.5" /> {lastScan.mm}/{lastScan.yyyy}
                                    </div>
                                )}
                            </div>
                            <h1 className="text-white font-black text-lg md:text-2xl uppercase tracking-tight line-clamp-2 leading-none">
                                {displayName}
                            </h1>
                        </div>

                        <div className="relative">
                            <div className="text-[10rem] md:text-[14rem] leading-none font-black tabular-nums tracking-tighter drop-shadow-2xl">
                                {accumulatedQty}
                            </div>
                            
                            {targetQty !== undefined && (
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/20 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap flex items-center gap-2">
                                    Meta: {targetQty}
                                    {accumulatedQty >= targetQty && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                </div>
                            )}
                        </div>

                        {/* Barra de Progreso Individual (Si hay meta) */}
                        {targetQty !== undefined && targetQty > 0 && (
                            <div className="w-full max-w-xs h-1.5 bg-black/20 rounded-full mt-12 overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-white/40 transition-all duration-700 ease-out"
                                    style={{ width: `${Math.min(100, (accumulatedQty / targetQty) * 100)}%` }}
                                />
                            </div>
                        )}
                    </div>

                    {/* BOTÓN INCREMENTAR (Estilo Martillo) */}
                    <button 
                        onPointerDown={(e) => { e.preventDefault(); onIncrement?.(); }}
                        className="w-20 md:w-32 bg-black/10 active:bg-black/30 flex items-center justify-center border-l border-white/5 transition-all"
                    >
                        <Plus className="w-10 h-10 text-white/30 active:text-white" />
                    </button>
                </div>

                {isUnknown && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-full max-w-xs animate-in zoom-in duration-300">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center border-4 border-orange-500">
                            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                            <h3 className="text-slate-900 font-black uppercase text-sm mb-6">SKU No Registrado</h3>
                            <button onClick={onRegisterPending} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]">Asignar Nombre</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 opacity-20">
            <Target className="w-32 h-32 mb-8 text-white animate-pulse" />
            <h2 className="text-3xl font-black uppercase tracking-[0.5em] text-white">Láser_Listo</h2>
        </div>
    );
});
