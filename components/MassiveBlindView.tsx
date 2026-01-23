
import React, { useState, useRef, memo, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Loader2, Zap, Save, X, Upload, MapPin, Barcode } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster } from '../services/massiveSync';
import * as XLSX from 'xlsx';
import { sanitizeBarcode } from '../services/utils';

// --- COMPONENTE VIRTUALIZADOR NATIVO (SMART-WINDOW) ---
const SmartWindow = ({ items, itemHeight, renderRow: RenderRow, data }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) setContainerHeight(containerRef.current.offsetHeight);
        };
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
                        {/* Renderizado correcto como componente JSX */}
                        <RenderRow index={startIndex + idx} data={data} />
                    </div>
                ))}
            </div>
            {items.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
                    Esperando captura...
                </div>
            )}
        </div>
    );
};

// Fila del motor de ráfaga
const MassiveItemRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { registerScan, handleDecrement, setEditingItem } = data;
    
    const hasTarget = item.expectedQty !== undefined;
    const isPerfect = hasTarget && item.totalQuantity === item.expectedQty;
    const isOver = hasTarget && item.totalQuantity > item.expectedQty;
    const isUnder = hasTarget && item.totalQuantity < item.expectedQty && item.totalQuantity > 0;
    const isZero = hasTarget && item.totalQuantity === 0;

    let bgColorClass = 'bg-slate-900/60 border-white/5';
    if (isPerfect) bgColorClass = 'bg-emerald-900/40 border-emerald-500/30';
    else if (isOver) bgColorClass = 'bg-amber-900/40 border-amber-500/30';
    else if (isUnder) bgColorClass = 'bg-rose-900/40 border-rose-500/30'; 
    else if (isZero) bgColorClass = 'bg-slate-900/90 border-white/10 opacity-60';

    return (
        <div className="px-3 py-1 h-full">
            <div className={`h-full border p-2 rounded-xl flex items-center justify-between transition-colors ${bgColorClass}`}>
                {/* ZONA DEL DESCRIPTOR: Activa modal de escaneo */}
                <div className="flex-1 min-w-0 pr-4 py-2 cursor-pointer" onClick={() => setEditingItem(item)}>
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${isPerfect ? 'bg-emerald-500' : (isUnder || isZero ? 'bg-rose-500' : 'bg-blue-500')} led-active`}></div>
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-tighter truncate">{item.barcode}</span>
                        {item.loc && (
                            <span className="bg-white/10 text-white text-[7px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest border border-white/10">
                                <MapPin className="w-2 h-2 text-rose-500" /> {item.loc}
                            </span>
                        )}
                    </div>
                    <h3 className="text-white font-black text-[10px] uppercase truncate italic opacity-80">{item.name}</h3>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right px-2 min-w-[60px]">
                        <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">
                            {item.totalQuantity}
                            {hasTarget && <span className="text-[10px] text-white/30 ml-1">/ {item.expectedQty}</span>}
                        </div>
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={() => registerScan(item.barcode, 1)} className="w-10 h-10 bg-white/10 text-white flex items-center justify-center border border-white/10 rounded-xl active:bg-blue-600"><Plus className="w-5 h-5"/></button>
                        <button onClick={() => handleDecrement(item)} className="w-10 h-10 bg-white/10 text-rose-500 flex items-center justify-center border border-white/10 rounded-xl active:bg-rose-600"><Minus className="w-5 h-5"/></button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { items, totalUnits, isFlash, registerScan, removeItemCompletely } = useMassiveScanner(batchId || 'CORE');
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [editingItem, setEditingItem] = useState<ConsolidatedBlindItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDecrement = (item: ConsolidatedBlindItem) => {
        if (item.totalQuantity <= 1) {
            if (confirm(`¿Eliminar ítem ${item.barcode}?`)) removeItemCompletely(item.barcode);
        } else {
            registerScan(item.barcode, -1);
        }
    };

    const handleImportManifest = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                const manifestItems = json.map(row => ({
                    batchId: batchId || 'CORE', 
                    barcode: sanitizeBarcode(String(row['CODIGO'] || row['SKU'] || row['BARCODE'] || '')),
                    name: String(row['PRODUCTO'] || row['DESCRIPCION'] || '').trim(),
                    loc: String(row['LOC'] || row['UBICACION'] || '').trim(),
                    expectedQty: Number(row['STOCK FINAL'] || row['CANTIDAD'] || row['QTY'] || 0)
                })).filter(i => i.barcode && i.expectedQty >= 0);

                await massiveDb.blindManifests.where('batchId').equals(batchId || 'CORE').delete();
                await massiveDb.blindManifests.bulkAdd(manifestItems);
            } catch (err) { alert("Error al importar stock."); }
            finally { setIsImporting(false); }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFinalize = async () => {
        if (!items.length) return;
        if (!confirm("¿Finalizar lote y subir a la nube?")) return;
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
            <header className="h-16 px-4 flex items-center justify-between border-b-4 border-white/5 bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg active:bg-blue-600 border border-white/10"><ChevronLeft className="w-6 h-6" /></button>
                    <div className="min-w-0">
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block italic">MARTILLO_PRO_V9.0</span>
                        <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate block">{batchId}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className={`w-10 h-10 flex items-center justify-center rounded-lg border ${totalExpected > 0 ? 'bg-amber-600' : 'bg-slate-800'}`}>
                        {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={handleImportManifest} />
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-10 h-10 bg-blue-600 rounded-lg active:scale-90"><Save className="w-5 h-5 mx-auto" /></button>
                </div>
            </header>

            <div className="flex-1 min-h-0 relative bg-black">
                {isCameraActive ? (
                    <CameraScanner onScan={registerScan} onClose={() => setIsCameraActive(false)} isTriggered={isTriggerActive} />
                ) : (
                    <button onClick={() => setIsCameraActive(true)} className="w-full h-full bg-white text-black font-black uppercase tracking-[0.4em]">ACTIVATE_OPTICS</button>
                )}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl border-2 border-white/10 text-right z-50">
                    <div className="text-2xl font-black tabular-nums">{totalUnits}{totalExpected > 0 && <span className="text-xs text-white/30 ml-1">/ {totalExpected}</span>}</div>
                    <span className="text-[6px] font-black text-white/40 uppercase tracking-[0.2em]">UNIDADES</span>
                </div>
            </div>

            <div className="bg-slate-900 p-4 shrink-0">
                <button 
                    onMouseDown={() => setIsTriggerActive(true)} onMouseUp={() => setIsTriggerActive(false)}
                    onTouchStart={() => setIsTriggerActive(true)} onTouchEnd={() => setIsTriggerActive(false)}
                    className={`w-full h-28 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all ${isTriggerActive ? 'bg-blue-600 shadow-inner' : 'bg-slate-100 text-slate-900 border-b-[12px] border-slate-400'}`}
                >
                    {isTriggerActive ? <Zap className="w-8 h-8 animate-bounce" /> : <ScanLine className="w-8 h-8" />}
                    <span className="text-xs font-black uppercase tracking-[0.3em]">{isTriggerActive ? 'BURST_MODE_ON' : 'TOUCH_TO_ZAP'}</span>
                </button>
            </div>

            <div className="h-[35vh]">
                <SmartWindow 
                    items={items} 
                    itemHeight={76} 
                    renderRow={MassiveItemRow} 
                    data={{ items, registerScan, handleDecrement, setEditingItem }} 
                />
            </div>

            {/* MODAL DE DESCRIPTOR: Muestra código para ser escaneado */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] bg-slate-950/98 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                    <button onClick={() => setEditingItem(null)} className="absolute top-8 right-8 w-14 h-14 bg-white/10 rounded-full active:scale-90 border border-white/10"><X className="w-8 h-8 mx-auto" /></button>
                    
                    <div className="w-full max-w-sm text-center mb-10">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] block mb-4 italic">SKU_PRESENTATION_MODE</span>
                        <h2 className="text-3xl font-black mb-2 uppercase italic leading-tight text-white/90">{editingItem.name}</h2>
                        {editingItem.loc && <div className="text-rose-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 mb-4"><MapPin className="w-3 h-3"/> {editingItem.loc}</div>}
                    </div>

                    {/* ZONA DE ESCANEO: El código en grande y con diseño de tarjeta industrial */}
                    <div className="bg-white text-black p-8 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(255,255,255,0.1)] border-b-[16px] border-slate-300 relative group active:scale-95 transition-transform">
                        <div className="flex justify-between items-center mb-6 opacity-30">
                            <Barcode className="w-6 h-6" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Digital_Asset_Pass</span>
                        </div>
                        <div className="text-center py-4">
                            <div className="text-4xl font-black tracking-[0.2em] font-mono break-all leading-tight">
                                {editingItem.barcode}
                            </div>
                        </div>
                        <div className="mt-8 flex justify-center">
                            <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 w-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-10 mt-16">
                        <button onClick={() => handleDecrement(editingItem)} className="w-20 h-20 bg-white/5 border-2 border-white/10 text-white rounded-full font-black text-3xl active:bg-rose-600 transition-colors">-</button>
                        <div className="flex flex-col items-center">
                            <div className="text-8xl font-black tabular-nums tracking-tighter leading-none">
                                {items.find(i => i.barcode === editingItem.barcode)?.totalQuantity || 0}
                            </div>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-2">Unidades Actuales</span>
                        </div>
                        <button onClick={() => registerScan(editingItem.barcode, 1)} className="w-20 h-20 bg-blue-600 text-white rounded-full font-black text-3xl shadow-xl shadow-blue-900/40 active:scale-110 transition-all">+</button>
                    </div>

                    <button onClick={() => setEditingItem(null)} className="mt-16 bg-white text-black px-16 py-5 rounded-2xl font-black uppercase tracking-[0.3em] active:scale-90 shadow-2xl">Confirmar_Y_Cerrar</button>
                </div>
            )}
            
            {isFlash && <div className="absolute inset-0 z-[100] bg-blue-500/20 pointer-events-none flash-active"></div>}
        </div>
    );
};

export default MassiveBlindView;
