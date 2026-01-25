
import React, { useState, useRef, memo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Loader2, Zap, Save, Upload, MapPin, Barcode, Gauge, Database, Camera, X } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster } from '../services/massiveSync';
import * as XLSX from 'xlsx';
import { sanitizeBarcode } from '../services/utils';

// --- VIRTUALIZADOR ---
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

// --- FILA ---
const MassiveItemRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { registerScan, handleDecrement, setEditingItem } = data;
    
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
                <div className="flex-1 min-w-0 pr-4" onClick={() => setEditingItem(item)}>
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black text-blue-500 font-mono tracking-tight">{item.barcode}</span>
                        {item.loc && <span className="bg-white/5 text-white/30 text-[7px] font-black px-1 py-0.5 rounded uppercase">{item.loc}</span>}
                    </div>
                    <h3 className="text-white font-bold text-[11px] uppercase truncate opacity-70 leading-none">{item.name}</h3>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="text-right px-2 min-w-[50px]">
                        <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">
                            {item.totalQuantity}
                            {hasTarget && <span className="text-[9px] text-white/20 ml-0.5">/{item.expectedQty}</span>}
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
    const { items, totalUnits, lastScannedItem, velocity, isFlash, registerScan, removeItemCompletely } = useMassiveScanner(batchId || 'CORE');
    
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [editingItem, setEditingItem] = useState<ConsolidatedBlindItem | null>(null);
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
                    <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate max-w-[100px]">{batchId}</span>
                </div>
                <div className="flex gap-2">
                    <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                        <Gauge className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-black">{velocity} UPM</span>
                    </div>
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-14 h-9 bg-blue-600 rounded-lg active:scale-95 flex items-center justify-center"><Save className="w-5 h-5" /></button>
                </div>
            </header>

            {/* ZONA SUPERIOR: DUAL-HUD / CAMERA */}
            <div className="h-[45vh] bg-black relative flex flex-col overflow-hidden">
                {isCameraActive ? (
                    <div className="w-full h-full relative">
                        <CameraScanner onScan={registerScan} onClose={() => setIsCameraActive(false)} isTriggered={true} />
                        <button onClick={() => setIsCameraActive(false)} className="absolute top-4 right-4 z-[100] w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90"><X className="w-6 h-6" /></button>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col p-6 animate-in fade-in zoom-in duration-300">
                        {lastScannedItem ? (
                            <div className="flex-1 flex flex-col items-center justify-between">
                                {/* Descriptor Superior */}
                                <div className="text-center w-full">
                                    <div className="inline-block bg-blue-600/10 border border-blue-500/20 px-4 py-1 rounded-full mb-2">
                                        <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase italic">Última_Captura</span>
                                    </div>
                                    <h2 className="text-white font-black text-lg uppercase truncate leading-none mb-1">{lastScannedItem.name}</h2>
                                    <span className="text-blue-500 font-mono text-sm font-black tracking-tighter">{lastScannedItem.barcode}</span>
                                </div>

                                {/* Cantidad Gigante y Botones de Ajuste */}
                                <div className="flex items-center justify-between w-full max-w-sm">
                                    <button onClick={() => handleDecrement(lastScannedItem)} className="w-20 h-20 bg-white/5 border-2 border-white/10 text-rose-500 rounded-3xl flex items-center justify-center active:bg-rose-600 active:text-white transition-all shadow-xl">
                                        <Minus className="w-10 h-10" />
                                    </button>
                                    
                                    <div className="text-center">
                                        <div className="text-[10rem] font-black leading-none tabular-nums drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                            {lastScannedItem.totalQuantity}
                                        </div>
                                    </div>

                                    <button onClick={() => registerScan(lastScannedItem.barcode, 1)} className="w-20 h-20 bg-white/5 border-2 border-white/10 text-emerald-500 rounded-3xl flex items-center justify-center active:bg-emerald-600 active:text-white transition-all shadow-xl">
                                        <Plus className="w-10 h-10" />
                                    </button>
                                </div>

                                {/* Switcher a Cámara */}
                                <button 
                                    onClick={() => setIsCameraActive(true)}
                                    className="bg-white text-black px-12 py-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl active:scale-95 transition-all border-b-8 border-slate-300 mt-4"
                                >
                                    ACTIVATE_LENS
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                                <div className="text-center opacity-30">
                                    <Zap className="w-20 h-20 mx-auto mb-4 text-white animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">System_Idle_Waiting_Hardware</p>
                                </div>
                                <button 
                                    onClick={() => setIsCameraActive(true)}
                                    className="bg-white text-black px-14 py-5 rounded-full font-black text-sm uppercase tracking-[0.4em] shadow-2xl active:scale-95 border-b-[10px] border-slate-300"
                                >
                                    OPEN_CAMERA
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {/* Indicador de Unidades Totales Sesión */}
                <div className="absolute bottom-4 left-6 z-20 bg-slate-900/80 px-4 py-2 rounded-2xl border border-white/10">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-0.5">Total_Units</span>
                    <span className="text-2xl font-black text-white tabular-nums">{totalUnits}</span>
                </div>
            </div>

            {/* ZONA INFERIOR: MATRIZ INTELIGENTE */}
            <div className="flex-1 border-t-4 border-white/5">
                <div className="bg-slate-900 px-6 py-3 border-b border-white/5 flex justify-between items-center">
                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Database className="w-3 h-3" /> Batch_Matrix
                     </span>
                     <div className="flex gap-4">
                        <button onClick={() => fileInputRef.current?.click()} className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Import_Manifest</button>
                        <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={() => {}} />
                     </div>
                </div>
                <div className="h-[calc(55vh-100px)]">
                    <SmartWindow 
                        items={items} 
                        itemHeight={68} 
                        renderRow={MassiveItemRow} 
                        data={{ items, registerScan, handleDecrement, setEditingItem }} 
                    />
                </div>
            </div>

            {/* MODAL DE CÓDIGO DE BARRAS (FULLSCREEN) */}
            {editingItem && (
                <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-between p-8 animate-in fade-in duration-200">
                    <div className="w-full text-center mt-6">
                         <div className="bg-black text-white px-8 py-4 rounded-full inline-block shadow-2xl border-4 border-slate-100">
                             <span className="text-2xl font-black tracking-[0.3em] uppercase">{editingItem.barcode}</span>
                         </div>
                         <h3 className="mt-4 font-bold text-slate-400 uppercase">{editingItem.name}</h3>
                    </div>

                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                        <div 
                            className="barcode-font text-black select-none whitespace-nowrap leading-none"
                            style={{ 
                                fontSize: `${Math.min(32, 100 / (editingItem.barcode.length * 0.6))}vw`,
                                transform: 'scaleY(6)',
                                transformOrigin: 'center'
                            }}
                        >
                            {editingItem.barcode}
                        </div>
                    </div>

                    <button 
                        onClick={() => setEditingItem(null)}
                        className="w-full bg-[#050505] text-white py-12 rounded-[3rem] font-black text-2xl uppercase tracking-[0.5em] shadow-[0_30px_60px_rgba(0,0,0,0.3)] active:bg-blue-600 transition-all border-b-[15px] border-black"
                    >
                        CLOSE_HUD
                    </button>
                </div>
            )}
            
            {isFlash && <div className="absolute inset-0 z-[300] bg-blue-500/20 pointer-events-none flash-active"></div>}
        </div>
    );
};

export default MassiveBlindView;
