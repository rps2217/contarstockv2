
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Zap, Box, Trash2, Plus, Minus, ScanLine, Smartphone, Terminal, History } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'MARTILLO-CORE' } = useParams();
    const { items, totalUnits, isFlash, lastScannedCode, registerScan } = useMassiveScanner(batchId);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const handleReset = async () => {
        if (confirm("¿BORRAR TODO EL CONTEO ACTUAL? ESTA ACCIÓN ES IRREVERSIBLE.")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    return (
        <div className={`h-screen w-full transition-all duration-100 flex flex-col font-mono select-none overflow-hidden ${isFlash ? 'bg-blue-600' : 'bg-[#050505]'}`}>
            
            {/* HEADER TÁCTICO */}
            <header className="h-14 px-6 flex items-center justify-between border-b border-white/5 shrink-0 bg-black/40 backdrop-blur-xl z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 text-white/30 hover:text-white transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] leading-none italic">Industrial Hammer V4</span>
                        <span className="text-xs text-white/60 font-bold tracking-tighter truncate max-w-[150px] uppercase">{batchId}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total Cargo</span>
                        <span className="text-2xl font-black text-white tabular-nums leading-none tracking-tighter">{totalUnits}</span>
                    </div>
                    <button onClick={handleReset} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 active:scale-90 transition-all">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* HUD PRINCIPAL: Área de Escaneo de Alta Visibilidad */}
            <div className="h-[40vh] relative shrink-0 border-b-8 border-white/5 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {isCameraActive ? (
                    <CameraScanner 
                        onScan={(code) => registerScan(code)} 
                        onClose={() => setIsCameraActive(false)} 
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
                        {/* Grillas Tácticas de Fondo */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                        
                        {lastScannedCode ? (
                            <div className="text-center animate-in zoom-in duration-150">
                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mb-4 bg-blue-500/10 py-1 px-4 rounded-full border border-blue-500/20 inline-block">Confirmado</div>
                                <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter mb-2 tabular-nums drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                                    {lastScannedCode}
                                </h1>
                                <p className="text-xs font-bold text-white/40 uppercase tracking-[0.3em]">SKU en Registro</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center opacity-40">
                                <div className="w-24 h-24 rounded-full border-4 border-dashed border-blue-500/50 flex items-center justify-center mb-6 animate-[spin_10s_linear_infinite]">
                                    <ScanLine className="w-10 h-10 text-blue-500" />
                                </div>
                                <h2 className="text-xs font-black text-white uppercase tracking-[0.8em]">Esperando Láser</h2>
                            </div>
                        )}

                        <button 
                            onClick={() => setIsCameraActive(true)}
                            className="absolute bottom-6 right-6 bg-white/5 hover:bg-white/10 text-white/40 p-4 rounded-2xl border border-white/10 transition-all flex items-center gap-2 active:scale-95 group"
                        >
                            <Smartphone className="w-5 h-5 group-hover:text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Activar Cámara</span>
                        </button>
                    </div>
                )}
            </div>

            {/* LISTA DE CARGA: Log de Auditoría Real-Time */}
            <div className="flex-1 overflow-y-auto no-scrollbar bg-[#080808] p-4 md:p-6 pb-28">
                <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] flex items-center gap-2">
                            <History className="w-3.5 h-3.5" /> Últimos Movimientos
                        </h3>
                        <div className="h-px flex-1 mx-6 bg-white/5"></div>
                        <span className="text-[10px] font-black text-blue-500 uppercase">{items?.length || 0} SKUs</span>
                    </div>

                    <div className="space-y-3">
                        {items && items.length > 0 ? (
                            items.map((item) => (
                                <div 
                                    key={item.barcode} 
                                    className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 group hover:bg-white/[0.04] transition-all"
                                >
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <span className="text-[10px] font-black text-blue-500 font-mono bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                                                {item.barcode}
                                            </span>
                                        </div>
                                        <h3 className="text-white/80 font-bold text-sm md:text-base uppercase truncate tracking-tight">
                                            {item.name}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => registerScan(item.barcode, -1)}
                                            className="w-12 h-14 bg-white/5 text-rose-500/50 hover:text-rose-500 flex items-center justify-center rounded-2xl active:scale-90 transition-all border border-white/5"
                                        >
                                            <Minus className="w-6 h-6 stroke-[3px]" />
                                        </button>
                                        
                                        <div className="w-20 h-14 bg-white/5 flex items-center justify-center rounded-2xl border border-white/10 group-hover:border-blue-500/30 transition-colors">
                                            <span className="text-3xl font-black text-white tabular-nums tracking-tighter">
                                                {item.totalQuantity}
                                            </span>
                                        </div>

                                        <button 
                                            onClick={() => registerScan(item.barcode, 1)}
                                            className="w-12 h-14 bg-blue-600 text-white flex items-center justify-center rounded-2xl active:scale-90 transition-all shadow-lg shadow-blue-900/20"
                                        >
                                            <Plus className="w-6 h-6 stroke-[3px]" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-24 text-center opacity-10 flex flex-col items-center">
                                <Terminal className="w-16 h-16 mb-6" />
                                <p className="text-[10px] font-black uppercase tracking-[1em]">Modo Martillo Activo</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BARRA DE ESTADO INDUSTRIAL */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-2xl border-t border-white/5 px-8 py-5 flex items-center justify-between z-50">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping absolute inset-0"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 relative"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Canal HID Activo</span>
                        <span className="text-[8px] text-white/30 font-bold uppercase mt-1 tracking-tighter">Latencia: &lt;1ms</span>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Anti-Spam</span>
                        <span className="text-[10px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Optimizado</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MassiveBlindView;
