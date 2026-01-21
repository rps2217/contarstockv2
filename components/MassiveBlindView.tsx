
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Zap, Box, Trash2, Plus, Minus, ScanLine, Smartphone, History, Lock, Unlock } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'MARTILLO-01' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan } = useMassiveScanner(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const handleReset = async () => {
        if (confirm("¿BORRAR TODO EL CONTEO?")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    const toggleTrigger = (active: boolean) => {
        if (active !== isTriggerActive) {
            if (active && navigator.vibrate) navigator.vibrate(15);
            setIsTriggerActive(active);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-black select-none overflow-hidden">
            
            <header className="h-16 px-6 flex items-center justify-between border-b-4 border-white/5 bg-black z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/10 active:bg-blue-600 transition-colors">
                        <ChevronLeft className="w-8 h-8 text-white" />
                    </button>
                    <div>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em] italic block">PROTOCOLO_MARTILLO</span>
                        <span className="text-xs text-white font-black tracking-tighter uppercase opacity-40">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right pr-4 border-r border-white/10">
                        <div className="text-3xl font-black text-white tabular-nums leading-none tracking-tighter">{totalUnits}</div>
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Unidades_Batch</span>
                    </div>
                    <button onClick={handleReset} className="w-10 h-10 text-rose-600 active:bg-rose-600 active:text-white transition-all">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="h-[35vh] relative shrink-0 bg-[#050505] overflow-hidden">
                {isCameraActive ? (
                    <CameraScanner 
                        onScan={(code) => registerScan(code)} 
                        onClose={() => setIsCameraActive(false)} 
                        isTriggered={isTriggerActive}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <button 
                            onClick={() => setIsCameraActive(true)}
                            className="bg-white text-black px-10 py-5 font-black text-sm uppercase tracking-widest border-b-8 border-slate-300 active:translate-y-1 active:border-b-0"
                        >
                            Inicializar_Lente
                        </button>
                    </div>
                )}
                
                {lastScannedCode && !isFlash && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-2 font-black text-[10px] uppercase tracking-[0.3em] italic border-2 border-black">
                        SKU: {lastScannedCode}
                    </div>
                )}
            </div>

            {/* GATILLO INDUSTRIAL (MAXIMIZADO) */}
            <div className="bg-[#0a0a0a] p-4 border-y-4 border-white/5 flex flex-col items-center shrink-0">
                <button 
                    onMouseDown={() => toggleTrigger(true)}
                    onMouseUp={() => toggleTrigger(false)}
                    onTouchStart={() => toggleTrigger(true)}
                    onTouchEnd={() => toggleTrigger(false)}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`
                        w-full h-28 transition-all duration-75 flex flex-col items-center justify-center gap-2 relative
                        ${isTriggerActive 
                            ? 'bg-blue-600 translate-y-2' 
                            : 'bg-white text-black border-b-[12px] border-slate-300'
                        }
                    `}
                >
                    {isTriggerActive ? (
                        <>
                            <Unlock className="w-10 h-10 text-white" />
                            <span className="text-xs font-black uppercase tracking-[0.5em] text-white">Lente_Abierto</span>
                        </>
                    ) : (
                        <>
                            <ScanLine className="w-10 h-10" />
                            <span className="text-lg font-black uppercase tracking-widest italic">Mantener_Gatillo</span>
                        </>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar bg-black p-4">
                <div className="flex items-center gap-3 mb-4 opacity-30 px-2">
                    <History className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Log_De_Línea</span>
                </div>

                <div className="space-y-2 pb-20">
                    {items?.map((item) => (
                        <div key={item.barcode} className="bg-[#0f0f0f] border-2 border-white/5 p-4 flex items-center justify-between active:bg-blue-900/20 transition-colors">
                            <div className="flex-1 min-w-0 pr-4">
                                <span className="text-[9px] font-black text-blue-500 font-mono tracking-widest block mb-1">{item.barcode}</span>
                                <h3 className="text-white font-black text-sm uppercase truncate italic">{item.name}</h3>
                            </div>
                            <div className="flex items-center gap-5">
                                <div className="text-right">
                                    <div className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">{item.totalQuantity}</div>
                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1 block">Unidades</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => registerScan(item.barcode, 1)} className="w-12 h-10 bg-white/5 text-white flex items-center justify-center border border-white/10 active:bg-blue-600"><Plus className="w-5 h-5"/></button>
                                    <button onClick={() => registerScan(item.barcode, -1)} className="w-12 h-10 bg-white/5 text-rose-500 flex items-center justify-center border border-white/10 active:bg-rose-600 active:text-white"><Minus className="w-5 h-5"/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isFlash && (
                <div className="absolute inset-0 z-[100] bg-blue-500/50 pointer-events-none animate-in fade-in duration-75"></div>
            )}
        </div>
    );
};

export default MassiveBlindView;
