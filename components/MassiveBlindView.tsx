
import React, { useState, useRef, memo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Zap, Save, Upload, Database, Camera, X } from 'lucide-react';
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
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 1);
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + 1);
    const visibleItems = items.slice(startIndex, endIndex);
    const totalHeight = items.length * itemHeight;

    return (
        <div ref={containerRef} onScroll={onScroll} className="h-full w-full overflow-y-auto no-scrollbar relative bg-black">
            <div style={{ height: totalHeight, width: '100%', pointerEvents: 'none' }} />
            <div className="absolute top-0 left-0 w-full" style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
                {visibleItems.map((item: any, idx: number) => (
                    <div key={item.barcode} style={{ height: itemHeight }}>
                        <RenderRow index={startIndex + idx} data={data} />
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- FILA DE HISTORIAL ---
const MassiveItemRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { registerScan, handleDecrement } = data;
    
    const hasTarget = item.expectedQty !== undefined;
    const isPerfect = hasTarget && item.totalQuantity === item.expectedQty;

    return (
        <div className="px-3 py-1 h-full">
            <div className={`h-full border p-3 rounded-2xl flex items-center justify-between transition-all bg-slate-900/50 ${isPerfect ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-white/5'}`}>
                <div className="flex-1 min-w-0 pr-4">
                    <span className="text-[10px] font-black text-blue-500 font-mono tracking-tight block mb-0.5">{item.barcode}</span>
                    <h3 className="text-white font-bold text-[12px] uppercase truncate opacity-70 leading-none">{item.name}</h3>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right tabular-nums">
                        <span className="text-2xl font-black text-white">{item.totalQuantity}</span>
                        {hasTarget && <span className="text-[9px] text-white/20 ml-1">/ {item.expectedQty}</span>}
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={() => registerScan(item.barcode, 1)} className="w-10 h-10 bg-white/5 text-white flex items-center justify-center border border-white/10 rounded-xl active:bg-blue-600"><Plus className="w-5 h-5"/></button>
                        <button onClick={() => handleDecrement(item)} className="w-10 h-10 bg-white/5 text-rose-500 flex items-center justify-center border border-white/10 rounded-xl active:bg-rose-600"><Minus className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { items, lastScannedItem, isFlash, registerScan, removeItemCompletely } = useMassiveScanner(batchId || 'CORE');
    
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
            
            {/* STICKY TOP HEADER */}
            <header className="h-14 px-4 flex items-center justify-between border-b-2 border-white/5 bg-slate-900/50 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600"><ChevronLeft className="w-6 h-6" /></button>
                    <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate max-w-[120px] italic">{batchId}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-amber-600"><Upload className="w-4 h-4 text-white/60" /></button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={() => {}} />
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-14 h-10 bg-blue-600 rounded-xl active:scale-95 flex items-center justify-center shadow-lg shadow-blue-900/40">
                        {isMigrating ? <Zap className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* ZONA SUPERIOR: HUD ERGONÓMICO (35% Altura) */}
            <div className="h-[35vh] bg-[#050505] relative flex flex-col overflow-hidden border-b border-white/5">
                <div className="w-full h-full flex items-center justify-between p-2">
                    {lastScannedItem ? (
                        <>
                            {/* PAD MENOS (LADO IZQUIERDO) */}
                            <button 
                                onPointerDown={(e) => { e.preventDefault(); handleDecrement(lastScannedItem); }}
                                className="w-1/4 h-full bg-rose-600/5 hover:bg-rose-600/10 active:bg-rose-600 rounded-2xl flex items-center justify-center transition-colors border-r border-white/5"
                            >
                                <Minus className="w-12 h-12 text-rose-500 active:text-white" />
                            </button>

                            {/* DISPLAY CENTRAL */}
                            <div className="flex-1 flex flex-col items-center justify-center px-2 text-center pointer-events-none">
                                <div className="bg-blue-600/20 px-3 py-0.5 rounded-full mb-2">
                                    <span className="text-[9px] font-black text-blue-400 tracking-widest uppercase">CAPTURED_SKU</span>
                                </div>
                                <h2 className="text-white font-black text-sm uppercase truncate w-full mb-1">{lastScannedItem.name}</h2>
                                <span className="text-blue-500 font-mono text-[10px] font-black tracking-widest mb-4">{lastScannedItem.barcode}</span>
                                
                                <div className="relative">
                                    <div className="text-8xl font-black tabular-nums leading-none drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                        {lastScannedItem.totalQuantity}
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-white/30 tracking-[0.4em]">TOTAL_QTY</div>
                                </div>
                            </div>

                            {/* PAD MAS (LADO DERECHO) */}
                            <button 
                                onPointerDown={(e) => { e.preventDefault(); registerScan(lastScannedItem.barcode, 1); }}
                                className="w-1/4 h-full bg-emerald-600/5 hover:bg-emerald-600/10 active:bg-emerald-600 rounded-2xl flex items-center justify-center transition-colors border-l border-white/5"
                            >
                                <Plus className="w-12 h-12 text-emerald-500 active:text-white" />
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex flex-col items-center justify-center opacity-20">
                            <Zap className="w-16 h-16 mb-4 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em]">Waiting_Laser_Inbound</p>
                        </div>
                    )}
                </div>
                {isFlash && <div className="absolute inset-0 z-[300] bg-blue-500/20 pointer-events-none flash-active"></div>}
            </div>

            {/* BARRA CENTRAL: TRIGGER ÓPTICO (HOLD TO SCAN) */}
            <div className="h-24 shrink-0 bg-slate-950 flex items-center px-4 relative z-40">
                <button 
                    onPointerDown={() => { if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} 
                    onPointerUp={() => setIsTriggerActive(false)}
                    onPointerLeave={() => setIsTriggerActive(false)}
                    className={`flex-1 h-16 rounded-[1.2rem] flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.97] border-b-8 ${
                        isTriggerActive 
                        ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0 shadow-inner' 
                        : 'bg-white text-black border-slate-300 shadow-xl'
                    }`}
                >
                    {isTriggerActive ? <ScanLine className="w-8 h-8 animate-bounce" /> : <Camera className="w-8 h-8" />}
                    <span className="text-xs font-black uppercase tracking-[0.3em]">{isTriggerActive ? 'LENS_ACTIVE' : 'MANTENER_PARA_ESCANEAR'}</span>
                </button>

                {/* VISOR DE CÁMARA (FULLSCREEN HOLD) */}
                {isTriggerActive && (
                    <div className="fixed inset-0 z-[100] animate-in fade-in zoom-in duration-75">
                         <CameraScanner onScan={registerScan} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
                    </div>
                )}
            </div>

            {/* ZONA INFERIOR: HISTORIAL MATRICIAL */}
            <div className="flex-1 min-h-0 bg-black border-t border-white/5">
                <div className="bg-slate-900/30 px-6 py-2 border-b border-white/5 flex justify-between items-center shrink-0">
                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 italic">
                        <Database className="w-3 h-3" /> Batch_Records_Stream
                     </span>
                </div>
                <div className="h-full">
                    <SmartWindow 
                        items={items} 
                        itemHeight={72} 
                        renderRow={MassiveItemRow} 
                        data={{ items, registerScan, handleDecrement }} 
                    />
                </div>
            </div>

            <style>{`
                .flash-active { animation: flash-hit 0.1s ease-out forwards; }
                @keyframes flash-hit { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
            `}</style>
        </div>
    );
};

export default MassiveBlindView;
