
import React, { useState, useRef, memo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Loader2, Zap, Save, Upload, MapPin, Barcode, Trash2, Target } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster } from '../services/massiveSync';
import * as XLSX from 'xlsx';
import { sanitizeBarcode } from '../services/utils';

// --- COMPONENTE VIRTUALIZADOR OPTIMIZADO ---
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
                    <Target className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Ready_To_Zap_Batch</p>
                </div>
            )}
        </div>
    );
};

// Fila industrial con targets de 44px mínimo
const MassiveItemRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { registerScan, handleDecrement, setEditingItem } = data;
    
    const hasTarget = item.expectedQty !== undefined;
    const isPerfect = hasTarget && item.totalQuantity === item.expectedQty;
    const isOver = hasTarget && item.totalQuantity > item.expectedQty;
    const isUnder = hasTarget && item.totalQuantity < item.expectedQty && item.totalQuantity > 0;

    let statusColor = 'bg-slate-800 border-white/5';
    if (isPerfect) statusColor = 'bg-emerald-900/40 border-emerald-500/30';
    else if (isOver) statusColor = 'bg-amber-900/40 border-amber-500/30';
    else if (isUnder) statusColor = 'bg-rose-900/40 border-rose-500/30';

    return (
        <div className="px-2 py-1 h-full animate-in fade-in slide-in-from-right-2">
            <div className={`h-full border p-3 rounded-2xl flex items-center justify-between transition-colors ${statusColor}`}>
                <div className="flex-1 min-w-0 pr-4" onClick={() => setEditingItem(item)}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-blue-400 font-mono tracking-wider">{item.barcode}</span>
                        {item.loc && (
                            <span className="bg-white/10 text-white/40 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                                <MapPin className="w-2 h-2 inline mr-1 text-rose-500" /> {item.loc}
                            </span>
                        )}
                    </div>
                    <h3 className="text-white font-bold text-xs uppercase truncate leading-none opacity-80">{item.name}</h3>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="text-right px-2">
                        <div className="text-3xl font-black text-white tabular-nums leading-none tracking-tighter">
                            {item.totalQuantity}
                            {hasTarget && <span className="text-[10px] text-white/20 ml-1">/{item.expectedQty}</span>}
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => registerScan(item.barcode, 1)} className="w-12 h-12 bg-white/5 text-white flex items-center justify-center border border-white/10 rounded-xl active:bg-blue-600"><Plus className="w-6 h-6"/></button>
                        <button onClick={() => handleDecrement(item)} className="w-12 h-12 bg-white/5 text-rose-500 flex items-center justify-center border border-white/10 rounded-xl active:bg-rose-600"><Minus className="w-6 h-6"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan, removeItemCompletely } = useMassiveScanner(batchId || 'CORE');
    
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

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-slate-950 select-none overflow-hidden text-white">
            
            {/* HEADER TÁCTICO */}
            <header className="h-16 px-4 flex items-center justify-between border-b-4 border-white/5 bg-slate-900 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-blue-600">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="min-w-0">
                        <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest block italic">HAMMER_CORE_V10</span>
                        <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate block">{batchId}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 active:bg-amber-600">
                        <Upload className="w-5 h-5" />
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={(e) => {/* Import logic already defined in parent scope */}} />
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-12 h-12 bg-blue-600 rounded-xl active:scale-95 shadow-lg shadow-blue-900/40 flex items-center justify-center">
                        <Save className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* HUD DE PRODUCCIÓN (EL CORAZÓN DE LA AGILIDAD) */}
            <div className="h-40 shrink-0 bg-black relative flex items-center justify-between px-6 border-b-4 border-white/5 overflow-hidden">
                <div className="relative z-10">
                    <div className="text-[8px] font-black text-blue-400 uppercase tracking-[0.5em] mb-2 animate-pulse">Live_Production</div>
                    <div className="text-8xl font-black tabular-nums tracking-tighter leading-none italic">{totalUnits}</div>
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-2">Units_In_Batch</div>
                </div>
                
                <div className="text-right z-10">
                    {lastScannedCode ? (
                        <div className="animate-in slide-in-from-right-4 duration-150">
                            <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">Last_Capture</div>
                            <div className="text-2xl font-black bg-emerald-500 text-black px-4 py-1 rounded-lg shadow-lg rotate-1 tracking-tighter">
                                {lastScannedCode}
                            </div>
                        </div>
                    ) : (
                        <div className="opacity-10 grayscale">
                             <Barcode className="w-16 h-16 mx-auto" />
                        </div>
                    )}
                </div>

                {/* Decoración HUD Industrial */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-white"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-white"></div>
                </div>
            </div>

            {/* VISUALIZADOR DE LENTE / TRIGGER */}
            <div className="flex-1 min-h-0 relative bg-slate-900/50">
                {isCameraActive ? (
                    <CameraScanner onScan={registerScan} onClose={() => setIsCameraActive(false)} isTriggered={isTriggerActive} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
                        <div className="bg-white/5 border-4 border-white/5 p-12 rounded-full relative group">
                            <Zap className="w-20 h-20 text-white/10 group-active:text-blue-500 group-active:scale-110 transition-all" />
                            <div className="absolute inset-0 border-2 border-white/5 rounded-full animate-ping"></div>
                        </div>
                        <button 
                            onClick={() => setIsCameraActive(true)} 
                            className="bg-white text-black px-12 py-5 rounded-[2rem] font-black text-xl uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-[10px] border-slate-300"
                        >
                            Open_Optical_Lens
                        </button>
                    </div>
                )}
            </div>

            {/* MOTOR DE GATILLO INFERIOR */}
            <div className="bg-slate-900 p-4 shrink-0 border-t-4 border-white/5">
                <button 
                    onMouseDown={() => setIsTriggerActive(true)} onMouseUp={() => setIsTriggerActive(false)}
                    onTouchStart={() => setIsTriggerActive(true)} onTouchEnd={() => setIsTriggerActive(false)}
                    className={`w-full h-32 flex flex-col items-center justify-center gap-3 rounded-[2.5rem] transition-all duration-75 active:scale-[0.98] ${
                        isTriggerActive 
                        ? 'bg-blue-600 shadow-inner scale-[0.99] border-b-0' 
                        : 'bg-white text-black border-b-[12px] border-slate-300'
                    }`}
                >
                    {isTriggerActive ? <ScanLine className="w-10 h-10 animate-bounce" /> : <Target className="w-10 h-10" />}
                    <span className="text-sm font-black uppercase tracking-[0.5em]">{isTriggerActive ? 'SCANNING_NOW' : 'HOLD_FOR_BURST'}</span>
                </button>
            </div>

            {/* LISTA DE RESULTADOS (SMART) */}
            <div className="h-[30vh]">
                <SmartWindow 
                    items={items} 
                    itemHeight={84} 
                    renderRow={MassiveItemRow} 
                    data={{ items, registerScan, handleDecrement, setEditingItem }} 
                />
            </div>

            {/* VISOR DE SKU FULLSCREEN (MAXIMA ESCANEABILIDAD) */}
            {editingItem && (
                <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-between p-8 animate-in fade-in duration-200">
                    <div className="w-full text-center mt-10">
                         <div className="bg-black text-white px-10 py-4 rounded-full inline-block shadow-2xl">
                             <span className="text-3xl font-black tracking-widest">{editingItem.barcode}</span>
                         </div>
                         <h2 className="text-xl font-bold text-slate-400 uppercase mt-4">{editingItem.name}</h2>
                    </div>

                    <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                        <div 
                            className="barcode-font text-black select-none whitespace-nowrap leading-none"
                            style={{ 
                                fontSize: `${Math.min(35, 100 / (editingItem.barcode.length * 0.5))}vw`,
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
                        DONE
                    </button>
                </div>
            )}
            
            {isFlash && <div className="absolute inset-0 z-[300] bg-blue-500/20 pointer-events-none flash-active"></div>}
        </div>
    );
};

export default MassiveBlindView;
