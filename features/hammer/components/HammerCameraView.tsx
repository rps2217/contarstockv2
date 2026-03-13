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
 const displayQty = activeItem?.totalQuantity ?? 0;
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
 className="flex items-center gap-2 bg-black/40 pl-2 pr-4 py-2 rounded-full text-white border border-white/10 active:scale-95 transition-transform"
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
 <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 -[2px] animate-in fade-in duration-200">
 <CheckCircle2 className="w-24 h-24 text-emerald-400 drop-shadow-lg" />
 </div>
 )}
 {feedback === 'error' && (
 <div className="absolute inset-0 flex items-center justify-center bg-rose-500/20 -[2px] animate-in fade-in duration-200">
 <AlertTriangle className="w-24 h-24 text-rose-400 drop-shadow-lg" />
 </div>
 )}
 </div>

 {/* PANEL DE LISTA (60% Alto) */}
 <div className="flex-1 min-h-0 bg-slate-950 flex flex-col relative z-10 border-t-2 border-rose-500/50">
 {/* TOOLBAR ESTILO REFERENCIA */}
 <div className="flex justify-between items-center px-4 py-3 bg-slate-900 border-b border-white/5 shadow-md z-20">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
 <Box className="w-3 h-3 text-rose-500" />
 </div>
 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registros: {items.length}</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black">?</div>
 <span className="text-sm font-bold text-rose-500">
 Total : {items.length} ({items.reduce((acc, item) => acc + item.totalQuantity, 0)})
 </span>
 </div>
 </div>

 {/* LISTA DE ITEMS */}
 <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar bg-slate-950 pb-20">
 {items.length > 0 ? (
 items.map((item, index) => {
 const isActive = item.barcode === activeBarcode;
 
 return (
 <div 
 key={item.barcode}
 className={`px-4 py-4 flex justify-between items-center ${index % 2 === 0 ? 'bg-slate-900/40' : 'bg-transparent'} ${isActive ? 'bg-blue-900/20' : ''}`}
 >
 <div className="flex flex-col min-w-0 flex-1 pr-4">
 <span className="text-xl font-mono text-white leading-none mb-1.5">{item.barcode}</span>
 <span className="text-[11px] font-bold text-slate-400 uppercase leading-tight line-clamp-2">{item.name}</span>
 </div>
 <div className="flex items-center gap-3 shrink-0">
 <span className="text-xs text-slate-600 font-mono w-4 text-right">0</span>
 <button 
 onClick={() => onScan(item.barcode, -1)}
 className="w-8 h-8 rounded-full border-2 border-rose-500 flex items-center justify-center text-rose-500 active:bg-rose-500 active:text-white transition-colors"
 >
 <Minus className="w-4 h-4" />
 </button>
 <span className="text-xl font-mono text-white w-10 text-center border-b border-slate-600 pb-0.5">{item.totalQuantity}</span>
 <button 
 onClick={() => onScan(item.barcode, 1)}
 className="w-8 h-8 rounded-full border-2 border-rose-500 flex items-center justify-center text-rose-500 active:bg-rose-500 active:text-white transition-colors"
 >
 <Plus className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
 })
 ) : (
 <div className="h-full flex flex-col items-center justify-center opacity-30">
 <Box className="w-16 h-16 mb-4 text-slate-500" />
 <span className="text-sm font-black uppercase tracking-widest text-slate-400">Escanea para comenzar</span>
 </div>
 )}
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
