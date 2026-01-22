
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Trash2, Plus, Minus, ScanLine, History, Loader2, Zap, Cpu, FileSpreadsheet, Save, X, Barcode, AlertTriangle } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';
import { exportMassiveToExcel } from '../services/massiveExport';
import { migrateMassiveToMaster } from '../services/massiveSync';

/**
 * RENDERIZADOR TÁCTICO DE CÓDIGO DE BARRAS - TAMAÑO INDUSTRIAL XL
 * Genera un patrón visual de alto contraste y altura masiva optimizado para captura láser.
 */
const BarcodeRenderer: React.FC<{ value: string }> = ({ value }) => {
    if (!value) return null;
    
    // Diccionario de patrones para representación visual (Code 39 Sim)
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
    
    for (const char of safeValue) {
        pattern += charTable[char] || '10101010110';
    }
    pattern += stop;

    return (
        <div className="bg-white p-4 w-full flex flex-col items-center">
            {/* Zona de silencio superior */}
            <div className="w-full h-8 bg-white"></div>
            
            {/* El patrón de barras - Ocupa todo el ancho posible */}
            <div className="flex w-full h-64 items-stretch justify-center bg-white px-2">
                {pattern.split('').map((bit, i) => (
                    <div 
                        key={i} 
                        className={`${bit === '1' ? 'bg-black' : 'bg-transparent'} flex-1`} 
                        style={{ minWidth: '1px' }}
                    />
                ))}
            </div>
            
            {/* Zona de silencio inferior */}
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
    
    // Modales de Interacción Avanzada
    const [editingItem, setEditingItem] = useState<ConsolidatedBlindItem | null>(null);
    const [viewingBarcode, setViewingBarcode] = useState<ConsolidatedBlindItem | null>(null);

    const handleReset = async () => {
        if (confirm("¿RESET BATCH? Se borrarán todos los datos actuales del modo martillo.")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    const handleExportExcel = () => {
        if (!items || items.length === 0) return;
        exportMassiveToExcel(batchId, items);
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

    const handleManualAdjustment = async (barcode: string, delta: number, currentQty: number) => {
        if (currentQty + delta <= 0) {
            if (confirm(`¿Deseas eliminar el ítem ${barcode} del lote?`)) {
                await removeItemCompletely(barcode);
                setEditingItem(null);
            }
            return;
        }
        registerScan(barcode, delta);
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
                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic block truncate">MARTILLO_PRO_V4.5</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate block">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={handleExportExcel} disabled={totalUnits === 0} className="w-10 h-10 bg-emerald-600 text-white flex items-center justify-center rounded-lg border border-emerald-500/20 active:scale-90 transition-all disabled:opacity-30">
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                    <button onClick={handleFinalize} disabled={totalUnits === 0 || isMigrating} className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-lg border border-blue-500/20 active:scale-90 transition-all disabled:opacity-30">
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
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8 text-center bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]">
                        <div className="w-20 h-20 border-4 border-dashed border-white/10 rounded-full flex items-center justify-center">
                            <Cpu className="w-8 h-8 text-blue-500/30 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <button onClick={() => setIsCameraActive(true)} className="bg-white text-black px-10 py-5 font-black text-[11px] uppercase tracking-[0.4em] border-b-[10px] border-slate-400 active:translate-y-2 active:border-b-0 transition-all rounded-none block w-full shadow-2xl shadow-white/5">
                                ACTIVATE_OPTICS
                            </button>
                            <div className="flex items-center justify-center gap-2 text-emerald-500/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 led-active"></div>
                                <span className="text-[7px] font-black uppercase tracking-widest">Hardware_HID_Ready</span>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="absolute top-4 right-4 z-50">
                     <div className="bg-black/60 backdrop-blur-md border-2 border-white/10 p-3 rounded-2xl flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">{totalUnits}</div>
                            <span className="text-[6px] font-black text-white/40 uppercase tracking-[0.2em] mt-1 block">TOTAL_UNITS</span>
                        </div>
                        <div className="text-right border-l border-white/10 pl-4">
                            <div className="text-2xl font-black text-blue-500 tabular-nums leading-none tracking-tighter">{items.length}</div>
                            <span className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 block">UNIQUE_SKUS</span>
                        </div>
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
                            <div className="absolute inset-0 bg-blue-400/10 animate-pulse"></div>
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
                <div className="flex items-center justify-between mb-3 opacity-20 px-1">
                    <div className="flex items-center gap-2">
                        <History className="w-3 h-3" />
                        <span className="text-[7px] font-black uppercase tracking-widest">REALTIME_LOG</span>
                    </div>
                    <span className="text-[7px] font-black uppercase tracking-widest">PORT_HID:OK</span>
                </div>

                <div className="space-y-1.5 pb-20">
                    {items.map((item) => (
                        <div key={item.barcode} className="bg-slate-900/60 border border-white/5 p-2 rounded-xl flex items-center justify-between active:bg-blue-900/20 transition-colors">
                            {/* ÁREA IZQUIERDA: SKU/DESCRIPTOR */}
                            <div className="flex-1 min-w-0 pr-4 py-2" onClick={() => setViewingBarcode(item)}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-blue-500 led-active"></div>
                                    <span className="text-[8px] font-black text-blue-500 font-mono uppercase tracking-tighter truncate">{item.barcode}</span>
                                </div>
                                <h3 className="text-white font-black text-[10px] uppercase truncate italic opacity-80">{item.name}</h3>
                            </div>
                            
                            {/* ÁREA DERECHA: CANTIDAD Y BOTONES REFORZADOS */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right px-2 min-w-[60px]" onClick={() => setEditingItem(item)}>
                                    <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">{item.totalQuantity}</div>
                                    <span className="text-[6px] font-bold text-white/20 uppercase tracking-widest mt-1 block">UNIT</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => registerScan(item.barcode, 1)} className="w-12 h-12 bg-white/10 text-white flex items-center justify-center border border-white/10 active:bg-blue-600 rounded-xl transition-all shadow-lg shadow-black/20"><Plus className="w-6 h-6"/></button>
                                    <button onClick={() => handleManualAdjustment(item.barcode, -1, item.totalQuantity)} className="w-12 h-12 bg-white/10 text-rose-500 flex items-center justify-center border border-white/10 active:bg-rose-600 active:text-white rounded-xl transition-all shadow-lg shadow-black/20"><Minus className="w-6 h-6"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL: EDITOR GIGANTE DE CANTIDAD */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                    <button onClick={() => setEditingItem(null)} className="absolute top-8 right-8 w-14 h-14 bg-white/5 text-white flex items-center justify-center rounded-full active:bg-rose-600 transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                    
                    <div className="text-center mb-12">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mb-4 block">MANUAL_QUANTITY_CONTROL</span>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter max-w-sm mx-auto">{editingItem.name}</h2>
                        <span className="font-mono text-white/40 text-sm mt-2 block">{editingItem.barcode}</span>
                    </div>

                    <div className="flex flex-col items-center gap-12 w-full max-w-md">
                        <button 
                            onClick={() => handleManualAdjustment(editingItem.barcode, 5, editingItem.totalQuantity)} 
                            className="w-full h-24 bg-blue-600/20 border-2 border-blue-500/40 text-blue-400 rounded-[2rem] font-black text-xl active:bg-blue-600 active:text-white flex items-center justify-center gap-3"
                        >
                            <Plus className="w-8 h-8" /> 5 UNITS
                        </button>

                        <div className="flex items-center justify-center gap-10">
                            <button onClick={() => handleManualAdjustment(editingItem.barcode, -1, editingItem.totalQuantity)} className="w-32 h-32 bg-white text-black rounded-full flex items-center justify-center shadow-[0_15px_0_#94a3b8] active:translate-y-2 active:shadow-none transition-all">
                                <Minus className="w-12 h-12" />
                            </button>
                            
                            <div className="text-[12rem] font-black text-white tabular-nums leading-none tracking-tighter drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                {items.find(i => i.barcode === editingItem.barcode)?.totalQuantity || 0}
                            </div>

                            <button onClick={() => handleManualAdjustment(editingItem.barcode, 1, editingItem.totalQuantity)} className="w-32 h-32 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_15px_0_#1d4ed8] active:translate-y-2 active:shadow-none transition-all">
                                <Plus className="w-12 h-12" />
                            </button>
                        </div>

                        <button 
                            onClick={() => setEditingItem(null)}
                            className="w-full h-20 bg-white text-slate-900 rounded-3xl font-black text-sm uppercase tracking-[0.4em] active:scale-95 transition-all mt-10"
                        >
                            CONFIRM_ADJUSTMENT
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: VISOR DE SKU / CÓDIGO (TAMAÑO INDUSTRIAL) */}
            {viewingBarcode && (
                <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-0 animate-in fade-in duration-300">
                    {/* Botón de cerrar sólido para evitar efecto de mancha */}
                    <button 
                        onClick={() => setViewingBarcode(null)} 
                        className="absolute top-6 right-6 w-16 h-16 bg-slate-800 text-white flex items-center justify-center rounded-full active:bg-rose-600 transition-all z-[110] shadow-2xl border-2 border-white/10"
                    >
                        <X className="w-10 h-10"/>
                    </button>
                    
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white p-4">
                        <div className="w-full max-w-2xl text-center mb-10">
                            <h2 className="text-black font-black text-xl uppercase tracking-tighter mb-2 line-clamp-1">{viewingBarcode.name}</h2>
                            <div className="bg-black text-white py-2 px-6 inline-block rounded-full font-mono text-lg font-black tracking-widest uppercase">
                                SKU: {viewingBarcode.barcode}
                            </div>
                        </div>

                        {/* EL CÓDIGO DE BARRAS REALMENTE GIGANTE */}
                        <div className="w-full flex justify-center items-center overflow-hidden mb-12">
                            <BarcodeRenderer value={viewingBarcode.barcode} />
                        </div>

                        <div className="w-full max-w-sm px-6">
                            <div className="text-center text-slate-400 font-bold uppercase tracking-[0.5em] text-[10px] mb-8 animate-pulse">
                                READY_FOR_LASER_CAPTURE
                            </div>
                            <button 
                                onClick={() => setViewingBarcode(null)}
                                className="w-full py-8 bg-slate-950 text-white rounded-3xl font-black uppercase tracking-widest text-lg active:scale-95 transition-all shadow-2xl border-2 border-white/20"
                            >
                                CERRAR VISOR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isFlash && <div className="absolute inset-0 z-[100] bg-blue-500/20 pointer-events-none flash-active"></div>}
        </div>
    );
};

export default MassiveBlindView;
