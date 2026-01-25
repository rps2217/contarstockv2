
import React, { useState, useRef, memo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Loader2, Zap, Save, Upload, MapPin, Barcode, Gauge, Database } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster } from '../services/massiveSync';
import * as XLSX from 'xlsx';
import { sanitizeBarcode } from '../services/utils';

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
            {items.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 p-12 text-center">
                    <Barcode className="w-16 h-16 mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Waiting_For_Optical_Data</p>
                </div>
            )}
        </div>
    );
};

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
    const { items, totalUnits, velocity, isFlash, isFlushing, lastScannedCode, registerScan, removeItemCompletely } = useMassiveScanner(batchId || 'CORE');
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
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

    const totalExpected = items.reduce((acc, curr) => acc + (curr.expectedQty || 0), 0);

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-slate-950 select-none overflow-hidden text-white">
            
            <header className="h-16 px-4 flex items-center justify-between border-b-2 border-white/5 bg-slate-900 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-blue-600 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="min-w-0">
                        <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest block italic">HAMMER_ULTRA_V11</span>
                        <span className="text-[9px] text-white/40 font-black tracking-widest uppercase truncate block">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 mr-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${isFlushing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <Database className="w-3 h-3 text-white/20" />
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:bg-amber-600">
                        <Upload className="w-5 h-5 text-white/60" />
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={() => {}} />
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-10 h-10 bg-blue-600 rounded-xl active:scale-95 shadow-lg shadow-blue-900/20 flex items-center justify-center">
                        <Save className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="h-44 shrink-0 bg-black relative flex items-center justify-between px-6 border-b-2 border-white/5 overflow-hidden">
                <div className="relative z-10">
                    <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mb-1 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500 led-active"></div> PRODUCTION_OUTPUT
                    </div>
                    <div className="text-[7rem] font-black tabular-nums tracking-tighter leading-none italic">{totalUnits}</div>
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 flex items-center gap-3">
                        <span>Units_In_Batch</span>
                        {totalExpected > 0 && <span className="text-white/40">Expected: {totalExpected}</span>}
                    </div>
                </div>
                
                <div className="text-right z-10 flex flex-col items-end gap-4">
                    <div className="bg-slate-900/80 border border-white/10 p-3 rounded-2xl min-w-[120px]">
                        <div className="flex items-center justify-between mb-1">
                             <Gauge className={`w-3.5 h-3.5 ${velocity > 30 ? 'text-amber-500' : 'text-blue-500'}`} />
                             <span className="text-[8px] font-black text-white/40 uppercase">Cadence</span>
                        </div>
                        <div className="text-2xl font-black tabular-nums">{velocity}<span className="text-[10px] ml-1 opacity-40">UPM</span></div>
                    </div>

                    {lastScannedCode && (
                        <div className="animate-in slide-in-from-right-4 duration-150">
                            <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Capture_OK</div>
                            <div className="text-xl font-black bg-emerald-500 text-black px-3 py-1 rounded shadow-lg rotate-1">
                                {lastScannedCode}
                            </div>
                        </div>
                    )}
                </div>

                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                </div>
            </div>

            <div className="flex-1 min-h-0 relative bg-slate-900/30">
                {isCameraActive ? (
                    <CameraScanner onScan={registerScan} onClose={() => setIsCameraActive(false)} isTriggered={isTriggerActive} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
                        <button 
                            onClick={() => setIsCameraActive(true)} 
                            className="bg-white text-black px-12 py-5 rounded-full font-black text-xl uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-[8px] border-slate-300"
                        >
                            ENGAGE_OPTICS
                        </button>
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Hardware_Trigger_Ready</span>
                    </div>
                )}
            </div>

            <div className="bg-slate-900 p-4 shrink-0 border-t-2 border-white/5">
                <button 
                    onMouseDown={() => setIsTriggerActive(true)} onMouseUp={() => setIsTriggerActive(false)}
                    onTouchStart={() => setIsTriggerActive(true)} onTouchEnd={() => setIsTriggerActive(false)}
                    className={`w-full h-24 flex flex-col items-center justify-center gap-2 rounded-[2rem] transition-all duration-75 active:scale-[0.98] ${
                        isTriggerActive 
                        ? 'bg-blue-600 shadow-inner scale-[0.99]' 
                        : 'bg-white text-black border-b-[8px] border-slate-300'
                    }`}
                >
                    {isTriggerActive ? <Zap className="w-8 h-8 animate-bounce" /> : <ScanLine className="w-8 h-8" />}
                    <span className="text-xs font-black uppercase tracking-[0.4em]">{isTriggerActive ? 'SCANNING' : 'PUSH_FOR_BURST'}</span>
                </button>
            </div>

            <div className="h-[28vh]">
                <SmartWindow 
                    items={items} 
                    itemHeight={68} 
                    renderRow={MassiveItemRow} 
                    data={{ items, registerScan, handleDecrement, setEditingItem }} 
                />
            </div>

            {editingItem && (
                <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-between p-8 animate-in fade-in duration-200">
                    <div className="w-full text-center mt-6">
                         <div className="bg-black text-white px-8 py-3 rounded-full inline-block shadow-2xl border-4 border-slate-100">
                             <span className="text-2xl font-black tracking-[0.3em] uppercase">SKU: {editingItem.barcode}</span>
                         </div>
                    </div>

                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden bg-white">
                        <div 
                            className="barcode-font text-black select-none whitespace-nowrap leading-none"
                            style={{ 
                                fontSize: `${Math.min(30, 100 / (editingItem.barcode.length * 0.6))}vw`,
                                transform: 'scaleY(4)',
                                transformOrigin: 'center'
                            }}
                        >
                            {editingItem.barcode}
                        </div>
                    </div>

                    <button 
                        onClick={() => setEditingItem(null)}
                        className="w-full bg-black text-white py-10 rounded-[3rem] font-black text-2xl uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all border-b-[12px] border-slate-800"
                    >
                        DISMISS
                    </button>
                </div>
            )}
            
            {isFlash && <div className="absolute inset-0 z-[300] bg-blue-500/20 pointer-events-none flash-active"></div>}
        </div>
    );
};

export default MassiveBlindView;
