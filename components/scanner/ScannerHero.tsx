
import React, { memo, useEffect, useState } from 'react';
import { RotateCcw, CheckCircle, Minus, Plus, Tag, ShieldAlert, Sparkles, Target, Search, Box } from 'lucide-react';
import { ScanRecord, Product, ExpectedItem } from '../../types';
import { ScannerFeedback } from '../../hooks/useScanner';
import { determineItemStatus, getStatusColorClasses } from '../../services/uiLogic';
import { detectCountAnomalies } from '../../services/aiInsightService';

interface ScannerHeroProps {
    lastScan: ScanRecord | undefined;
    activeProduct: Product | undefined;
    accumulatedQty: number;
    feedback: ScannerFeedback;
    onRegisterPending: () => void;
    expectedItem?: ExpectedItem | null;
    onDecrement?: () => void;
    onIncrement?: () => void;
    isDeducing?: boolean;
    hasOrdersInDb?: boolean | null;
    deducedErp?: string;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
    lastScan, activeProduct, accumulatedQty, feedback, onRegisterPending, expectedItem, onDecrement, onIncrement, isDeducing, hasOrdersInDb, deducedErp
}) => {
    const [aiWarning, setAiWarning] = useState<string | null>(null);

    useEffect(() => {
        if (lastScan && accumulatedQty > 0 && (accumulatedQty % 10 === 0 || (expectedItem && accumulatedQty > expectedItem.expectedQty))) {
            const check = async () => {
                const result = await detectCountAnomalies({
                    barcode: lastScan.barcode,
                    productName: activeProduct?.name || 'Producto',
                    totalQuantity: accumulatedQty,
                    expectedQuantity: expectedItem?.expectedQty,
                    scans: 1
                });
                if (result?.isAnomaly) setAiWarning(result.message);
                else setAiWarning(null);
            };
            check();
        } else {
            setAiWarning(null);
        }
    }, [accumulatedQty, lastScan?.barcode]);

    if (feedback === 'undo') return <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 animate-in zoom-in duration-300"><RotateCcw className="w-20 h-20 text-slate-500 mb-4" /><h2 className="text-2xl font-black text-slate-500">BORRADO</h2></div>;

    // ESTADO DE BÚSQUEDA IA O CIEGO
    if (isDeducing && !expectedItem) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 text-white p-8">
                <div className="relative">
                    <Search className="w-16 h-16 text-orange-500 animate-pulse" />
                    <Sparkles className="w-6 h-6 text-white absolute -top-2 -right-2 animate-bounce" />
                </div>
                <h2 className="text-xl font-black uppercase mt-6 tracking-widest animate-pulse">Analizando Contenido...</h2>
                <p className="text-[10px] text-slate-500 uppercase mt-2 text-center font-bold tracking-widest">Identificando guía ERP por patrón de carga</p>
            </div>
        );
    }

    // SI NO HAY ÚLTIMO SCAN Y NO HAY ÓRDENES, INDICAMOS MODO CIEGO
    if (!lastScan && hasOrdersInDb === false) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 opacity-40">
                <Box className="w-16 h-16 mb-4" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em]">Conteo Ciego Activo</h2>
                <p className="text-[8px] font-bold uppercase mt-2">Sin base de pedidos para comparar</p>
            </div>
        );
    }

    if (lastScan) {
        const isUnknown = !activeProduct || activeProduct.name.startsWith('PHARMA') || activeProduct.name.startsWith('NUEVO_ITEM');
        const status = determineItemStatus(accumulatedQty, expectedItem?.expectedQty);
        const bgClass = getStatusColorClasses(status, 'bg');

        return (
            <div className={`w-full h-full flex flex-col relative transition-colors duration-300 ${bgClass}`}>
                {aiWarning && (
                    <div className="absolute top-4 left-4 right-4 z-50 bg-black/80 backdrop-blur-md border-2 border-amber-500 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-4 shadow-2xl">
                        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-[10px] font-black text-amber-500 uppercase leading-tight">{aiWarning}</div>
                    </div>
                )}

                {deducedErp && deducedErp.includes('BUSCANDO') && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/10 px-4 py-1 rounded-full border border-white/20 text-[7px] font-black text-white/40 uppercase tracking-[0.3em]">
                        {hasOrdersInDb === false ? 'Conteo Libre: Base Cloud Vacía' : 'Escaneo Libre: Pendiente de Identificación'}
                    </div>
                )}

                <div className="flex-1 flex items-stretch relative z-10">
                    <button onClick={onDecrement} className="w-20 md:w-32 bg-black/10 active:bg-black/30 flex items-center justify-center border-r border-white/5 transition-all"><Minus className="w-12 h-12 text-white/30" /></button>

                    <div className="flex-1 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                        <div className="mb-1 w-full max-w-[90%]">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                {lastScan.batch && (
                                    <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1">
                                        <Tag className="w-2 h-2" /> LOTE: {lastScan.batch}
                                    </span>
                                )}
                                <span className="text-white/50 font-mono text-[9px] font-black tracking-widest truncate max-w-[120px]">{lastScan.barcode}</span>
                            </div>
                            <h1 className="text-white font-black text-[11px] md:text-sm uppercase tracking-tight line-clamp-1 leading-none italic">{activeProduct?.name || 'REGISTRANDO...'}</h1>
                        </div>

                        <div className="text-[12rem] md:text-[15rem] leading-none font-black tabular-nums tracking-tighter drop-shadow-2xl transition-transform duration-100 active:scale-95">{accumulatedQty}</div>
                        
                        {expectedItem && (
                            <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10">
                                {accumulatedQty >= expectedItem.expectedQty ? <Sparkles className="w-3 h-3 text-emerald-400" /> : <Target className="w-3 h-3 text-blue-400" />}
                                META: {expectedItem.expectedQty}
                            </div>
                        )}
                    </div>

                    <button onClick={onIncrement} className="w-20 md:w-32 bg-black/10 active:bg-black/30 flex items-center justify-center border-l border-white/5 transition-all"><Plus className="w-12 h-12 text-white/30" /></button>
                </div>
                {isUnknown && <button onClick={onRegisterPending} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white/10 backdrop-blur-md border border-white/20 text-white/60 text-[7px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full active:scale-95">Identificar SKU</button>}
            </div>
        );
    }

    return <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 opacity-20"><Tag className="w-16 h-16 mb-4 animate-pulse" /><h2 className="text-[10px] font-black uppercase tracking-[0.6em]">SCANNER_READY</h2></div>;
});
