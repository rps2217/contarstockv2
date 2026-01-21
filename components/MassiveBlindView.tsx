
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Zap, Box, Trash2, Plus, Minus, ScanLine, Smartphone, History, Mic, MicOff, Lock, Unlock, Radio } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'INDUSTRIAL-HUB' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan } = useMassiveScanner(batchId);
    
    // ESTADOS DE CONTROL TÁCTICO
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [useManualTrigger, setUseManualTrigger] = useState(true);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const handleReset = async () => {
        if (confirm("CONFIRMAR PURGA TOTAL: ¿BORRAR CONTEO?")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    // Vibración de feedback para el gatillo
    const toggleTrigger = (active: boolean) => {
        if (active !== isTriggerActive) {
            if (active && navigator.vibrate) navigator.vibrate(20);
            setIsTriggerActive(active);
        }
    };

    return (
        <div className={`h-screen w-full transition-all duration-75 flex flex-col font-mono select-none overflow-hidden bg-black`}>
            
            {/* HEADER DE ALTA DENSIDAD */}
            <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-black z-50">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl active:scale-90 transition-all border border-white/10"
                    >
                        <ChevronLeft className="w-8 h-8 text-white" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] leading-none italic">Martillo Industrial</span>
                        <span className="text-sm text-white font-black tracking-tighter truncate max-w-[120px] uppercase">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end pr-2 border-r border-white/10">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Total Batch</span>
                        <span className="text-3xl font-black text-white tabular-nums leading-none -mt-1 tracking-tighter">{totalUnits}</span>
                    </div>
                    <button onClick={handleReset} className="w-10 h-10 bg-rose-950/20 text-rose-500 flex items-center justify-center rounded-xl border border-rose-500/10 active:bg-rose-600 active:text-white">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* VISOR PRINCIPAL CON LÓGICA DE GATILLO */}
            <div className="h-[40vh] relative shrink-0 bg-[#050505] overflow-hidden group">
                {isCameraActive ? (
                    <CameraScanner 
                        onScan={(code) => registerScan(code)} 
                        onClose={() => setIsCameraActive(false)} 
                        isTriggered={isTriggerActive}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-24 h-24 rounded-full border-4 border-dashed border-white/5 flex items-center justify-center mb-6">
                            <Smartphone className="w-8 h-8 text-white/20" />
                        </div>
                        <button 
                            onClick={() => setIsCameraActive(true)}
                            className="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                        >
                            Inicializar Lente
                        </button>
                    </div>
                )}

                {/* Overlay de último escaneo (Transparente) */}
                {lastScannedCode && !isFlash && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-top-4">
                        Último: {lastScannedCode}
                    </div>
                )}
            </div>

            {/* PANEL DE CONTROL CENTRAL (GATILLO) */}
            <div className="bg-[#0a0a0a] px-6 py-6 border-y-4 border-white/5 flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,1)] z-40">
                <div className="w-full flex justify-between items-center mb-2 px-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isTriggerActive ? 'bg-blue-500 animate-pulse' : 'bg-white/20'}`}></div>
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{isTriggerActive ? 'Captura Abierta' : 'Sistema Bloqueado'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                         <span className="text-[9px] font-black text-white/30 uppercase">Auto-Lock</span>
                         <div className="w-10 h-5 bg-white/5 rounded-full p-1 border border-white/10">
                            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                         </div>
                    </div>
                </div>

                {/* BOTÓN GATILLO TÁCTICO */}
                <button 
                    onMouseDown={() => toggleTrigger(true)}
                    onMouseUp={() => toggleTrigger(false)}
                    onTouchStart={() => toggleTrigger(true)}
                    onTouchEnd={() => toggleTrigger(false)}
                    className={`
                        w-full h-32 rounded-[3rem] transition-all duration-150 flex flex-col items-center justify-center gap-2 relative overflow-hidden
                        ${isTriggerActive 
                            ? 'bg-blue-600 scale-95 shadow-[0_0_60px_rgba(37,99,235,0.4)]' 
                            : 'bg-white text-black active:bg-blue-100 shadow-xl'
                        }
                    `}
                >
                    {isTriggerActive ? (
                        <>
                            <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                            <Unlock className="w-10 h-10 text-white mb-1" />
                            <span className="text-sm font-black uppercase tracking-[0.4em] text-white">ESCANEANDO</span>
                        </>
                    ) : (
                        <>
                            <ScanLine className="w-10 h-10 mb-1" />
                            <span className="text-xl font-black uppercase tracking-tighter italic">MANTENER PARA DISPARAR</span>
                        </>
                    )}
                </button>
            </div>

            {/* LOG DE ACTIVIDAD INDUSTRIAL */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-black p-4 pb-12">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-6 px-4 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-blue-500" />
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Registro de Línea</h3>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-600/10 px-3 py-1 rounded-lg border border-blue-600/20">{items?.length || 0} ITEMS</span>
                    </div>

                    <div className="space-y-2">
                        {items?.map((item) => (
                            <div key={item.barcode} className="bg-[#0f0f0f] border border-white/5 p-5 flex items-center justify-between group active:bg-white/5 transition-colors">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-[10px] font-black text-blue-400 font-mono tracking-widest">{item.barcode}</span>
                                    </div>
                                    <h3 className="text-white font-black text-sm uppercase truncate tracking-tight">{item.name}</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right mr-4">
                                        <div className="text-2xl font-black text-white tabular-nums tracking-tighter leading-none">{item.totalQuantity}</div>
                                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">U.</div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => registerScan(item.barcode, 1)} className="w-10 h-8 bg-blue-600 text-white flex items-center justify-center rounded-lg active:bg-white active:text-blue-600"><Plus className="w-4 h-4 stroke-[3px]" /></button>
                                        <button onClick={() => registerScan(item.barcode, -1)} className="w-10 h-8 bg-white/5 text-rose-500 flex items-center justify-center rounded-lg active:bg-rose-600 active:text-white border border-white/10"><Minus className="w-4 h-4 stroke-[3px]" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* FLASH DE IMPACTO (PROTOCOLO MARTILLO) */}
            {isFlash && (
                <div className="absolute inset-0 z-[100] bg-blue-500/40 pointer-events-none animate-in fade-in duration-75"></div>
            )}
        </div>
    );
};

export default MassiveBlindView;
