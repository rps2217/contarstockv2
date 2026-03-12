
import React, { memo } from 'react';
import { RotateCcw, CheckCircle, Minus, Plus, Target, Package, Brain, ShieldAlert, Zap, Link } from 'lucide-react';
import { ScanRecord, Product, ExpectedItem, MatchResult } from '../../types';
import { FeedbackStatus } from '../../hooks/useFeedbackSystem';
import { determineItemStatus, getStatusColorClasses } from '../../services/uiLogic';

interface ScannerHeroProps {
 lastScan: ScanRecord | undefined;
 activeProduct: Product | undefined;
 accumulatedQty: number;
 feedback: FeedbackStatus;
 onRegisterPending: () => void;
 expectedItem?: ExpectedItem | null;
 onDecrement?: () => void;
 onIncrement?: () => void;
 isDeducing?: boolean;
 proactiveMatch?: MatchResult | null;
 onLinkOrder?: () => void;
 anomaly?: string | null;
}

export const ScannerHero: React.FC<ScannerHeroProps> = memo(({ 
 lastScan, activeProduct, accumulatedQty, feedback, onRegisterPending, expectedItem, 
 onDecrement, onIncrement, isDeducing, proactiveMatch, onLinkOrder, anomaly
}) => {
 
 if (feedback === 'undo') return (
 <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 animate-in zoom-in duration-300">
 <RotateCcw className="w-20 h-20 text-slate-500 mb-4" />
 <h2 className="text-2xl font-black text-slate-500 uppercase tracking-widest">Borrado</h2>
 </div>
 );

 if (isDeducing) return (
 <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
 <Zap className="w-16 h-16 text-blue-500 animate-pulse mb-6" />
 <h2 className="text-xl font-black uppercase tracking-widest text-white animate-pulse">Procesando IA...</h2>
 </div>
 );

 if (lastScan) {
 const isUnknown = !activeProduct || activeProduct.name.startsWith('NUEVO_ITEM');
 const status = determineItemStatus(accumulatedQty, expectedItem?.expectedQty);
 const bgClass = getStatusColorClasses(status, 'bg');

 return (
 <div className={`w-full h-full flex flex-col relative transition-colors duration-300 transform-gpu ${bgClass}`}>
 
 {/* HUD DE ALERTAS INTELIGENTES */}
 <div className="absolute top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
 {proactiveMatch && onLinkOrder && (
 <button 
 onClick={onLinkOrder}
 className="pointer-events-auto bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-500/50 animate-in slide-in-from-top-4 active:scale-95 transition-all"
 >
 <Brain className="w-4 h-4 text-indigo-400 animate-pulse" />
 <div className="text-left">
 <div className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">Deducción IA</div>
 <div className="text-[10px] font-black uppercase leading-none">Vincular ERP: {proactiveMatch.expectedOrder.internalId}</div>
 </div>
 </button>
 )}

 {anomaly && (
 <div className="bg-amber-100 border-2 border-amber-400 text-amber-900 px-4 py-2 rounded-xl flex items-center gap-3 shadow-xl animate-bounce pointer-events-auto">
 <ShieldAlert className="w-5 h-5 text-amber-600" />
 <span className="text-[9px] font-black uppercase leading-tight">{anomaly}</span>
 </div>
 )}
 </div>

 <div className="flex-1 flex items-stretch relative z-10">
 <button onClick={onDecrement} className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-r border-white/5"><Minus className="w-12 h-12 text-white/40" /></button>

 <div className="flex-1 flex flex-col items-center justify-center p-2 text-center overflow-hidden">
 <div className="mb-1 w-full max-w-[90%]">
 <div className="font-mono text-[10px] font-black text-white/50 tracking-widest truncate">{lastScan.barcode}</div>
 <h1 className="text-white font-black text-sm uppercase tracking-tight line-clamp-1 italic">
 {activeProduct?.name || 'REGISTRANDO...'}
 </h1>
 </div>

 <div className="text-[11rem] md:text-[14rem] font-black tabular-nums tracking-tighter drop-shadow-2xl leading-none">
 {accumulatedQty}
 </div>
 
 {expectedItem && (
 <div className="bg-black/40 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10">
 {accumulatedQty >= expectedItem.expectedQty ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Target className="w-3 h-3 text-blue-400" />}
 META: {expectedItem.expectedQty}
 </div>
 )}
 </div>

 <button onClick={onIncrement} className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-l border-white/5"><Plus className="w-12 h-12 text-white/40" /></button>
 </div>

 {isUnknown && (
 <button onClick={onRegisterPending} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white/10 border border-white/20 text-white text-[8px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full active:bg-white active:text-black transition-all">Identificar SKU</button>
 )}
 </div>
 );
 }

 return (
 <div className="h-full w-full flex flex-col items-center justify-center bg-slate-950 opacity-20">
 <Package className="w-16 h-16 mb-4 animate-pulse text-slate-500" />
 <h2 className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-500">Motor_Listo</h2>
 </div>
 );
});
