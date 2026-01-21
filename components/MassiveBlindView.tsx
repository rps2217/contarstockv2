
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Trash2, Plus, Minus, ScanLine, History, Loader2, Zap, Smartphone, Cpu, FileSpreadsheet, Save, CheckCircle2 } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';
import { exportMassiveToExcel } from '../services/massiveExport';
import { migrateMassiveToMaster } from '../services/massiveSync';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan } = useMassiveScanner(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [hwStatus, setHwStatus] = useState<'connected' | 'idle'>('connected');
    const [isMigrating, setIsMigrating] = useState(false);

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
            alert("Lote guardado en el historial. Ahora puedes sincronizarlo desde 'Gestor Nube'.");
            navigate('/dashboard');
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsMigrating(false);
        }
    };

    const toggleTrigger = (active: boolean) => {
        if (active !== isTriggerActive) {
            setIsTriggerActive(active);
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
                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic block truncate">MARTILLO_PRO_V4.5</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate block">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleExportExcel}
                        disabled={totalUnits === 0}
                        className="w-10 h-10 bg-emerald-600 text-white flex items-center justify-center rounded-lg border border-emerald-500/20 active:scale-90 transition-all disabled:opacity-30"
                        title="Exportar Excel"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleFinalize}
                        disabled={totalUnits === 0 || isMigrating}
                        className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-lg border border-blue-500/20 active:scale-90 transition-all disabled:opacity-30"
                        title="Finalizar y Mover a Historial"
                    >
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
                            <button onClick={() => setIsCameraActive(true)} className="bg-white text-black px-10 py-5 font-black text-[11px] uppercase tracking-[0.4em] border-b-[10px] border-slate-400 active:translate-y-2 active:border-b-0 transition-all rounded-none block w-full">
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
                    onMouseDown={() => toggleTrigger(true)}
                    onMouseUp={() => toggleTrigger(false)}
                    onTouchStart={() => toggleTrigger(true)}
                    onTouchEnd={() => toggleTrigger(false)}
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
                    <span className="text-[7px] font-black uppercase tracking-widest">{hwStatus === 'connected' ? 'PORT_HID:OK' : 'PORT:WAIT'}</span>
                </div>

                <div className="space-y-1.5 pb-10">
                    {items.map((item) => (
                        <div key={item.barcode} className="bg-slate-900/60 border border-white/5 p-3 rounded-xl flex items-center justify-between active:bg-blue-900/20 transition-colors">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1 h-1 rounded-full bg-blue-500 led-active"></div>
                                    <span className="text-[7px] font-black text-blue-500 font-mono uppercase tracking-tighter truncate">{item.barcode}</span>
                                </div>
                                <h3 className="text-white font-black text-[10px] uppercase truncate italic leading-none opacity-80">{item.name}</h3>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                    <div className="text-xl font-black text-white tabular-nums leading-none tracking-tighter">{item.totalQuantity}</div>
                                    <span className="text-[6px] font-bold text-white/20 uppercase tracking-widest mt-1 block">UNIT</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => registerScan(item.barcode, 1)} className="w-8 h-8 bg-white/5 text-white flex items-center justify-center border border-white/10 active:bg-blue-600 rounded-lg"><Plus className="w-4 h-4"/></button>
                                    <button onClick={() => registerScan(item.barcode, -1)} className="w-8 h-8 bg-white/5 text-rose-500 flex items-center justify-center border border-white/10 active:bg-rose-600 rounded-lg"><Minus className="w-4 h-4"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isFlash && <div className="absolute inset-0 z-[100] bg-blue-500/20 pointer-events-none flash-active"></div>}
        </div>
    );
};

export default MassiveBlindView;
