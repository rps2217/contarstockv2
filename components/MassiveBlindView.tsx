
import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Trash2, Plus, Minus, ScanLine, History, Loader2, Zap, Cpu, FileSpreadsheet, Save, X, Barcode } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';
import { exportMassiveToExcel } from '../services/massiveExport';
import { migrateMassiveToMaster } from '../services/massiveSync';

/**
 * Generador de Código de Barras Code 128 (Simplificado para SVG)
 * Permite que el SKU se convierta en barras reales escaneables.
 */
const Barcode128: React.FC<{ value: string }> = ({ value }) => {
    // Patrones de Code 128 (B) - Simplificados para representación visual escaneable
    const charTable: Record<string, string> = {
        '0': '11011001100', '1': '11001101100', '2': '11001100110', '3': '10010011000',
        '4': '10010001100', '5': '10001001100', '6': '10011001000', '7': '10011000100',
        '8': '10001100100', '9': '11001110100', 'A': '11101101100', 'B': '11101100110',
        'C': '11100110110', 'D': '11101101100', 'E': '11101100110', '-': '10010110110',
        '_': '11010111010', '.': '11011101010'
    };
    
    const start = '11010000100'; // Start B
    const stop = '1100011101011';
    
    const renderBars = () => {
        let pattern = start;
        for (const char of value.toUpperCase()) {
            pattern += charTable[char] || '10101110110'; // Fallback simple
        }
        pattern += stop;
        
        return pattern.split('').map((bit, i) => (
            bit === '1' ? <rect key={i} x={i * 2} y="0" width="2" height="100" fill="black" /> : null
        ));
    };

    return (
        <svg viewBox={`0 0 ${(value.length * 11 + 25) * 2} 100`} className="w-full h-48 md:h-64">
            {renderBars()}
        </svg>
    );
};

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan, removeItemCompletely } = useMassiveScanner(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    
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

    // CORRECCIÓN: Solo preguntar eliminación cuando la cantidad llega a 0
    const handleManualAdjustment = async (barcode: string, delta: number, currentQty: number) => {
        const resultQty = currentQty + delta;
        
        if (resultQty <= 0) {
            if (confirm(`¿Deseas eliminar el ítem ${barcode} del lote?`)) {
                await removeItemCompletely(barcode);
                setEditingItem(null);
            }
            return;
        }
        
        // Si no llega a cero, simplemente registramos el cambio (delta puede ser negativo)
        registerScan(barcode, delta);
    };

    if (items === undefined) return (
        <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <span className="text-[8px] font-black uppercase tracking-[0.5em]">INITIALIZING_LASER_CORE</span>
        </div>
    );

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-slate-950 select-none overflow-hidden text-white">
            
            <header className="h-16 px-4 flex items-center justify-between border-b-4 border-white/5 bg-slate-900 z-50 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 active:bg-blue-600 shrink-0 rounded-lg">
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 led-active"></div>
                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic block truncate">MARTILLO_PRO_V4.6</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate block">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={handleExportExcel} disabled={totalUnits === 0} className="w-10 h-10 bg-emerald-600 text-white flex items-center justify-center rounded-lg border border-emerald-500/20 active:scale-90 disabled:opacity-30">
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                    <button onClick={handleFinalize} disabled={totalUnits === 0 || isMigrating} className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-lg border border-blue-500/20 active:scale-90 disabled:opacity-30">
                        {isMigrating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                    <button onClick={handleReset} className="w-10 h-10 bg-rose-950/20 text-rose-500 flex items-center justify-center rounded-lg border border-rose-500/10 active:bg-rose-600 active:text-white">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="flex-1 min-h-0 relative bg-black overflow-hidden border-b-4 border-white/5">
                {isCameraActive ? (
                    <CameraScanner onScan={registerScan} onClose={() => setIsCameraActive(false)} isTriggered={isTriggerActive} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8 text-center bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]">
                        <div className="w-20 h-20 border-4 border-dashed border-white/10 rounded-full flex items-center justify-center text-blue-500/30">
                            <Cpu className="w-8 h-8 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <button onClick={() => setIsCameraActive(true)} className="bg-white text-black px-10 py-5 font-black text-[11px] uppercase tracking-[0.4em] border-b-[10px] border-slate-400 active:translate-y-2 active:border-b-0 transition-all block w-full shadow-2xl">
                                ACTIVATE_OPTICS
                            </button>
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
            </div>

            <div className="bg-slate-900 p-4 border-b-4 border-white/5 shrink-0 z-40">
                <button 
                    onMouseDown={() => setIsTriggerActive(true)}
                    onMouseUp={() => setIsTriggerActive(false)}
                    onTouchStart={() => setIsTriggerActive(true)}
                    onTouchEnd={() => setIsTriggerActive(false)}
                    className={`w-full h-28 transition-all flex flex-col items-center justify-center gap-3 relative rounded-2xl ${
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
                            <span className="text-lg font-black uppercase tracking-[0.2em] italic text-slate-700">TOUCH_OR_ZAP</span>
                        </>
                    )}
                </button>
            </div>

            <div className="h-[30vh] overflow-y-auto no-scrollbar bg-slate-950 p-3">
                <div className="space-y-1.5 pb-20">
                    {items.map((item) => (
                        <div key={item.barcode} className="bg-slate-900/60 border border-white/5 p-2 rounded-xl flex items-center justify-between active:bg-blue-900/20">
                            {/* IZQUIERDA: SKU (Abre Visor Plenitud) */}
                            <div className="flex-1 min-w-0 pr-4 py-2" onClick={() => setViewingBarcode(item)}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-blue-500 led-active"></div>
                                    <span className="text-[8px] font-black text-blue-500 font-mono uppercase tracking-tighter truncate">{item.barcode}</span>
                                </div>
                                <h3 className="text-white font-black text-[10px] uppercase truncate italic opacity-80">{item.name}</h3>
                            </div>
                            
                            {/* DERECHA: Cantidad (Abre Editor Gigante) */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right px-2 min-w-[60px]" onClick={() => setEditingItem(item)}>
                                    <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">{item.totalQuantity}</div>
                                    <span className="text-[6px] font-bold text-white/20 uppercase tracking-widest mt-1 block">UNIT</span>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => registerScan(item.barcode, 1)} className="w-12 h-12 bg-white/10 text-white flex items-center justify-center border border-white/10 active:bg-blue-600 rounded-xl transition-all"><Plus className="w-6 h-6"/></button>
                                    <button onClick={() => handleManualAdjustment(item.barcode, -1, item.totalQuantity)} className="w-12 h-12 bg-white/10 text-rose-500 flex items-center justify-center border border-white/10 active:bg-rose-600 active:text-white rounded-xl transition-all"><Minus className="w-6 h-6"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL: EDITOR GIGANTE DE CANTIDAD */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-200">
                    <button onClick={() => setEditingItem(null)} className="absolute top-8 right-8 w-14 h-14 bg-white/5 text-white flex items-center justify-center rounded-full active:bg-rose-600">
                        <X className="w-8 h-8" />
                    </button>
                    
                    <div className="text-center mb-12">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mb-4 block">MANUAL_QUANTITY_CONTROL</span>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter max-w-sm mx-auto">{editingItem.name}</h2>
                    </div>

                    <div className="flex flex-col items-center gap-12 w-full max-w-md">
                        <div className="flex items-center justify-center gap-8">
                            {/* Decrementar */}
                            <button onClick={() => handleManualAdjustment(editingItem.barcode, -1, items.find(i => i.barcode === editingItem.barcode)?.totalQuantity || 0)} className="w-32 h-32 bg-white text-black rounded-full flex items-center justify-center shadow-[0_15px_0_#94a3b8] active:translate-y-2 active:shadow-none transition-all">
                                <Minus className="w-12 h-12" />
                            </button>
                            
                            {/* Número Gigante */}
                            <div className="text-[14rem] font-black text-white tabular-nums leading-none tracking-tighter drop-shadow-[0_0_30px_rgba(59,130,246,0.3)] min-w-[250px] text-center">
                                {items.find(i => i.barcode === editingItem.barcode)?.totalQuantity || 0}
                            </div>

                            {/* Incrementar */}
                            <button onClick={() => registerScan(editingItem.barcode, 1)} className="w-32 h-32 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_15px_0_#1d4ed8] active:translate-y-2 active:shadow-none transition-all">
                                <Plus className="w-12 h-12" />
                            </button>
                        </div>

                        <button onClick={() => setEditingItem(null)} className="w-full h-24 bg-white text-slate-900 rounded-3xl font-black text-sm uppercase tracking-[0.4em] active:scale-95 transition-all mt-10">
                            CONFIRM_ADJUSTMENT
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL: VISOR DE CÓDIGO PLENITUD (MAX CONTRASTE PARA ESCÁNER) */}
            {viewingBarcode && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-0 animate-in fade-in duration-300">
                    {/* Botón cerrar minimalista pero accesible */}
                    <button onClick={() => setViewingBarcode(null)} className="absolute top-8 right-8 w-16 h-16 bg-slate-100 text-slate-900 flex items-center justify-center rounded-full active:bg-black active:text-white transition-all">
                        <X className="w-10 h-10" />
                    </button>
                    
                    <div className="w-full px-12 text-center">
                        {/* Descriptor de apoyo */}
                        <div className="mb-8">
                             <h2 className="text-slate-400 font-bold text-lg uppercase tracking-widest mb-1">{viewingBarcode.name}</h2>
                             <div className="h-1 w-20 bg-blue-500 mx-auto rounded-full opacity-50"></div>
                        </div>
                        
                        {/* CÓDIGO DE BARRAS REAL (Pattern de barras para hardware láser) */}
                        <div className="bg-white border-[20px] border-white shadow-[0_0_80px_rgba(0,0,0,0.05)] rounded-[4rem] p-10 mb-10">
                            <Barcode128 value={viewingBarcode.barcode} />
                        </div>

                        {/* SKU en números masivos (Plenitud) */}
                        <div className="bg-slate-50 py-10 rounded-[3rem] border-2 border-slate-100">
                            <div className="text-7xl md:text-9xl font-black text-black tracking-tighter font-mono break-all leading-none">
                                {viewingBarcode.barcode}
                            </div>
                            <span className="text-slate-400 font-black uppercase text-xs tracking-[0.5em] mt-6 block">Ready_to_Scan</span>
                        </div>
                    </div>
                    
                    {/* Footer informativo para el operador */}
                    <div className="absolute bottom-12 text-slate-300 font-black text-[10px] uppercase tracking-[0.6em]">
                        Industrial_Barcode_Renderer_v1.0
                    </div>
                </div>
            )}

            {isFlash && <div className="absolute inset-0 z-[100] bg-blue-500/20 pointer-events-none flash-active"></div>}
        </div>
    );
};

export default MassiveBlindView;
