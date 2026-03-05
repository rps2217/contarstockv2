import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus, Zap, Box, AlertTriangle, CheckCircle2, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { CameraScanner } from '../../../components/CameraScanner';
import { HammerItem } from '../hooks/useHammerLogic';
import { Product } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';

interface HammerCameraViewProps {
    onBack: () => void;
    onScan: (code: string, qtyOverride?: number) => void;
    onRemove: (barcode: string) => void;
    activeBarcode: string | null;
    activeProduct: Product | null;
    optimisticQty: number | null;
    feedback: FeedbackStatus;
    items: HammerItem[];
}

export const HammerCameraView: React.FC<HammerCameraViewProps> = ({
    onBack,
    onScan,
    onRemove,
    activeBarcode,
    activeProduct,
    optimisticQty,
    feedback,
    items
}) => {
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(() => localStorage.getItem('hammer_voice') === 'true');
    const lastSpokenRef = useRef<string>('');

    // Persistir preferencia de voz
    useEffect(() => {
        localStorage.setItem('hammer_voice', isVoiceEnabled.toString());
    }, [isVoiceEnabled]);

    // Encuentra el item activo en la lista para obtener datos si no están en el estado optimista
    const activeItem = items.find(i => i.barcode === activeBarcode);
    const displayQty = optimisticQty ?? activeItem?.totalQuantity ?? 0;
    const displayName = activeProduct?.name || activeItem?.name || 'ESCANEA UN PRODUCTO';
    const displayBarcode = activeBarcode || '---';

    // Lógica de Voz (TTS)
    useEffect(() => {
        if (!isVoiceEnabled || !activeBarcode) return;
        
        const textToSpeak = `${displayName}. ${displayQty} unidades.`;
        
        // Evitar repetir lo mismo si no ha cambiado nada relevante
        if (lastSpokenRef.current === textToSpeak) return;
        
        lastSpokenRef.current = textToSpeak;
        
        // Cancelar cualquier habla previa
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'es-ES';
        utterance.rate = 1.1; // Un poco más rápido para flujo industrial
        window.speechSynthesis.speak(utterance);
    }, [activeBarcode, displayQty, displayName, isVoiceEnabled]);

    // Obtener los últimos 3 items escaneados (excluyendo el actual)
    const recentHistory = items
        .filter(item => item.barcode !== activeBarcode)
        .slice(0, 3);

    const handleManualIncrement = () => {
        if (activeBarcode) onScan(activeBarcode);
    };

    const handleManualDecrement = () => {
        if (activeBarcode) {
            // @ts-ignore
            onScan(activeBarcode, -1);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
            {/* HEADER FLOTANTE */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent h-24">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 bg-black/40 backdrop-blur-md pl-2 pr-4 py-2 rounded-full text-white border border-white/10 active:scale-95 transition-transform"
                >
                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                        <X className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">Cerrar</span>
                </button>
                
                <div className="flex gap-2">
                    <button 
                        className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/10 transition-all ${isVoiceEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-black/40 text-white/40'}`}
                        onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                        title={isVoiceEnabled ? "Desactivar Voz" : "Activar Voz"}
                    >
                        {isVoiceEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                    </button>
                    {/* Flash toggle placeholder - CameraScanner doesn't expose flash control yet, but UI needs it */}
                    <button 
                        className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/10 transition-all ${isFlashOn ? 'bg-yellow-500/20 text-yellow-400' : 'bg-black/40 text-white/40'}`}
                        onClick={() => setIsFlashOn(!isFlashOn)}
                    >
                        <Zap className={`w-6 h-6 ${isFlashOn ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>

            {/* VISOR DE CÁMARA (40% Alto) */}
            <div className="h-[40%] relative bg-black">
                <CameraScanner 
                    onScan={onScan} 
                    onClose={() => {}} // No-op, we handle close externally
                    inline={true}
                    isTriggered={true} // Siempre activa
                />
                
                {/* TARGET OVERLAY PERSONALIZADO (Opcional, si queremos sobreescribir el de CameraScanner) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[70%] aspect-square border-2 border-white/20 rounded-3xl relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl -mb-1 -mr-1"></div>
                        
                        {/* LINEA DE ESCANEO */}
                        <div className="absolute top-1/2 left-2 right-2 h-[2px] bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
                    </div>
                </div>

                {/* FEEDBACK OVERLAY */}
                {feedback === 'success' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <CheckCircle2 className="w-24 h-24 text-emerald-400 drop-shadow-lg" />
                    </div>
                )}
                {feedback === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-rose-500/20 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <AlertTriangle className="w-24 h-24 text-rose-400 drop-shadow-lg" />
                    </div>
                )}
            </div>

            {/* PANEL DE CONTROL (60% Alto) */}
            <div className="flex-1 bg-slate-900 rounded-t-[2.5rem] -mt-10 relative z-10 flex flex-col px-6 pt-10 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/5">
                
                {/* HISTORIAL RECIENTE (TIPO LISTA INDUSTRIAL) */}
                <div className="mb-4 flex flex-col flex-1 min-h-0">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Historial de Escaneo</div>
                        <div className="text-[8px] font-bold text-blue-500/50 uppercase tracking-widest">{recentHistory.length} registros</div>
                    </div>
                    <div className="space-y-1 overflow-y-auto no-scrollbar pr-1 flex-1">
                        {recentHistory.length > 0 ? (
                            recentHistory.map((item) => (
                                <div key={item.barcode} className="flex gap-2">
                                    <button 
                                        onClick={() => onScan(item.barcode, 0)}
                                        className="flex-1 flex items-center bg-slate-800/20 border border-white/5 px-3 py-2.5 rounded-xl active:bg-slate-700 transition-all text-left group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center mr-3 border border-white/5 group-active:bg-blue-600 transition-colors">
                                            <Box className="w-4 h-4 text-slate-500 group-active:text-white" />
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-[11px] font-bold text-slate-200 truncate group-active:text-white leading-tight">{item.name}</span>
                                            <span className="text-[9px] font-medium text-slate-500 font-mono tracking-tight">{item.barcode}</span>
                                        </div>
                                        <div className="flex items-center gap-3 ml-4">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-black text-blue-400 tabular-nums">{item.totalQuantity}</span>
                                                <span className="text-[7px] font-black text-slate-600 uppercase tracking-tighter">Unidades</span>
                                            </div>
                                        </div>
                                    </button>
                                    
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onRemove(item.barcode); }}
                                        className="w-12 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-500 active:bg-rose-500 active:text-white transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="h-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                                <Box className="w-6 h-6 mb-1" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Sin registros recientes</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* INFO PRODUCTO */}
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{displayBarcode}</div>
                    <h2 className="text-xl md:text-2xl font-bold text-white leading-tight line-clamp-2 px-4">
                        {displayName}
                    </h2>
                    {activeItem?.loc && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 rounded-full border border-white/5 mt-2">
                            <Box className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] font-black text-slate-300 tracking-widest">{activeItem.loc}</span>
                        </div>
                    )}
                </div>

                {/* CONTROLES DE CANTIDAD */}
                <div className="h-24 flex items-center justify-between gap-4 mt-4">
                    <button 
                        onClick={() => onScan(activeBarcode || '', -1)} // Necesitamos pasar quantity override
                        disabled={!activeBarcode}
                        className="w-20 h-20 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 active:bg-slate-700 active:scale-95 transition-all disabled:opacity-30"
                    >
                        <Minus className="w-8 h-8" />
                    </button>

                    <div className="flex-1 h-20 bg-black/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest absolute top-2">CANTIDAD</span>
                        <span className="text-4xl font-black text-white tracking-tighter font-mono">{displayQty}</span>
                    </div>

                    <button 
                        onClick={() => onScan(activeBarcode || '', 1)}
                        disabled={!activeBarcode}
                        className="w-20 h-20 rounded-2xl bg-blue-600 border border-blue-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] active:bg-blue-700 active:scale-95 transition-all disabled:opacity-30 disabled:shadow-none disabled:bg-slate-800"
                    >
                        <Plus className="w-8 h-8" />
                    </button>
                </div>
            </div>
            <style>{`
                #v8-core-optical-engine video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
                @keyframes radar-pulse { 0% { transform: translateY(-30px); opacity: 0; } 50% { opacity: 0.8; } 100% { transform: translateY(30px); opacity: 0; } }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
