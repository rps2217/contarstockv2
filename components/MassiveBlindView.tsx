
import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Trash2, Plus, Minus, ScanLine, History, Loader2, Zap, Cpu, FileSpreadsheet, Save, X, Barcode, AlertTriangle, Upload, Target, CheckCircle, MapPin } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';
import { exportMassiveToExcel } from '../services/massiveExport';
import { migrateMassiveToMaster } from '../services/massiveSync';
import * as XLSX from 'xlsx';
import { sanitizeBarcode } from '../services/utils';

const BarcodeRenderer: React.FC<{ value: string }> = ({ value }) => {
    if (!value) return null;
    const charTable: Record<string, string> = {
        '0': '11011001100', '1': '11001101100', '2': '11001100110', '3': '10010011000',
        '4': '10010001100', '5': '10001001100', '6': '10011001000', '7': '10011000100',
        '8': '10001100100', '9': '11001110100', 'A': '11101101100', 'B': '11101100110',
        'C': '11100110110', 'D': '11101101100', 'E': '11101100110', '-': '10010110110',
        '.': '11001010000', ' ': '11011011000', '/': '11011000110', '*': '11011011011'
    };
    const start = '11010000100';
    const stop = '1100011101011';
    let pattern = start;
    const safeValue = value.toUpperCase().replace(/[^A-Z0-9\-\. \/\*]/g, '').substring(0, 14);
    for (const char of safeValue) pattern += charTable[char] || '10101010110';
    pattern += stop;
    return (
        <div className="bg-white p-4 w-full flex flex-col items-center">
            <div className="w-full h-8 bg-white"></div>
            <div className="flex w-full h-64 items-stretch justify-center bg-white px-2">
                {pattern.split('').map((bit, i) => (
                    <div key={i} className={`${bit === '1' ? 'bg-black' : 'bg-transparent'} flex-1`} style={{ minWidth: '1px' }} />
                ))}
            </div>
            <div className="w-full h-8 bg-white"></div>
        </div>
    );
};

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan, removeItemCompletely } = useMassiveScanner(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    
    const [editingItem, setEditingItem] = useState<ConsolidatedBlindItem | null>(null);
    const [viewingBarcode, setViewingBarcode] = useState<ConsolidatedBlindItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportManifest = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json: any[] = XLSX.utils.sheet_to_json(sheet);

                // Mapeo dinámico basado en las columnas de la imagen
                const manifestItems = json.map(row => {
                    const barcode = sanitizeBarcode(String(row['CODIGO'] || row['SKU'] || row['BARCODE'] || ''));
                    const name = String(row['PRODUCTO'] || row['DESCRIPCION'] || '').trim();
                    const loc = String(row['LOC'] || row['UBICACION'] || '').trim();
                    const expectedQty = Number(row['STOCK FINAL'] || row['CANTIDAD'] || row['QTY'] || 0);
                    
                    return { batchId, barcode, name, loc, expectedQty };
                }).filter(i => i.barcode && i.expectedQty >= 0);

                await massiveDb.blindManifests.where('batchId').equals(batchId).delete();
                await massiveDb.blindManifests.bulkAdd(manifestItems);
                alert(`${manifestItems.length} items cargados con ubicaciones y stocks finales.`);
            } catch (err) {
                alert("Error al procesar el archivo. Verifique los encabezados: CODIGO, PRODUCTO, LOC, STOCK FINAL.");
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleReset = async () => {
        if (confirm("¿RESET BATCH? Se borrarán todos los datos actuales del modo martillo.")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            await massiveDb.blindManifests.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    const handleFinalize = async () => {
        if (!items || items.length === 0) return;
        if (!confirm("¿Finalizar lote? Los datos se moverán al historial para sincronizar con la nube.")) return;
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId);
            alert("Lote guardado en el historial.");
            navigate('/dashboard');
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsMigrating(false);
        }
    };

    const totalExpected = items.reduce((acc, curr) => acc + (curr.expectedQty || 0), 0);
    const progressPercent = totalExpected > 0 ? Math.min(100, (totalUnits / totalExpected) * 100) : 0;

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-slate-950 select-none overflow-hidden text-white">
            <header className="h-16 px-4 flex items-center justify-between border-b-4 border-white/5 bg-slate-900 z-50 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 active:bg-blue-600 rounded-lg">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="min-w-0">
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block italic truncate">MARTILLO_PRO_V4.6</span>
                        <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate block">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className={`w-10 h-10 flex items-center justify-center rounded-lg border active:scale-90 transition-all ${totalExpected > 0 ? 'bg-amber-600 border-amber-500' : 'bg-slate-800 border-white/10'}`}>
                        {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx" onChange={handleImportManifest} />
                    
                    <button onClick={() => exportMassiveToExcel(batchId, items)} disabled={totalUnits === 0} className="w-10 h-10 bg-emerald-600 flex items-center justify-center rounded-lg border border-emerald-500/20 active:scale-90 disabled:opacity-30">
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                    <button onClick={handleFinalize} disabled={totalUnits === 0 || isMigrating} className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded-lg border border-blue-500/20 active:scale-90 disabled:opacity-30">
                        {isMigrating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                    <button onClick={handleReset} className="w-10 h-10 bg-rose-950/20 text-rose-500 flex items-center justify-center rounded-lg border border-rose-500/10 active:bg-rose-600 active:text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="flex-1 min-h-0 relative bg-black overflow-hidden border-b-4 border-white/5">
                {isCameraActive ? (
                    <CameraScanner onScan={registerScan} onClose={() => setIsCameraActive(false)} isTriggered={isTriggerActive} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]">
                        <button onClick={() => setIsCameraActive(true)} className="bg-white text-black px-10 py-5 font-black text-[11px] uppercase tracking-[0.4em] border-b-[10px] border-slate-400 active:translate-y-2 active:border-b-0 transition-all rounded-none block w-full">
                            ACTIVATE_OPTICS
                        </button>
                    </div>
                )}
                
                <div className="absolute top-4 right-4 z-50">
                     <div className="bg-black/60 backdrop-blur-md border-2 border-white/10 p-3 rounded-2xl flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">
                                {totalUnits}
                                {totalExpected > 0 && <span className="text-xs text-white/30 ml-1">/ {totalExpected}</span>}
                            </div>
                            <span className="text-[6px] font-black text-white/40 uppercase tracking-[0.2em] mt-1 block">TOTAL_UNITS</span>
                        </div>
                        {totalExpected > 0 && (
                            <div className="text-right border-l border-white/10 pl-4">
                                <div className={`text-2xl font-black tabular-nums leading-none ${progressPercent >= 100 ? 'text-emerald-500' : 'text-blue-500'}`}>
                                    {progressPercent.toFixed(0)}%
                                </div>
                                <span className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 block">CUMPLIMIENTO</span>
                            </div>
                        )}
                     </div>
                </div>

                {lastScannedCode && !isFlash && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-5 py-2 font-black text-[9px] uppercase tracking-[0.3em] italic border-2 border-black shadow-2xl animate-in slide-in-from-top-2">
                        SKU: {lastScannedCode}
                    </div>
                )}
            </div>

            <div className="bg-slate-900 p-4 border-b-4 border-white/5 shrink-0 z-40">
                <button 
                    onMouseDown={() => setIsTriggerActive(true)}
                    onMouseUp={() => setIsTriggerActive(false)}
                    onMouseLeave={() => setIsTriggerActive(false)}
                    onTouchStart={() => setIsTriggerActive(true)}
                    onTouchEnd={() => setIsTriggerActive(false)}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`w-full h-28 transition-all duration-75 flex flex-col items-center justify-center gap-3 relative rounded-2xl ${
                        isTriggerActive ? 'bg-blue-600 translate-y-1 shadow-inner' : 'bg-slate-100 text-slate-900 border-b-[12px] border-slate-400 shadow-xl'
                    }`}
                >
                    {isTriggerActive ? (
                        <>
                            <Zap className="w-10 h-10 text-white animate-bounce" />
                            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white z-10">BURST_ACTIVE</span>
                        </>
                    ) : (
                        <>
                            <ScanLine className="w-10 h-10 text-slate-400" />
                            <span className="text-lg font-black uppercase tracking-[0.2em] italic">TOUCH_OR_ZAP</span>
                        </>
                    )}
                </button>
            </div>

            <div className="h-[28vh] overflow-y-auto no-scrollbar bg-slate-950 p-3">
                <div className="space-y-1.5 pb-20">
                    {items.map((item) => {
                        const hasTarget = item.expectedQty !== undefined;
                        const isPerfect = hasTarget && item.totalQuantity === item.expectedQty;
                        const isOver = hasTarget && item.totalQuantity > item.expectedQty;
                        
                        return (
                            <div key={item.barcode} className={`border p-2 rounded-xl flex items-center justify-between transition-colors ${isPerfect ? 'bg-emerald-900/40 border-emerald-500/30' : (isOver ? 'bg-amber-900/40 border-amber-500/30' : 'bg-slate-900/60 border-white/5')}`}>
                                <div className="flex-1 min-w-0 pr-4 py-2" onClick={() => setViewingBarcode(item)}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isPerfect ? 'bg-emerald-500' : 'bg-blue-500'} led-active`}></div>
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
                                    <div className="text-right px-2 min-w-[60px]" onClick={() => setEditingItem(item)}>
                                        <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">
                                            {item.totalQuantity}
                                            {hasTarget && <span className="text-[10px] text-white/30 ml-1">/ {item.expectedQty}</span>}
                                        </div>
                                        {hasTarget && (
                                            <span className={`text-[6px] font-bold uppercase tracking-widest mt-1 block ${isPerfect ? 'text-emerald-400' : (isOver ? 'text-amber-400' : 'text-white/20')}`}>
                                                {isPerfect ? 'OBJETIVO_OK' : (isOver ? `SOBRAN ${item.totalQuantity - item.expectedQty!}` : `FALTAN ${item.expectedQty! - item.totalQuantity}`)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => registerScan(item.barcode, 1)} className="w-10 h-10 bg-white/10 text-white flex items-center justify-center border border-white/10 rounded-xl"><Plus className="w-5 h-5"/></button>
                                        <button onClick={() => registerScan(item.barcode, -1)} className="w-10 h-10 bg-white/10 text-rose-500 flex items-center justify-center border border-white/10 rounded-xl"><Minus className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODALES DE SOPORTE */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                    <button onClick={() => setEditingItem(null)} className="absolute top-8 right-8 w-14 h-14 bg-white/5 text-white flex items-center justify-center rounded-full active:bg-rose-600 transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                    <div className="text-center mb-12">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mb-4 block">MANUAL_QUANTITY_CONTROL</span>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{editingItem.name}</h2>
                        {editingItem.loc && <div className="text-rose-500 font-black text-sm mt-2 flex items-center justify-center gap-2"><MapPin className="w-4 h-4"/> UBICACIÓN: {editingItem.loc}</div>}
                    </div>
                    <div className="flex items-center justify-center gap-10">
                        <button onClick={() => registerScan(editingItem.barcode, -1)} className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center"><Minus className="w-8 h-8" /></button>
                        <div className="text-9xl font-black text-white">{items.find(i => i.barcode === editingItem.barcode)?.totalQuantity || 0}</div>
                        <button onClick={() => registerScan(editingItem.barcode, 1)} className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center"><Plus className="w-8 h-8" /></button>
                    </div>
                    <button onClick={() => setEditingItem(null)} className="mt-20 w-full max-w-sm py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest">Confirmar Ajuste</button>
                </div>
            )}

            {viewingBarcode && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-0 animate-in fade-in duration-300">
                    <button onClick={() => setViewingBarcode(null)} className="absolute top-6 right-6 w-16 h-16 bg-slate-800 text-white flex items-center justify-center rounded-full active:bg-rose-600 z-[110] shadow-2xl border-2 border-white/10">
                        <X className="w-10 h-10"/>
                    </button>
                    <div className="w-full text-center mb-10 px-6">
                        <h2 className="text-black font-black text-xl uppercase tracking-tighter mb-2 line-clamp-1">{viewingBarcode.name}</h2>
                        <div className="bg-black text-white py-2 px-6 inline-block rounded-full font-mono text-lg font-black tracking-widest uppercase">SKU: {viewingBarcode.barcode}</div>
                        {viewingBarcode.loc && <div className="text-rose-600 font-black text-lg mt-4 flex items-center justify-center gap-2"><MapPin className="w-6 h-6"/> {viewingBarcode.loc}</div>}
                    </div>
                    <BarcodeRenderer value={viewingBarcode.barcode} />
                    <button onClick={() => setViewingBarcode(null)} className="mt-12 w-64 py-6 bg-slate-950 text-white rounded-3xl font-black uppercase tracking-widest">CERRAR VISOR</button>
                </div>
            )}

            {isFlash && <div className="absolute inset-0 z-[100] bg-blue-500/20 pointer-events-none flash-active"></div>}
        </div>
    );
};

export default MassiveBlindView;
