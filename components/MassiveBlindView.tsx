
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Trash2, Plus, Minus, ScanLine, History, Lock, Unlock, Loader2, Zap, Smartphone } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan } = useMassiveScanner(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const handleReset = async () => {
        if (confirm("¿RESET BATCH?")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    const toggleTrigger = (active: boolean) => {
        if (active !== isTriggerActive) {
            if (active && navigator.vibrate) navigator.vibrate(20);
            setIsTriggerActive(active);
        }
    };

    if (items === undefined) return (
        <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.5em]">BUFFER_SYNC_INITIALIZING</span>
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
                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest italic block truncate">MARTILLO_V4.2</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate block">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0 ml-2">
                    <div className="text-right pr-3 border-r border-white/10">
                        <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">{totalUnits}</div>
                        <span className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] mt-1 block">REG_UNITS</span>
                    </div>
                    <button onClick={handleReset} className="w-9 h-9 bg-rose-950/20 text-rose-500 flex items-center justify-center rounded-lg border border-rose-500/10 active:bg-rose-600 active:text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="flex-1 min-h-0 relative bg-black overflow-hidden border-b-4 border-white/5">
                {isCameraActive ? (
                    <CameraScanner onScan={registerScan} onClose={() => setIsCameraActive(false)} isTriggered={isTriggerActive} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8 text-center bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]">
                        <div className="w-20 h-20 border-4 border-dashed border-white/10 rounded-full flex items-center justify-center animate-[radar-pulse_2s_infinite]">
                            <Smartphone className="w-8 h-8 text-white/10" />
                        </div>
                        <button onClick={() => setIsCameraActive(true)} className="bg-white text-black px-10 py-5 font-black text-[11px] uppercase tracking-[0.4em] border-b-[10px] border-slate-400 active:translate-y-2 active:border-b-0 transition-all rounded-none">
                            INIT_OPTICS
                        </button>
                    </div>
                )}
                
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
                            <Unlock className="w-10 h-10 text-white animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white">CAPTURING_ACTIVE</span>
                        </>
                    ) : (
                        <>
                            <ScanLine className="w-10 h-10 text-slate-400" />
                            <span className="text-lg font-black uppercase tracking-[0.2em] italic">SHOOT_BURST</span>
                        </>
                    )}
                </button>
            </div>

            <div className="h-[28vh] overflow-y-auto no-scrollbar bg-slate-950 p-3">
                <div className="flex items-center gap-2 mb-3 opacity-20 px-1">
                    <History className="w-3 h-3" />
                    <span className="text-[7px] font-black uppercase tracking-widest">LIVE_DATA_STREAM</span>
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
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right">
                                    <div className="text-xl font-black text-white tabular-nums leading-none tracking-tighter">{item.totalQuantity}</div>
                                    <span className="text-[6px] font-bold text-white/20 uppercase tracking-widest mt-1 block">UNIT</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => registerScan(item.barcode, 1)} className="w-9 h-9 bg-white/5 text-white flex items-center justify-center border border-white/10 active:bg-blue-600 rounded-lg"><Plus className="w-4 h-4"/></button>
                                    <button onClick={() => registerScan(item.barcode, -1)} className="w-9 h-9 bg-white/5 text-rose-500 flex items-center justify-center border border-white/10 active:bg-rose-600 rounded-lg"><Minus className="w-4 h-4"/></button>
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
