
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Trash2, Plus, Minus, ScanLine, History, Lock, Unlock, Loader2, Zap } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'MARTILLO-CORE' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan } = useMassiveScanner(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const handleReset = async () => {
        if (confirm("¿BORRAR CONTEO ACTUAL?")) {
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

    if (items === undefined) {
        return (
            <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Synching_DB...</span>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-slate-950 select-none overflow-hidden">
            
            <header className="h-20 px-8 flex items-center justify-between border-b-4 border-white/5 bg-slate-900 z-50 shrink-0">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate('/dashboard')} className="w-12 h-12 flex items-center justify-center bg-white/5 border-2 border-white/10 active:bg-blue-600 transition-colors rounded-xl">
                        <ChevronLeft className="w-8 h-8 text-white" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3 h-3 text-blue-500 fill-blue-500" />
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.5em] italic block">PROTOCOLO_MARTILLO</span>
                        </div>
                        <span className="text-xs text-white/40 font-black tracking-widest uppercase">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="text-right pr-6 border-r-2 border-white/5">
                        <div className="text-4xl font-black text-white tabular-nums leading-none tracking-tighter">{totalUnits}</div>
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1 block">Units_In_Batch</span>
                    </div>
                    <button onClick={handleReset} className="w-12 h-12 bg-rose-950/20 text-rose-500 flex items-center justify-center rounded-xl border-2 border-rose-500/20 active:bg-rose-600 active:text-white transition-all">
                        <Trash2 className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <div className="h-[35vh] relative shrink-0 bg-black overflow-hidden border-b-4 border-white/5">
                {isCameraActive ? (
                    <CameraScanner 
                        onScan={(code) => registerScan(code)} 
                        onClose={() => setIsCameraActive(false)} 
                        isTriggered={isTriggerActive}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
                        <div className="w-24 h-24 border-4 border-dashed border-white/10 rounded-full flex items-center justify-center">
                            <ScanLine className="w-10 h-10 text-white/10 animate-pulse" />
                        </div>
                        <button 
                            onClick={() => setIsCameraActive(true)}
                            className="bg-white text-black px-12 py-5 font-black text-sm uppercase tracking-[0.3em] border-b-[10px] border-slate-400 active:translate-y-2 active:border-b-0 transition-all rounded-none"
                        >
                            Open_Optics_Lens
                        </button>
                    </div>
                )}
                
                {lastScannedCode && !isFlash && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-8 py-3 font-black text-xs uppercase tracking-[0.3em] italic border-4 border-slate-950 shadow-2xl">
                        SKU: {lastScannedCode}
                    </div>
                )}
            </div>

            <div className="bg-slate-900 p-6 border-b-4 border-white/5 flex flex-col items-center shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <button 
                    onMouseDown={() => toggleTrigger(true)}
                    onMouseUp={() => toggleTrigger(false)}
                    onTouchStart={() => toggleTrigger(true)}
                    onTouchEnd={() => toggleTrigger(false)}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`
                        w-full h-32 transition-all duration-75 flex flex-col items-center justify-center gap-3 relative rounded-[2rem]
                        ${isTriggerActive 
                            ? 'bg-blue-600 translate-y-2 border-b-0 shadow-inner' 
                            : 'bg-white text-black border-b-[14px] border-slate-300 shadow-2xl'
                        }
                    `}
                >
                    {isTriggerActive ? (
                        <>
                            <Unlock className="w-12 h-12 text-white animate-pulse" />
                            <span className="text-sm font-black uppercase tracking-[0.5em] text-white">Capture_Mode_On</span>
                        </>
                    ) : (
                        <>
                            <ScanLine className="w-12 h-12" />
                            <span className="text-xl font-black uppercase tracking-[0.2em] italic">Hold_To_Shoot</span>
                        </>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-950 p-6">
                <div className="flex items-center gap-3 mb-6 opacity-30 px-2 border-b border-white/5 pb-4">
                    <History className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Line_Execution_Log</span>
                </div>

                <div className="space-y-3 pb-32">
                    {items.map((item) => (
                        <div key={item.barcode} className="bg-slate-900 border-2 border-white/5 p-6 flex items-center justify-between active:bg-blue-900/10 transition-colors rounded-3xl">
                            <div className="flex-1 min-w-0 pr-6">
                                <span className="text-[10px] font-black text-blue-500 font-mono tracking-[0.2em] block mb-2">{item.barcode}</span>
                                <h3 className="text-white font-black text-md uppercase truncate italic tracking-tighter">{item.name}</h3>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <div className="text-3xl font-black text-white tabular-nums leading-none tracking-tighter">{item.totalQuantity}</div>
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-2 block italic">Units_Reg</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => registerScan(item.barcode, 1)} className="w-14 h-12 bg-white/5 text-white flex items-center justify-center border-2 border-white/10 active:bg-blue-600 rounded-xl transition-colors"><Plus className="w-6 h-6 stroke-[3px]"/></button>
                                    <button onClick={() => registerScan(item.barcode, -1)} className="w-14 h-12 bg-white/5 text-rose-500 flex items-center justify-center border-2 border-white/10 active:bg-rose-600 active:text-white rounded-xl transition-colors"><Minus className="w-6 h-6 stroke-[3px]"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isFlash && (
                <div className="absolute inset-0 z-[100] bg-blue-500/40 pointer-events-none transition-all duration-75 animate-flash-step"></div>
            )}
        </div>
    );
};

export default MassiveBlindView;
