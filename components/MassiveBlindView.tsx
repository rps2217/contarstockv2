
import React, { useState, useRef, memo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Zap, Save, Upload, Database, Camera, Target } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster } from '../services/massiveSync';

// --- VIRTUALIZADOR MOBILE ---
const SmartWindow = ({ items, itemHeight, renderRow: RenderRow, data }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const updateHeight = () => { if (containerRef.current) setContainerHeight(containerRef.current.offsetHeight); };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const onScroll = (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 2);
    const visibleItems = items.slice(startIndex, endIndex);
    const totalHeight = items.length * itemHeight;

    return (
        <div ref={containerRef} onScroll={onScroll} className="h-full w-full overflow-y-auto no-scrollbar relative bg-black">
            <div style={{ height: totalHeight, width: '100%', pointerEvents: 'none' }} />
            <div className="absolute top-0 left-0 w-full" style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
                {visibleItems.map((item: any) => (
                    <div key={item.barcode} style={{ height: itemHeight }}>
                        <RenderRow index={items.indexOf(item)} data={data} />
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- FILA DE HISTORIAL "CLEAN FOCUS" ---
const MassiveItemRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { onSelect, activeBarcode } = data;
    
    const isActive = activeBarcode === item.barcode;
    const hasTarget = item.expectedQty !== undefined;
    const isPerfect = hasTarget && item.totalQuantity === item.expectedQty;

    return (
        <div className="px-3 py-1 h-full">
            <button 
                onClick={() => onSelect(item.barcode)}
                className={`w-full h-full border-2 p-4 rounded-2xl flex items-center justify-between transition-all text-left active:scale-[0.98] ${
                    isActive 
                    ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40' 
                    : isPerfect 
                        ? 'bg-emerald-950/20 border-emerald-500/30' 
                        : 'bg-slate-900/40 border-white/5'
                }`}
            >
                <div className="flex-1 min-w-0 pr-4">
                    <span className={`text-[9px] font-black font-mono tracking-tight block mb-0.5 ${isActive ? 'text-blue-100' : 'text-blue-500'}`}>
                        {item.barcode}
                    </span>
                    <h3 className={`font-bold text-[11px] uppercase truncate leading-none ${isActive ? 'text-white' : 'text-white/70'}`}>
                        {item.name}
                    </h3>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right tabular-nums">
                        <span className={`text-2xl font-black ${isActive ? 'text-white' : 'text-white/90'}`}>{item.totalQuantity}</span>
                        {hasTarget && <span className={`text-[9px] ml-1 font-black ${isActive ? 'text-blue-200' : 'text-white/20'}`}>/ {item.expectedQty}</span>}
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                </div>
            </button>
        </div>
    );
});

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { items, lastScannedItem, isFlash, registerScan, selectItem, removeItemCompletely } = useMassiveScanner(batchId || 'CORE');
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDecrement = useCallback((item: ConsolidatedBlindItem) => {
        if (item.totalQuantity <= 1) {
            if (confirm(`¿Eliminar SKU ${item.barcode}?`)) removeItemCompletely(item.barcode);
        } else {
            registerScan(item.barcode, -1);
        }
    }, [registerScan, removeItemCompletely]);

    const handleFinalize = async () => {
        if (!items.length) return;
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId || 'CORE');
            navigate('/dashboard');
        } catch (e: any) { alert(e.message); }
        finally { setIsMigrating(false); }
    };

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-black select-none overflow-hidden text-white">
            
            {/* HEADER SUPERIOR */}
            <header className="h-14 px-4 flex items-center justify-between border-b-2 border-white/5 bg-slate-900/50 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600"><ChevronLeft className="w-6 h-6" /></button>
                    <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate max-w-[120px]">{batchId}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-amber-600"><Upload className="w-4 h-4 text-white/60" /></button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={() => {}} />
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-14 h-10 bg-blue-600 rounded-xl active:scale-95 flex items-center justify-center shadow-lg shadow-blue-900/40">
                        {isMigrating ? <Zap className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* HUD DINÁMICO (ZONA ÚNICA DE CONTROL) */}
            <div className="h-[40vh] bg-[#050505] relative flex flex-col overflow-hidden border-b-2 border-white/5 shrink-0">
                <div className="w-full h-full flex items-center justify-between">
                    {lastScannedItem ? (
                        <>
                            {/* PAD MENOS (LADO IZQUIERDO) */}
                            <button 
                                onPointerDown={(e) => { e.preventDefault(); handleDecrement(lastScannedItem); }}
                                className="w-1/4 h-full bg-rose-600/5 active:bg-rose-600 flex items-center justify-center transition-colors border-r border-white/5"
                            >
                                <Minus className="w-14 h-14 text-rose-500 active:text-white" />
                            </button>

                            {/* DISPLAY CENTRAL */}
                            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center pointer-events-none">
                                <div className="bg-blue-600/20 px-4 py-1 rounded-full mb-3">
                                    <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase">EN_FOCO</span>
                                </div>
                                <h2 className="text-white font-black text-sm md:text-lg uppercase truncate w-full mb-1">{lastScannedItem.name}</h2>
                                <span className="text-blue-500 font-mono text-[10px] font-black tracking-widest mb-6">{lastScannedItem.barcode}</span>
                                
                                <div className="relative">
                                    <div className="text-[11rem] font-black tabular-nums leading-none drop-shadow-[0_0_35px_rgba(59,130,246,0.3)]">
                                        {lastScannedItem.totalQuantity}
                                    </div>
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-white/20 tracking-[0.5em] whitespace-nowrap italic">QTY_MANAGEMENT</div>
                                </div>
                            </div>

                            {/* PAD MAS (LADO DERECHO) */}
                            <button 
                                onPointerDown={(e) => { e.preventDefault(); registerScan(lastScannedItem.barcode, 1); }}
                                className="w-1/4 h-full bg-emerald-600/5 active:bg-emerald-600 flex items-center justify-center transition-colors border-l border-white/5"
                            >
                                <Plus className="w-14 h-14 text-emerald-500 active:text-white" />
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex flex-col items-center justify-center opacity-10">
                            <Target className="w-24 h-24 mb-6 animate-pulse" />
                            <p className="text-[12px] font-black uppercase tracking-[0.6em]">Scan_To_Begin</p>
                        </div>
                    )}
                </div>
                {isFlash && <div className="absolute inset-0 z-[300] bg-blue-500/20 pointer-events-none flash-active"></div>}
            </div>

            {/* TRIGGER ÓPTICO (HOLD TO SCAN) */}
            <div className="h-24 shrink-0 bg-slate-900 flex items-center px-4 relative z-40 border-b-8 border-black">
                <button 
                    onPointerDown={() => { if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} 
                    onPointerUp={() => setIsTriggerActive(false)}
                    onPointerLeave={() => setIsTriggerActive(false)}
                    className={`flex-1 h-16 rounded-3xl flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.98] border-b-8 ${
                        isTriggerActive 
                        ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0' 
                        : 'bg-white text-black border-slate-300 shadow-xl'
                    }`}
                >
                    {isTriggerActive ? <ScanLine className="w-8 h-8 animate-bounce" /> : <Camera className="w-8 h-8" />}
                    <span className="text-xs font-black uppercase tracking-[0.3em]">{isTriggerActive ? 'LENS_ACTIVE' : 'MANTENER_PARA_ESCANEAR'}</span>
                </button>

                {isTriggerActive && (
                    <div className="fixed inset-0 z-[100] animate-in fade-in zoom-in duration-75">
                         <CameraScanner onScan={registerScan} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
                    </div>
                )}
            </div>

            {/* HISTORIAL TÁCTICO */}
            <div className="flex-1 min-h-0 bg-black">
                <div className="bg-slate-900/30 px-6 py-2 border-b border-white/5 flex justify-between items-center shrink-0">
                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Database className="w-3 h-3" /> Batch_History_Records
                     </span>
                </div>
                <div className="h-full">
                    <SmartWindow 
                        items={items} 
                        itemHeight={84} 
                        renderRow={MassiveItemRow} 
                        data={{ items, onSelect: selectItem, activeBarcode: lastScannedItem?.barcode }} 
                    />
                </div>
            </div>

            <style>{`
                .flash-active { animation: flash-hit 0.15s ease-out forwards; }
                @keyframes flash-hit { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
            `}</style>
        </div>
    );
};

export default MassiveBlindView;
