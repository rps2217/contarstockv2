
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Zap, Box, Trash2, Camera, Plus, Minus, ScanLine } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'DEFAULT_BATCH' } = useParams();
    const { items, totalUnits, isFlash, registerScan, updateItemQty } = useMassiveScanner(batchId);
    const [isCameraActive, setIsCameraActive] = useState(true);

    const handleReset = async () => {
        if (confirm("¿BORRAR TODO EL CONTEO ACTUAL?")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    return (
        <div className={`h-screen w-full transition-colors duration-100 flex flex-col font-mono select-none overflow-hidden ${isFlash ? 'bg-emerald-500' : 'bg-black'}`}>
            
            {/* HEADER COMPACTO INDUSTRIAL */}
            <header className="h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-black/80 backdrop-blur-md z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-2 text-white/40 hover:text-white transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest leading-none">ESCUDO CIEGO</span>
                        <span className="text-xs text-white font-bold tracking-tighter uppercase">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                        <Box className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xl font-black text-white tabular-nums">{totalUnits}</span>
                    </div>
                    <button onClick={handleReset} className="p-2 text-rose-500/50 hover:text-rose-500">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* ZONA SUPERIOR: VISOR O HERO */}
            <div className="h-[40vh] md:h-[45vh] relative shrink-0 border-b-4 border-white/5 bg-slate-900 overflow-hidden shadow-2xl">
                {isCameraActive ? (
                    <CameraScanner 
                        onScan={(code) => registerScan(code)} 
                        onClose={() => setIsCameraActive(false)} 
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-black">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.6em] mb-4 text-center">Modo HID Industrial Listo</div>
                        <div className="relative">
                            <ScanLine className="w-24 h-24 text-blue-500/10 animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Zap className="w-10 h-10 text-blue-500" />
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsCameraActive(true)}
                            className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-blue-800"
                        >
                            Activar Lente
                        </button>
                    </div>
                )}
                {/* FILTRO PROTECTOR VISUAL */}
                <div className="absolute inset-0 pointer-events-none border-[12px] border-black/20 z-10"></div>
            </div>

            {/* ZONA INFERIOR: LISTADO DE PICKING */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-black p-2 md:p-4 pb-24">
                <div className="max-w-2xl mx-auto space-y-3">
                    {items && items.length > 0 ? (
                        items.map((item) => (
                            <div 
                                key={item.barcode} 
                                className="bg-white/[0.04] border-2 border-white/5 rounded-[2rem] p-5 flex items-center justify-between animate-in slide-in-from-right-4 group"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase">
                                            {item.barcode}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-black text-sm md:text-base uppercase truncate leading-none tracking-tight">
                                        {item.name}
                                    </h3>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => updateItemQty(item.barcode, -1)}
                                        className="w-12 h-14 bg-white/5 text-rose-500 flex items-center justify-center rounded-2xl active:bg-rose-500 active:text-white transition-all border border-white/5"
                                    >
                                        <Minus className="w-5 h-5 stroke-[4px]" />
                                    </button>
                                    
                                    <div className="w-20 h-14 bg-white/5 flex items-center justify-center rounded-2xl border-2 border-white/10 group-hover:border-blue-500/50 transition-colors">
                                        <span className="text-3xl font-black text-white tabular-nums tracking-tighter">
                                            {item.totalQuantity}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={() => updateItemQty(item.barcode, 1)}
                                        className="w-12 h-14 bg-blue-600 text-white flex items-center justify-center rounded-2xl active:scale-90 transition-all shadow-lg border-b-4 border-blue-800"
                                    >
                                        <Plus className="w-5 h-5 stroke-[4px]" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center opacity-10 flex flex-col items-center">
                            <ScanLine className="w-16 h-16 mb-4" />
                            <p className="text-xs font-black uppercase tracking-[0.5em]">Escaneo Masivo Silencioso</p>
                        </div>
                    )}
                </div>
            </div>

            {/* STATUS BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 px-6 py-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Motor Debounce: 2.5s</span>
                </div>
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
                    Procesador Ráfaga v4.1
                </div>
            </div>
        </div>
    );
};

export default MassiveBlindView;
