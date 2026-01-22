import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Trash2, Plus, Minus, ScanLine, History, Loader2, Zap, Cpu, FileSpreadsheet, Save, X, Barcode, AlertTriangle } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';
import { exportMassiveToExcel } from '../services/massiveExport';
import { migrateMassiveToMaster } from '../services/massiveSync';

/**
 * RENDERIZADOR TÁCTICO DE CÓDIGO DE BARRAS
 * Genera un patrón visual escaneable por hardware láser.
 */
const BarcodeRenderer: React.FC<{ value: string }> = ({ value }) => {
    if (!value) return null;
    
    // Diccionario simplificado de patrones Code 128 para representación visual
    const charTable: Record<string, string> = {
        '0': '11011001100', '1': '11001101100', '2': '11001100110', '3': '10010011000',
        '4': '10010001100', '5': '10001001100', '6': '10011001000', '7': '10011000100',
        '8': '10001100100', '9': '11001110100', 'A': '11101101100', 'B': '11101100110',
        'C': '11100110110', 'D': '11101101100', 'E': '11101100110', '-': '10010110110',
    };
    
    const start = '11010000100';
    const stop = '1100011101011';
    
    let pattern = start;
    for (const char of value.toUpperCase().substring(0, 15)) {
        pattern += charTable[char] || '10101110110';
    }
    pattern += stop;

    return (
        <div className="flex justify-center bg-white p-6 rounded-2xl">
            <svg viewBox={`0 0 ${pattern.length * 2} 80`} className="w-full h-40">
                {pattern.split('').map((bit, i) => (
                    bit === '1' ? <rect key={i} x={i * 2} y="0" width="2" height="80" fill="black" /> : null
                ))}
            </svg>
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
    
    // Estado de Modales
    const [editingItem, setEditingItem] = useState<ConsolidatedBlindItem | null>(null);
    const [viewingBarcode, setViewingBarcode] = useState<ConsolidatedBlindItem | null>(null);

    const handleReset = async () => {
        if (confirm("¿RESET BATCH? Se borrarán todos los datos actuales del modo martillo.")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    const handleManualAdjustment = async (barcode: string, delta: number, currentQty: number) => {
        const result = currentQty + delta;
        if (result <= 0) {
            if (confirm(`¿ELIMINAR ÍTEM?\nConfirmas eliminar por completo el SKU ${barcode} de este lote.`)) {
                await removeItemCompletely(barcode);
                setEditingItem(null);
            }
            return;
        }
        registerScan(barcode, delta);
    };

    // --- FIX: Added handleFinalize function to migrate data to master DB ---
    const handleFinalize = async () => {
        if (!items || items.length === 0) return;
        
        const confirmMsg = `¿FINALIZAR LOTE?\n\nSe migrarán ${totalUnits} unidades (${items.length} SKUs) al historial oficial y se vaciará el lote actual.`;
        if (!confirm(confirmMsg)) return;

        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId);
            navigate('/reports');
        } catch (err: any) {
            alert(`Error en migración: ${err.message}`);
        } finally {
            setIsMigrating(false);
        }
    };

    if (items === undefined) return (
        <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.5em]">INITIALIZING_LASER_CORE</span>
        </div>
    );

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-slate-950 select-none overflow-hidden">
            
            <header className="h-16 px-4 flex items-center justify-between border-b-4 border-white/5 bg-slate-900 z-50 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 active:bg-blue-600 shrink-0 rounded-lg">
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 led-active"></div>
                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic block truncate">MARTILLO_PRO_V4.7</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate block">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={() => exportMassiveToExcel(batchId, items)} disabled={totalUnits === 0} className="w-10 h-10 bg-emerald-600 text-white flex items-center justify-center rounded-lg border border-emerald-500/20 active:scale-90 transition-all">
                        <FileSpreadsheet className="w-5 h-5" />
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
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8 text-center bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]">
                        <div className="w-20 h-20 border-4 border-dashed border-white/10 rounded-full flex items-center justify-center">
                            <Cpu className="w-8 h-8 text-blue-500/30 animate-pulse" />
                        </div>
                        <button onClick={() => setIsCameraActive(true)} className="bg-white text-black px-10 py-5 font-black text-[11px] uppercase tracking-[0.4em] border-b-[10px] border-slate-400 active:translate-y-2 active:border-b-0 transition-all rounded-none block w-full shadow-2xl">
                            ACTIVATE_OPTICS
                        </button>
                    </div>
                )}
                
                <div className="absolute top-4 right-4 z-50">
                     <div className="bg-black/60 backdrop-blur-md border-2 border-white/10 p-3 rounded-2xl flex items-center gap-4 shadow-2xl">
                        <div className="text-right">
                            <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">{totalUnits}</div>
                            <span className="text-[6px] font-black text-white/40 uppercase tracking-[0.2em] mt-1 block">TOTAL_UNITS</span>
                        </div>
                        <div className="text-right border-l border-white/10 pl-4">
                            <div className="text-2xl font-black text-blue-500 tabular-nums leading-none tracking-tighter">{items.length}</div>
                            <span className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 block">SKUS</span>
                        </div>
                     </div>
                </div>
            </div>

            <div className="bg-slate-900 p-4 border-b-4 border-white/5 shrink-0 z-40">
                <button 
                    onMouseDown={() => setIsTriggerActive(true)}
                    onMouseUp={() => setIsTriggerActive(false)}
                    onTouchStart={() => setIsTriggerActive(true)}
                    onTouchEnd={() => setIsTriggerActive(false)}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`w-full h-28 transition-all flex flex-col items-center justify-center gap-3 relative rounded-2xl ${
                        isTriggerActive ? 'bg-blue-600 translate-y-1 shadow-inner' : 'bg-slate-100 text-slate-900 border-b-[12px] border-slate-400 shadow-xl'
                    }`}
                >
                    {isTriggerActive ? (
                        <>
                            <Zap className="w-10 h-10 text-white animate-bounce" />
                            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white">BURST_ACTIVE</span>
                        </>
                    ) : (
                        <>
                            <ScanLine className="w-10 h-10 text-slate-400" />
                            <span className="text-lg font-black uppercase tracking-[0.2em] italic">ZAP_OR_SCAN</span>
                        </>
                    )}
                </button>
            </div>

            <div className="h-[28vh] overflow-y-auto no-scrollbar bg-slate-950 p-3">
                <div className="space-y-1.5 pb-24">
                    {items.map((item) => (
                        <div key={item.barcode} className="bg-slate-900/60 border border-white/5 p-2 rounded-xl flex items-center justify-between active:bg-blue-900/10 transition-colors">
                            <div className="flex-1 min-w-0 pr-4 py-2" onClick={() => setViewingBarcode(item)}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-blue-500 led-active"></div>
                                    <span className="text-[8px] font-black text-blue-500 font-mono uppercase tracking-tighter truncate">{item.barcode}</span>
                                </div>
                                <h3 className="text-white font-black text-[10px] uppercase truncate italic opacity-80">{item.name}</h3>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right px-2 min-w-[70px]" onClick={() => setEditingItem(item)}>
                                    <div className="text-3xl font-black text-white tabular-nums leading-none tracking-tighter">{item.totalQuantity}</div>
                                    <span className="text-[6px] font-bold text-white/20 uppercase tracking-widest mt-1 block">UNIT</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={(e) => { e.stopPropagation(); registerScan(item.barcode, 1); }} className="w-14 h-14 bg-white/5 text-white flex items-center justify-center border border-white/10 active:bg-blue-600 rounded-xl"><Plus className="w-6 h-6"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleManualAdjustment(item.barcode, -1, item.totalQuantity); }} className="w-14 h-14 bg-white/5 text-rose-500 flex items-center justify-center border border-white/10 active:bg-rose-600 active:text-white rounded-xl"><Minus className="w-6 h-6"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* BOTÓN FLOTANTE DE FINALIZAR */}
            {totalUnits > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4">
                    <button 
                        onClick={handleFinalize} 
                        disabled={isMigrating}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all border-b-4 border-blue-900"
                    >
                        {isMigrating ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                        <span className="uppercase tracking-widest text-xs">GUARDAR LOTE</span>
                    </button>
                </div>
            )}

            {/* MODAL 1: EDITOR GIGANTE DE CANTIDAD */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                    <button onClick={() => setEditingItem(null)} className="absolute top-8 right-8 w-14 h-14 bg-white/5 text-white flex items-center justify-center rounded-full active:bg-rose-600">
                        <X className="w-8 h-8" />
                    </button>
                    
                    <div className="text-center mb-8">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mb-4 block">MANUAL_QUANTITY_OVERRIDE</span>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter max-w-sm mx-auto">{editingItem.name}</h2>
                    </div>

                    <div className="flex flex-col items-center gap-10 w-full max-w-md">
                        <div className="flex items-center justify-center gap-12">
                            <button 
                                onClick={() => handleManualAdjustment(editingItem.barcode, -1, items?.find(i => i.barcode === editingItem.barcode)?.totalQuantity || 0)} 
                                className="w-32 h-32 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-[0_15px_0_#94a3b8] active:translate-y-2 active:shadow-none transition-all"
                            >
                                <Minus className="w-16 h-16" />
                            </button>
                            
                            <div className="text-[15rem] font-black text-white tabular-nums leading-none tracking-tighter drop-shadow-[0_0_50px_rgba(59,130,246,0.4)]">
                                {items?.find(i => i.barcode === editingItem.barcode)?.totalQuantity || 0}
                            </div>

                            <button 
                                onClick={() => registerScan(editingItem.barcode, 1)} 
                                className="w-32 h-32 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_15px_0_#1e3a8a] active:translate-y-2 active:shadow-none transition-all"
                            >
                                <Plus className="w-16 h-16" />
                            </button>
                        </div>

                        <button 
                            onClick={() => setEditingItem(null)}
                            className="w-full h-24 bg-white text-slate-950 rounded-[2rem] font-black text-sm uppercase tracking-[0.5em] active:scale-95 transition-all mt-10"
                        >
                            CONFIRM_UPDATE
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL 2: VISOR DE SKU Y CÓDIGO ESCANEABLE */}
            {viewingBarcode && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 animate-in slide-in-from-bottom-10 duration-300">
                    <button onClick={() => setViewingBarcode(null)} className="absolute top-8 right-8 w-16 h-16 bg-slate-100 text-slate-900 flex items-center justify-center rounded-full active:bg-black active:text-white transition-all">
                        <X className="w-8 h-8" />
                    </button>
                    
                    <div className="w-full max-w-xl text-center space-y-12">
                        <div>
                            <div className="flex items-center justify-center gap-3 mb-4 opacity-30">
                                <Barcode className="w-6 h-6" />
                                <span className="text-xs font-black uppercase tracking-[0.4em]">Optical_Reference_Core</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{viewingBarcode.name}</h2>
                        </div>

                        <div className="border-[16px] border-slate-50 rounded-[3rem] p-10 shadow-2xl">
                             <BarcodeRenderer value={viewingBarcode.barcode} />
                        </div>

                        <div className="bg-slate-950 p-10 rounded-[3rem] shadow-2xl">
                             <div className="text-7xl md:text-8xl font-black text-blue-500 font-mono tracking-widest break-all">
                                {viewingBarcode.barcode}
                             </div>
                             <span className="text-white/20 font-black uppercase text-[10px] tracking-[0.8em] mt-8 block">Ready_for_laser_capture</span>
                        </div>

                        <button 
                            onClick={() => setViewingBarcode(null)}
                            className="w-full py-6 bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                        >
                            Cerrar Visor
                        </button>
                    </div>
                </div>
            )}

            {isFlash && <div className="absolute inset-0 z-[100] bg-blue-500/20 pointer-events-none flash-active"></div>}
        </div>
    );
};

export default MassiveBlindView;