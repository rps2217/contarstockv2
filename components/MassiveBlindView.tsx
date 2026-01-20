
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Zap, Box, Trash2, Plus, Minus, ScanLine, Smartphone } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'DEFAULT_BATCH' } = useParams();
    const { items, totalUnits, isFlash, registerScan, updateItemQty } = useMassiveScanner(batchId);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const handleReset = async () => {
        if (confirm("¿BORRAR TODO EL CONTEO ACTUAL?")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    return (
        <div className={`h-screen w-full transition-colors duration-100 flex flex-col font-mono select-none overflow-hidden ${isFlash ? 'bg-blue-500' : 'bg-black'}`}>
            
            {/* HEADER INDUSTRIAL */}
            <header className="h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-black/80 backdrop-blur-md z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-2 text-white/40 hover:text-white transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest leading-none italic">Escudo Ciego</span>
                        <span className="text-xs text-white font-bold tracking-tighter uppercase truncate max-w-[120px]">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="bg-blue-500/10 px-4 py-1.5 rounded-xl border border-blue-500/20 flex items-center gap-2">
                        <Box className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xl font-black text-white tabular-nums">{totalUnits}</span>
                    </div>
                    <button onClick={handleReset} className="p-2 text-rose-500/50 hover:text-rose-500">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* ZONA SUPERIOR: DUAL SCANNER (Cámara o Láser) */}
            <div className="h-[35vh] relative shrink-0 border-b-4 border-white/5 bg-slate-950 overflow-hidden shadow-2xl">
                {isCameraActive ? (
                    <CameraScanner 
                        onScan={(code) => registerScan(code)} 
                        onClose={() => setIsCameraActive(false)} 
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-black relative">
                        {/* Indicador visual de escucha Láser */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                            <ScanLine className="w-64 h-64 text-blue-500 animate-pulse" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="bg-blue-600/20 p-4 rounded-full mb-4 border border-blue-500/30">
                                <Zap className="w-10 h-10 text-blue-500 animate-pulse" />
                            </div>
                            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] mb-1">Escáner Láser Listo</h2>
                            <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Esperando señal de Puerto HID</p>
                        </div>

                        <button 
                            onClick={() => setIsCameraActive(true)}
                            className="absolute bottom-6 right-6 bg-white/5 hover:bg-white/10 text-white/60 p-4 rounded-2xl border border-white/10 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Smartphone className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Usar Cámara</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ZONA INFERIOR: LISTADO DE PICKING CON PRESCRIPTORES */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-black p-2 md:p-4 pb-28">
                <div className="max-w-2xl mx-auto space-y-2.5">
                    {items && items.length > 0 ? (
                        items.map((item) => (
                            <div 
                                key={item.barcode} 
                                className="bg-white/[0.03] border border-white/5 rounded-[1.8rem] p-4 flex items-center justify-between animate-in slide-in-from-right-4 group"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black text-blue-500 tracking-widest uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                            {item.barcode}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-black text-sm md:text-base uppercase truncate leading-tight tracking-tight">
                                        {item.name}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button 
                                        onClick={() => updateItemQty(item.barcode, -1)}
                                        className="w-12 h-14 bg-white/5 text-rose-500 flex items-center justify-center rounded-2xl active:bg-rose-500 active:text-white transition-all border border-white/5"
                                    >
                                        <Minus className="w-6 h-6 stroke-[3px]" />
                                    </button>
                                    
                                    <div className="w-18 min-w-[70px] h-14 bg-white/5 flex items-center justify-center rounded-2xl border border-white/10 group-hover:border-blue-500/30 transition-colors">
                                        <span className="text-3xl font-black text-white tabular-nums tracking-tighter">
                                            {item.totalQuantity}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={() => updateItemQty(item.barcode, 1)}
                                        className="w-12 h-14 bg-blue-600 text-white flex items-center justify-center rounded-2xl active:scale-90 transition-all shadow-lg border-b-4 border-blue-800"
                                    >
                                        <Plus className="w-6 h-6 stroke-[3px]" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center opacity-10 flex flex-col items-center">
                            <ScanLine className="w-16 h-16 mb-4" />
                            <p className="text-xs font-black uppercase tracking-[0.5em]">Escaneo Masivo Activado</p>
                        </div>
                    )}
                </div>
            </div>

            {/* STATUS BAR DINÁMICO */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Motor HID + IA V4.5</span>
                </div>
                <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                    Filtro Anti-Spam: ON
                </div>
            </div>
        </div>
    );
};

export default MassiveBlindView;
