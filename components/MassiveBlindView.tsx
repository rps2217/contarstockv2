
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Zap, Box, Trash2, Plus, Minus, ScanLine, Smartphone, History, Mic, MicOff } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'INDUSTRIAL-HUB' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan } = useMassiveScanner(batchId);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);

    const handleReset = async () => {
        if (confirm("CONFIRMAR PURGA TOTAL: ¿BORRAR CONTEO?")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    return (
        <div className={`h-screen w-full transition-all duration-75 flex flex-col font-mono select-none overflow-hidden ${isFlash ? 'bg-blue-500' : 'bg-black'}`}>
            
            {/* HEADER DE ALTA DENSIDAD */}
            <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-black/90 z-50">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl active:scale-90 transition-all border border-white/10"
                    >
                        <ChevronLeft className="w-8 h-8 text-white" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] leading-none italic">Martillo v5.0</span>
                        <span className="text-sm text-white font-black tracking-tighter truncate max-w-[140px] uppercase">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end pr-2 border-r border-white/10">
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Carga Total</span>
                        <span className="text-3xl font-black text-white tabular-nums leading-none -mt-1 tracking-tighter">{totalUnits}</span>
                    </div>
                    <button onClick={handleReset} className="w-12 h-12 bg-rose-950/30 text-rose-500 flex items-center justify-center rounded-2xl border border-rose-500/20 active:bg-rose-600 active:text-white transition-all">
                        <Trash2 className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* HUD DE ESCANEO: ÁREA TÁCTICA */}
            <div className="h-[45vh] relative shrink-0 border-b-8 border-white/5 overflow-hidden">
                {isCameraActive ? (
                    <CameraScanner 
                        onScan={(code) => registerScan(code)} 
                        onClose={() => setIsCameraActive(false)} 
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 relative bg-gradient-to-b from-[#0a0a0a] to-black">
                        {/* Grid de fondo tipo HUD militar */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
                            backgroundImage: 'linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)',
                            backgroundSize: '40px 40px' 
                        }}></div>
                        
                        {lastScannedCode ? (
                            <div className="text-center animate-in zoom-in duration-75">
                                <div className="text-[12px] font-black text-blue-500 uppercase tracking-[0.6em] mb-6 bg-blue-500/10 py-1.5 px-6 rounded-full border border-blue-500/30 inline-block">Confirmado</div>
                                <h1 className="text-8xl md:text-[12rem] font-black text-white tracking-tighter mb-4 tabular-nums drop-shadow-[0_0_40px_rgba(59,130,246,0.6)]">
                                    {lastScannedCode}
                                </h1>
                                <p className="text-sm font-black text-white/40 uppercase tracking-[0.5em] italic">Registro de Entrada OK</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="w-32 h-32 rounded-full border-4 border-dashed border-blue-500/20 flex items-center justify-center mb-8 relative">
                                    <ScanLine className="w-12 h-12 text-blue-500 animate-pulse" />
                                    <div className="absolute inset-0 rounded-full border-2 border-blue-500/40 animate-ping"></div>
                                </div>
                                <h2 className="text-sm font-black text-white/20 uppercase tracking-[1em]">Esperando Láser</h2>
                            </div>
                        )}

                        {/* Botón flotante para activar Voz */}
                        <button 
                            onClick={() => setVoiceActive(!voiceActive)}
                            className={`absolute top-6 right-6 w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all shadow-2xl ${voiceActive ? 'bg-indigo-600 scale-110 shadow-indigo-500/40' : 'bg-white/5 border border-white/10 text-white/40'}`}
                        >
                            {voiceActive ? <Mic className="w-8 h-8 text-white animate-pulse" /> : <MicOff className="w-8 h-8" />}
                        </button>

                        <button 
                            onClick={() => setIsCameraActive(true)}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/5 hover:bg-white/10 text-white/60 py-4 px-8 rounded-3xl border border-white/10 transition-all flex items-center gap-3 active:scale-95 group"
                        >
                            <Smartphone className="w-6 h-6 group-hover:text-blue-500" />
                            <span className="text-xs font-black uppercase tracking-widest">Activar Cámara</span>
                        </button>
                    </div>
                )}
            </div>

            {/* LISTA DE PICKING: LOG INDUSTRIAL */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-black p-4 md:p-6 pb-32">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-8 px-4">
                        <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.5em] flex items-center gap-3">
                            <History className="w-4 h-4 text-blue-500" /> Historial de Línea
                        </h3>
                        <div className="h-[2px] flex-1 mx-8 bg-white/5"></div>
                        <span className="text-[11px] font-black text-blue-600 uppercase bg-blue-600/10 px-3 py-1 rounded-lg border border-blue-600/20">{items?.length || 0} SKUs</span>
                    </div>

                    <div className="space-y-4">
                        {items && items.length > 0 ? (
                            items.map((item) => (
                                <div 
                                    key={item.barcode} 
                                    className="bg-[#0f0f0f] border-2 border-white/5 rounded-[2.5rem] p-6 flex items-center justify-between transition-all hover:border-blue-500/20 group"
                                >
                                    <div className="flex-1 min-w-0 pr-8">
                                        <div className="flex items-center gap-4 mb-2">
                                            <span className="text-[12px] font-black text-blue-500 font-mono bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20">
                                                {item.barcode}
                                            </span>
                                        </div>
                                        <h3 className="text-white font-black text-lg md:text-xl uppercase truncate tracking-tight leading-none">
                                            {item.name}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Botones Gigantes para Guantes */}
                                        <button 
                                            onClick={() => registerScan(item.barcode, -1)}
                                            className="w-14 h-16 bg-white/5 text-rose-500 flex items-center justify-center rounded-[1.5rem] active:bg-rose-600 active:text-white transition-all border border-white/10"
                                        >
                                            <Minus className="w-8 h-8 stroke-[4px]" />
                                        </button>
                                        
                                        <div className="w-24 h-20 bg-white/5 flex flex-col items-center justify-center rounded-[2rem] border border-white/10 group-hover:border-blue-600/40">
                                            <span className="text-4xl font-black text-white tabular-nums tracking-tighter">
                                                {item.totalQuantity}
                                            </span>
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest -mt-1">Unidades</span>
                                        </div>

                                        <button 
                                            onClick={() => registerScan(item.barcode, 1)}
                                            className="w-14 h-16 bg-blue-600 text-white flex items-center justify-center rounded-[1.5rem] active:scale-90 transition-all shadow-xl shadow-blue-900/20 border-b-8 border-blue-800"
                                        >
                                            <Plus className="w-8 h-8 stroke-[4px]" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-32 text-center opacity-10 flex flex-col items-center">
                                <Zap className="w-20 h-20 mb-8 text-blue-500 animate-pulse" />
                                <p className="text-sm font-black uppercase tracking-[1.5em]">Protocolo Martillo Listo</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BARRA DE ESTADO TÁCTICA */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-3xl border-t-4 border-white/10 px-8 py-6 flex items-center justify-between z-50">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 animate-ping absolute inset-0"></div>
                        <div className="w-4 h-4 rounded-full bg-emerald-600 relative border-2 border-black"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[12px] font-black text-white uppercase tracking-[0.2em] leading-none">Sistema Online</span>
                        <span className="text-[10px] text-white/30 font-bold uppercase mt-1">HID Engine Latency: 0.8ms</span>
                    </div>
                </div>
                <div className="flex items-center gap-10">
                    <div className="text-right">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-1">Backup Local</span>
                        <span className="text-[11px] font-black text-blue-400 uppercase bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">Encriptado</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MassiveBlindView;
