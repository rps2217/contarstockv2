import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus, Zap, Box, AlertTriangle, CheckCircle2, Volume2, VolumeX, Trash2, Keyboard, Camera, Save, MoreVertical, MapPin, Lock } from 'lucide-react';
import { CameraScanner } from '../../../components/CameraScanner';
import { HammerItem } from '../hooks/useHammerLogic';
import { Product } from '../../../types';
import { FeedbackStatus } from '../../../hooks/useFeedbackSystem';

interface HammerCameraViewProps {
 onBack: () => void;
 onScan: (code: string, qtyOverride?: number) => void;
 onRemove: (barcode: string) => void;
 onFinalize: () => void;
 onOpenTools: () => void;
 onLock?: () => void;
 location: string;
 onChangeLocation: () => void;
 activeBarcode: string | null;
 activeProduct: Product | null;
 optimisticQty: number | null;
 feedback: FeedbackStatus;
 items: HammerItem[];
 isVoiceEnabled?: boolean;
}

export const HammerCameraView: React.FC<HammerCameraViewProps> = ({
 onBack,
 onScan,
 onRemove,
 onFinalize,
 onOpenTools,
 onLock,
 location,
 onChangeLocation,
 activeBarcode,
 activeProduct,
 optimisticQty,
 feedback,
 items,
 isVoiceEnabled = false
}) => {
 const [isFlashOn, setIsFlashOn] = useState(false);
 const [editingItem, setEditingItem] = useState<HammerItem | null>(null);
 const [editQty, setEditQty] = useState<number>(0);
 const [isManualMode, setIsManualMode] = useState(false);
 const [manualInput, setManualInput] = useState('');
 const manualInputRef = useRef<HTMLInputElement>(null);
 const lastSpokenRef = useRef<string>('');

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
 <div className="flex-1 min-h-0 flex flex-col bg-black relative z-10">
 {/* SOLID HEADER (approx 10%) */}
 <div className="h-16 bg-slate-900 border-b border-white/10 flex items-center justify-between px-2 shrink-0 z-50">
 <div className="flex items-center gap-1">
 <button 
 onClick={onBack}
 className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 active:bg-white/10 transition-colors"
 >
 <X className="w-6 h-6" />
 </button>
 <button 
 onClick={onChangeLocation}
 className="flex items-center gap-1.5 bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg active:bg-blue-500/30 transition-colors border border-blue-500/30"
 >
 <MapPin className="w-4 h-4" />
 <span className="text-xs font-bold tracking-wider truncate max-w-[80px]">{location}</span>
 </button>
 </div>
 
 <div className="flex items-center gap-1">
 <button 
 className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isManualMode ? 'bg-white/20 text-white' : 'text-white/70 active:bg-white/10'}`}
 onClick={() => {
 setIsManualMode(!isManualMode);
 if (!isManualMode) {
 setTimeout(() => manualInputRef.current?.focus(), 100);
 }
 }}
 title={isManualMode ? "Modo Cámara" : "Entrada Manual"}
 >
 {isManualMode ? <Camera className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
 </button>
 <button 
 onClick={onFinalize}
 className="w-10 h-10 rounded-full flex items-center justify-center text-emerald-400 active:bg-white/10 transition-colors"
 title="Guardar y Finalizar"
 >
 <Save className="w-5 h-5" />
 </button>
 {onLock && (
 <button 
 onClick={onLock}
 className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 active:bg-white/10 transition-colors"
 title="Bloquear Pantalla"
 >
 <Lock className="w-5 h-5" />
 </button>
 )}
 <button 
 onClick={onOpenTools}
 className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 active:bg-white/10 transition-colors"
 >
 <MoreVertical className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* VISOR DE CÁMARA (25% Alto) */}
 <div className={`${isManualMode ? 'hidden' : 'h-[25%]'} relative bg-black shrink-0`}>
 <CameraScanner 
 onScan={onScan} 
 onClose={() => {}} // No-op, we handle close externally
 inline={true}
 isTriggered={true} // Siempre activa
 />
 
 {/* TARGET OVERLAY PERSONALIZADO */}
 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
 <div className="h-[80%] aspect-square max-w-[90%] border-2 border-white/20 rounded-3xl relative">
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

 {/* PANEL DE LISTA (Resto del espacio) */}
 <div className="flex-1 min-h-0 bg-slate-950 flex flex-col relative z-10 border-t-2 border-rose-500/50">
 
 {isManualMode && (
 <div className="p-6 bg-slate-900 border-b border-white/10 flex flex-col items-center justify-center pt-28">
 <form 
 onSubmit={(e) => {
 e.preventDefault();
 if (manualInput.trim()) {
 onScan(manualInput.trim());
 setManualInput('');
 // Keep focus after scanning
 setTimeout(() => manualInputRef.current?.focus(), 10);
 }
 }}
 className="w-full max-w-sm flex flex-col gap-6"
 >
 <input
 ref={manualInputRef}
 type="text"
 inputMode="numeric"
 value={manualInput}
 onChange={(e) => setManualInput(e.target.value)}
 placeholder="Ingresa el código aquí"
 className="w-full bg-transparent border-b-2 border-rose-500 text-center text-2xl text-white py-2 focus:outline-none placeholder:text-slate-500 font-mono"
 />
 <div className="flex justify-center gap-4">
 <button 
 type="button"
 onClick={() => setManualInput('')}
 className="w-12 h-12 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/50 active:bg-rose-500/40 transition-colors"
 >
 <X className="w-6 h-6" />
 </button>
 <button 
 type="submit"
 disabled={!manualInput.trim()}
 className="flex-1 h-12 rounded-lg bg-rose-600 text-white font-bold tracking-wider active:bg-rose-700 disabled:opacity-50 disabled:active:bg-rose-600 transition-colors"
 >
 INGRESAR
 </button>
 </div>
 </form>
 </div>
 )}

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
 <button 
 onClick={() => {
 setEditingItem(item);
 setEditQty(item.totalQuantity);
 }}
 className="text-xl font-mono text-white min-w-[2.5rem] text-center border-b border-slate-600 pb-0.5 active:bg-white/10 rounded transition-colors"
 >
 {item.totalQuantity}
 </button>
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

 {/* MODAL DE EDICIÓN DE CANTIDAD */}
 {editingItem && (
 <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
 <div className="bg-slate-800 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
 {/* Header */}
 <div className="bg-rose-700 px-4 py-3 flex items-center justify-center gap-2">
 <Box className="w-5 h-5 text-white" />
 <span className="text-white font-bold text-lg tracking-wide uppercase">Cantidad</span>
 </div>
 
 {/* Body */}
 <div className="p-8 flex flex-col items-center gap-6 bg-slate-600">
 <button 
 onClick={() => setEditQty(q => q + 1)}
 className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center active:bg-slate-300 transition-colors shadow-inner"
 >
 <Plus className="w-8 h-8 text-rose-600" />
 </button>
 
 <div className="w-full border-b-2 border-rose-600 text-center pb-2">
 <span className="text-5xl font-mono text-white">{editQty}</span>
 </div>
 
 <button 
 onClick={() => setEditQty(q => Math.max(0, q - 1))}
 className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center active:bg-slate-300 transition-colors shadow-inner"
 >
 <Minus className="w-8 h-8 text-rose-600" />
 </button>
 </div>
 
 {/* Footer */}
 <div className="p-4 flex gap-3 bg-slate-600">
 <button 
 onClick={() => setEditingItem(null)}
 className="flex-1 py-3 bg-white text-black font-bold rounded-xl active:bg-gray-200 transition-colors text-sm tracking-wider"
 >
 CANCEL
 </button>
 <button 
 onClick={() => {
 const delta = editQty - editingItem.totalQuantity;
 if (delta !== 0) {
 onScan(editingItem.barcode, delta);
 }
 setEditingItem(null);
 }}
 className="flex-1 py-3 bg-rose-800 text-white font-bold rounded-xl active:bg-rose-900 transition-colors text-sm tracking-wider"
 >
 SAVE
 </button>
 </div>
 </div>
 </div>
 )}

 <style>{`
 #v8-core-optical-engine video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
 @keyframes radar-pulse { 0% { transform: translateY(-30px); opacity: 0; } 50% { opacity: 0.8; } 100% { transform: translateY(30px); opacity: 0; } }
 .no-scrollbar::-webkit-scrollbar { display: none; }
 .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
 `}</style>
 </div>
 );
};
