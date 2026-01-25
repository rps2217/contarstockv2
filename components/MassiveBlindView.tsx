
import React, { useState, useRef, memo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Zap, Save, Upload, Database, Camera, X, Target } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster } from '../services/massiveSync';

// --- VIRTUALIZADOR ESTABLE ---
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
        <div ref={containerRef} onScroll={onScroll} className="h-full w-full overflow-y-auto no-scrollbar relative bg-slate-950">
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

// --- FILA DE LISTA ---
const MassiveItemRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { registerScan, handleDecrement } = data;
    
    const hasTarget = item.expectedQty !== undefined;
    const isPerfect = hasTarget && item.totalQuantity === item.expectedQty;
    const isOver = hasTarget && item.totalQuantity > item.expectedQty;
    const isUnder = hasTarget && item.totalQuantity < item.expectedQty && item.totalQuantity > 0;

    let statusColor = 'bg-slate-900 border-white/5';
    if (isPerfect) statusColor = 'bg-emerald-950/40 border-emerald-500/30';
    else if (isOver) statusColor = 'bg-amber-950/40 border-amber-500/30';
    else if (isUnder) statusColor = 'bg-rose-950/40 border-rose-500/30';

    return (
        <div className="px-2 py-0.5 h-full">
            <div className={`h-full border p-3 rounded-2xl flex items-center justify-between transition-all ${statusColor}`}>
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black text-blue-500 font-mono tracking-tight">{item.barcode}</span>
                        {item.loc && <span className="bg-white/5 text-white/30 text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-tighter">{item.loc}</span>}
                    </div>
                    <h3 className="text-white font-bold text-[11px] uppercase truncate opacity-70 leading-none">{item.name}</h3>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="text-right px-2 min-w-[45px]">
                        <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">
                            {item.totalQuantity}
                        </div>
                    </div>
                    <div className="flex gap-1">
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

    const handleDecrement = (item: ConsolidatedBlindItem) => {
        if (item.totalQuantity <= 1) {
            if (confirm(`¿Eliminar SKU ${item.barcode}?`)) removeItemCompletely(item.barcode);
        } else {
            registerScan(item.barcode, -1);
        }
    };

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
        <div className="h-screen w-full flex flex-col font-mono bg-slate-950 select-none overflow-hidden text-white">
            
            {/* STICKY TOP HEADER */}
            <header className="h-14 px-4 flex items-center justify-between border-b-2 border-white/5 bg-slate-900 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-9 h-9 flex items-center justify-center bg-white/5 rounded-lg active:bg-blue-600"><ChevronLeft className="w-5 h-5" /></button>
                    <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate max-w-[150px]">{batchId}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="w-10 h-9 flex items-center justify-center bg-white/5 rounded-lg border border-white/5 active:bg-amber-600"><Upload className="w-4 h-4" /></button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={() => {}} />
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-14 h-9 bg-blue-600 rounded-lg active:scale-95 flex items-center justify-center shadow-lg shadow-blue-900/20 transition-all">
                        {isMigrating ? <Zap className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* ZONA SUPERIOR: HUD DINÁMICO (40% Altura) */}
            <div className="h-[40vh] bg-black relative flex flex-col overflow-hidden border-b-4 border-white/5">
                <div className="w-full h-full flex flex-col p-6 animate-in fade-in duration-200">
                    {lastScannedItem ? (
                        <div className="flex-1 flex flex-col items-center justify-around">
                            {/* Descriptor Superior */}
                            <div className="text-center w-full">
                                <div className="inline-block bg-blue-600/10 border border-blue-500/20 px-4 py-1 rounded-full mb-3">
                                    <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase italic">ÚLTIMA_CAPTURADA</span>
                                </div>
                                <h2 className="text-white font-black text-xl uppercase truncate leading-tight mb-1">{lastScannedItem.name}</h2>
                                <span className="text-blue-500 font-mono text-sm font-black tracking-tighter">{lastScannedItem.barcode}</span>
                            </div>

                            {/* Área de Control de Cantidad (Touch Targets Gigantes) */}
                            <div className="flex items-center justify-between w-full max-w-sm">
                                <button 
                                    onMouseDown={() => handleDecrement(lastScannedItem)}
                                    onTouchStart={(e) => { e.preventDefault(); handleDecrement(lastScannedItem); }}
                                    className="w-20 h-20 bg-white/5 border-2 border-white/10 text-rose-500 rounded-3xl flex items-center justify-center active:bg-rose-600 active:text-white transition-all shadow-xl"
                                >
                                    <Minus className="w-12 h-12" />
                                </button>
                                
                                <div className="text-center">
                                    <div className="text-[13rem] font-black leading-none tabular-nums drop-shadow-[0_0_40px_rgba(59,130,246,0.3)] text-white select-none">
                                        {lastScannedItem.totalQuantity}
                                    </div>
                                </div>

                                <button 
                                    onMouseDown={() => registerScan(lastScannedItem.barcode, 1)}
                                    onTouchStart={(e) => { e.preventDefault(); registerScan(lastScannedItem.barcode, 1); }}
                                    className="w-20 h-20 bg-white/5 border-2 border-white/10 text-emerald-500 rounded-3xl flex items-center justify-center active:bg-emerald-600 active:text-white transition-all shadow-xl"
                                >
                                    <Plus className="w-12 h-12" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                            <Zap className="w-16 h-16 mb-4 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em]">Puerto_Láser_Activo</p>
                        </div>
                    )}
                </div>
                {/* Flash confirmación */}
                {isFlash && <div className="absolute inset-0 z-[300] bg-blue-500/30 pointer-events-none flash-active"></div>}
            </div>

            {/* BARRA CENTRAL: GATILLO ÓPTICO (Hold-to-Scan) (15% Altura aprox) */}
            <div className="h-28 shrink-0 bg-slate-900 border-b-4 border-white/5 flex items-center px-4 relative z-40">
                <button 
                    onMouseDown={() => setIsTriggerActive(true)} 
                    onMouseUp={() => setIsTriggerActive(false)}
                    onTouchStart={(e) => { e.preventDefault(); setIsTriggerActive(true); }} 
                    onTouchEnd={(e) => { e.preventDefault(); setIsTriggerActive(false); }}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`flex-1 h-20 rounded-2xl flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.98] border-b-[8px] ${
                        isTriggerActive 
                        ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0' 
                        : 'bg-white text-black border-slate-300'
                    }`}
                >
                    {isTriggerActive ? <ScanLine className="w-8 h-8 animate-bounce" /> : <Camera className="w-8 h-8" />}
                    <span className="text-sm font-black uppercase tracking-[0.4em]">{isTriggerActive ? 'LENS_OPEN' : 'PRESIONAR_PARA_ESCANEAR'}</span>
                </button>

                {/* Cámara superpuesta (Solo activa si el trigger está presionado) */}
                {isTriggerActive && (
                    <div className="fixed inset-0 z-[100] animate-in fade-in zoom-in duration-100">
                         <CameraScanner onScan={registerScan} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
                    </div>
                )}
            </div>

            {/* ZONA INFERIOR: HISTORIAL DE BATCH (Resto del espacio) */}
            <div className="flex-1 min-h-0 bg-black">
                <div className="bg-slate-900/50 px-6 py-2 border-b border-white/5 flex justify-between items-center shrink-0">
                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Database className="w-3 h-3" /> Batch_Records
                     </span>
                </div>
                <div className="h-full">
                    <SmartWindow 
                        items={items} 
                        itemHeight={68} 
                        renderRow={MassiveItemRow} 
                        data={{ items, registerScan, handleDecrement }} 
                    />
                </div>
            </div>

            {/* CONFIRMACIÓN DE ELIMINACIÓN DE REGISTRO */}
            <style>{`
                .flash-active { animation: flash-hit 0.1s ease-out forwards; }
                @keyframes flash-hit { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
            `}</style>
        </div>
    );
};

export default MassiveBlindView;
