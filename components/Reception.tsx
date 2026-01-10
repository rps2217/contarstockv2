
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { CameraScanner } from './CameraScanner';
// Added X to the lucide-react imports
import { ChevronLeft, Container, Zap, Keyboard, Camera, List, AlertTriangle, Battery, Sun, Moon, X } from 'lucide-react';
import { QueueManager } from './reception/QueueManager';

export const Reception: React.FC = () => {
    const navigate = useNavigate();
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [inputValue, setInputValue] = useState('');
    
    // Estados de feedback de alta velocidad
    const [lastAction, setLastAction] = useState<{type: 'success' | 'duplicate', label: string} | null>(null);
    const [flashActive, setFlashActive] = useState(false);
    const [isEcoMode, setIsEcoMode] = useState(false); // Modo ahorro para uso con escáner físico

    const buffer = useRef('');
    const lastKeyTime = useRef(0);

    const draftCount = useLiveQuery(() => db.sessions.where('status').equals('draft').count(), [], 0);
    const unsyncedDrafts = useLiveQuery(() => db.sessions.where('status').equals('draft').and(s => !s.lastSyncTimestamp).reverse().toArray(), [], []);

    const handleScan = async (code: string) => {
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode || cleanCode.length < 3) return;

        // 1. Detección de duplicados para integridad
        const alreadyExists = await sessionService.checkLabelExists(cleanCode);
        
        if (alreadyExists) {
            setLastAction({ type: 'duplicate', label: cleanCode });
            SoundFX.play('error');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return;
        }

        // 2. Registro de alta velocidad
        try {
            await sessionService.createDraftSession(cleanCode);
            setLastAction({ type: 'success', label: cleanCode });
            setFlashActive(true);
            SoundFX.play('success');
            if (navigator.vibrate) navigator.vibrate(40);
            
            // El flash dura poco para no molestar pero confirmar visualmente
            setTimeout(() => setFlashActive(false), 300);
            
            // En modo ECO, limpiamos el mensaje del último SKU tras 2 segundos
            if (isEcoMode) {
                setTimeout(() => setLastAction(prev => prev?.type === 'success' ? null : prev), 2000);
            }
        } catch (err: any) { 
            SoundFX.play('error'); 
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleScan(inputValue);
        setInputValue('');
        setShowManualInput(false); 
    };

    // MOTOR DE ESCUCHA GLOBAL (Optimizado para Escáner USB/BT)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Si hay un modal crítico (duplicado) bloqueamos el buffer hasta limpiar
            if (lastAction?.type === 'duplicate') return;
            
            // Ignorar si el usuario está escribiendo manualmente en el input
            if ((e.target as HTMLElement).tagName === 'INPUT' && !showManualInput) return;

            const now = Date.now();
            // Los escáneres envían ráfagas de caracteres con < 30ms de diferencia
            if (now - lastKeyTime.current > 50) {
                buffer.current = ''; 
            }
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length >= 3) {
                    handleScan(buffer.current);
                }
                buffer.current = '';
            } else if (e.key.length === 1) {
                buffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lastAction, isEcoMode]);

    // UI DINÁMICA SEGÚN MODO
    const bgColor = flashActive 
        ? 'bg-emerald-500' 
        : (lastAction?.type === 'duplicate' ? 'bg-rose-700' : (isEcoMode ? 'bg-black' : 'bg-slate-900'));

    return (
        <div className={`flex flex-col h-full w-full transition-colors duration-300 overflow-hidden relative ${bgColor}`}>
            
            {/* OVERLAY DUPLICADO (BLOQUEANTE POR SEGURIDAD) */}
            {lastAction?.type === 'duplicate' && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                    <div className="bg-white p-8 rounded-full mb-8 shadow-2xl animate-bounce">
                        <AlertTriangle className="w-20 h-20 text-rose-600" />
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">¡DUPLICADO!</h2>
                    <p className="text-rose-100 font-bold text-2xl mb-12 italic">
                        La etiqueta <span className="underline decoration-white underline-offset-8">{lastAction.label}</span> ya está registrada.
                    </p>
                    <button 
                        onClick={() => setLastAction(null)}
                        className="bg-white text-rose-700 px-16 py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-xl"
                    >
                        Limpiar Error
                    </button>
                </div>
            )}

            {/* HEADER MINIMALISTA */}
            <div className={`p-4 flex items-center justify-between shrink-0 z-20 border-b ${isEcoMode ? 'bg-black border-white/5' : 'bg-black/20 border-white/5'}`}>
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full text-white/40"><ChevronLeft className="w-6 h-6" /></button>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsEcoMode(!isEcoMode)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${isEcoMode ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                    >
                        {isEcoMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{isEcoMode ? 'Modo Eco Activo' : 'Modo Estándar'}</span>
                    </button>
                </div>

                <button onClick={() => setShowQueueModal(true)} className="p-2 hover:bg-white/10 rounded-full text-white/40 relative">
                    <List className="w-6 h-6" />
                    {draftCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                
                {/* INDICADOR DE ÚLTIMA LECTURA (FLOTANTE) */}
                <div className="h-32 flex flex-col items-center justify-center mb-4">
                    {lastAction?.type === 'success' && (
                        <div className="text-center animate-in slide-in-from-bottom-4 duration-300">
                            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-2">Lectura Confirmada</div>
                            <div className={`font-mono font-black tracking-[0.2em] ${isEcoMode ? 'text-4xl text-white' : 'text-3xl text-white/90'}`}>
                                {lastAction.label}
                            </div>
                        </div>
                    )}
                    {(!lastAction && isEcoMode) && (
                        <div className="flex flex-col items-center opacity-20">
                            <Zap className="w-8 h-8 text-white mb-2 animate-pulse" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Esperando Escaneo...</span>
                        </div>
                    )}
                </div>

                {/* CONTADOR DE PRODUCCIÓN (EL CORAZÓN DE LA UI) */}
                <div className="relative mb-12">
                    {/* Resplandor de fondo solo en modo estándar */}
                    {!isEcoMode && <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full"></div>}
                    
                    <div className={`relative flex flex-col items-center justify-center transition-all duration-500 ${isEcoMode ? 'scale-110' : ''}`}>
                        <div className={`text-[10px] font-black uppercase tracking-[0.5em] mb-6 ${isEcoMode ? 'text-white/20' : 'text-white/40'}`}>Bultos Sesión</div>
                        <div className="flex items-center justify-center gap-8">
                            <Container className={`w-16 h-16 ${isEcoMode ? 'text-white/5' : 'text-blue-500/20'}`} />
                            <span className={`text-[12rem] md:text-[16rem] font-black tracking-tighter tabular-nums leading-none ${isEcoMode ? 'text-white/80' : 'text-white'} drop-shadow-2xl`}>
                                {draftCount}
                            </span>
                        </div>
                    </div>
                </div>

                {/* BOTONES DE SOPORTE (OCULTOS O PEQUEÑOS EN MODO ECO) */}
                <div className={`grid grid-cols-2 gap-4 w-full max-w-sm transition-opacity duration-500 ${isEcoMode ? 'opacity-10 pointer-events-none' : 'opacity-100'}`}>
                    <button onClick={() => setShowManualInput(true)} className="bg-white/5 hover:bg-white/10 border-2 border-white/10 p-6 rounded-[2.5rem] flex flex-col items-center gap-3 transition-all active:scale-95">
                        <Keyboard className="w-8 h-8 text-white/30" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Manual</span>
                    </button>
                    <button onClick={() => setIsCameraOpen(true)} className="bg-white/5 hover:bg-white/10 border-2 border-white/10 p-6 rounded-[2.5rem] flex flex-col items-center gap-3 transition-all active:scale-95">
                        <Camera className="w-8 h-8 text-white/30" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Cámara</span>
                    </button>
                </div>
                
                {/* FOOTER DE ESTADO */}
                <div className="mt-auto pb-8 text-center">
                    <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border ${isEcoMode ? 'bg-white/5 border-white/5 text-white/20' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'}`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isEcoMode ? 'bg-white/20' : 'bg-blue-500'}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Puerto HID: Listo para Escaneo</span>
                    </div>
                </div>
            </div>

            {/* MODAL MANUAL */}
            {showManualInput && (
                <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
                    <div className="w-full max-w-sm">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black uppercase tracking-widest text-white italic">Entrada Manual</h3>
                            {/* Fixed: Added X icon from lucide-react to resolve 'Cannot find name X' error */}
                            <button onClick={() => setShowManualInput(false)} className="p-3 bg-white/5 rounded-full text-white"><X className="w-6 h-6"/></button>
                        </div>
                        <form onSubmit={handleManualSubmit}>
                            <input 
                                autoFocus 
                                value={inputValue} 
                                onChange={(e) => setInputValue(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} 
                                type="text" 
                                className="w-full h-24 bg-white/5 border-4 border-white/10 rounded-3xl text-4xl font-black text-center outline-none focus:border-blue-500 text-white tracking-widest mb-8" 
                            />
                            <button type="submit" className="w-full h-20 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all">Confirmar</button>
                        </form>
                    </div>
                </div>
            )}

            {isCameraOpen && <CameraScanner onScan={(code) => { setIsCameraOpen(false); handleScan(code); }} onClose={() => setIsCameraOpen(false)} />}
            
            <QueueManager 
                isOpen={showQueueModal} 
                onClose={() => setShowQueueModal(false)} 
                drafts={unsyncedDrafts} 
                onDelete={async (id) => { await db.sessions.delete(id); SoundFX.play('delete'); }} 
                onDiscardAll={async () => { if (confirm("¿Vaciar cola?")) { await db.sessions.where('status').equals('draft').delete(); setShowQueueModal(false); } }} 
            />
        </div>
    );
};

export default Reception;
