
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { ChevronLeft, Zap, Box, Trash2, LayoutGrid, Camera } from 'lucide-react';
import { massiveDb } from '../db.massive';
import { CameraScanner } from './CameraScanner';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'DEFAULT_BATCH' } = useParams();
    const { count, lastSku, isFlash, registerScan } = useMassiveScanner(batchId);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const handleReset = async () => {
        if (confirm("¿BORRAR TODO EL CONTEO ACTUAL?")) {
            await massiveDb.blindScans.where('batchId').equals(batchId).delete();
            window.location.reload();
        }
    };

    return (
        <div className={`h-screen w-full transition-colors duration-75 flex flex-col font-mono select-none overflow-hidden ${isFlash ? 'bg-emerald-500' : 'bg-black'}`}>
            
            {/* TOP BAR INDUSTRIAL */}
            <header className="p-4 flex items-center justify-between border-b-4 border-white/5 shrink-0 bg-black/40">
                <button onClick={() => navigate('/dashboard')} className="p-3 bg-white/5 rounded-2xl text-white/40 active:bg-white/10">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Batch ID</div>
                    <div className="text-white font-bold text-sm">{batchId}</div>
                </div>
                <button onClick={handleReset} className="p-3 bg-rose-900/20 rounded-2xl text-rose-500">
                    <Trash2 className="w-6 h-6" />
                </button>
            </header>

            {/* MAIN DISPLAY - GIGANTE */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <div className="absolute top-10 opacity-10">
                   <Zap className="w-64 h-64 text-white" />
                </div>

                <div className="relative z-10 text-center">
                    <div className="text-[12px] font-black text-white/30 uppercase tracking-[0.5em] mb-4">Total Unidades (Ciego)</div>
                    <div className="text-[15rem] md:text-[22rem] leading-none font-black text-white tracking-tighter tabular-nums drop-shadow-[0_15px_30px_rgba(255,255,255,0.1)]">
                        {count}
                    </div>
                </div>

                {lastSku && (
                    <div className="mt-8 animate-in slide-in-from-bottom-4 bg-white/5 border-2 border-white/10 px-8 py-4 rounded-3xl backdrop-blur-md">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 text-center">Última Captura</div>
                        <div className="text-2xl text-white font-black tracking-[0.2em]">{lastSku}</div>
                    </div>
                )}
            </div>

            {/* CONTROL DE PIE */}
            <footer className="p-8 grid grid-cols-2 gap-6 bg-white/5 border-t-4 border-white/5">
                <button 
                    onClick={() => setIsCameraOpen(true)}
                    className="h-20 bg-blue-600 rounded-[2rem] flex flex-col items-center justify-center gap-2 text-white shadow-2xl active:scale-95 transition-all"
                >
                    <Camera className="w-8 h-8" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cámara</span>
                </button>
                <div className="h-20 bg-white/5 rounded-[2rem] flex flex-col items-center justify-center gap-1 border-2 border-white/10 text-white/40">
                    <LayoutGrid className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Modo Ráfaga HID</span>
                </div>
            </footer>

            {isCameraOpen && (
                <CameraScanner 
                    onScan={(code) => { registerScan(code); setIsCameraOpen(false); }} 
                    onClose={() => setIsCameraOpen(false)} 
                />
            )}
        </div>
    );
};

export default MassiveBlindView;
