
import React, { useState, useMemo, memo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReception } from '../hooks/useReception';
import { CameraScanner } from './CameraScanner';
import { ChevronLeft, Keyboard, Camera, Trash2, Box, Cloud, Lock } from 'lucide-react';
import { ReceptionHero } from './reception/ReceptionHero';
import { VirtualList } from './common/VirtualList';
import { NumericKeypad } from './NumericKeypad';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';
import { SoundFX } from '../services/audio';

const ReceptionRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { onDelete } = data;

    return (
        <div className="px-3 py-1 h-full">
            <div className="w-full h-full border-2 border-white/5 bg-slate-900/40 p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98]">
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-blue-900/20 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Box className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="font-mono font-black text-white truncate text-sm uppercase tracking-wider">
                            {item.logisticsLabel}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-2">
                            <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span className="text-blue-500 font-black">PENDIENTE</span>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-rose-500 hover:bg-rose-900/20 rounded-xl transition-all active:scale-90"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
});

export const Reception: React.FC = () => {
    const navigate = useNavigate();
    const { state, actions } = useReception();
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [isScreenLocked, setIsScreenLocked] = useState(false);

    // --- LÓGICA DE AUTO-BLOQUEO (4 Segundos) ---
    const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const AUTO_LOCK_DELAY = 4000;

    const resetAutoLockTimer = useCallback(() => {
        if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
        if (isScreenLocked) return;

        autoLockTimerRef.current = setTimeout(() => {
            setIsScreenLocked(true);
            if (navigator.vibrate) navigator.vibrate(10);
        }, AUTO_LOCK_DELAY);
    }, [isScreenLocked]);

    useEffect(() => {
        resetAutoLockTimer();
        return () => { if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current); };
    }, [state.draftCount, state.lastAction, resetAutoLockTimer]);

    const handleInteraction = () => resetAutoLockTimer();

    const handleKeypadConfirm = () => {
        if (manualCode.length > 0) {
            actions.handleManualSubmit(manualCode);
            setManualCode('');
        }
        state.setShowManualInput(false);
    };

    const rowData = useMemo(() => ({ 
        onDelete: actions.deleteDraft 
    }), [actions.deleteDraft]);

    const containerClass = state.flashActive 
        ? 'bg-blue-600' 
        : (state.lastAction?.type === 'duplicate' ? 'bg-rose-950' : 'bg-black');

    return (
        <div 
            className={`h-screen w-full flex flex-col font-mono select-none overflow-hidden text-white transition-colors duration-200 ${containerClass}`}
            onPointerDown={handleInteraction}
            onKeyDown={handleInteraction}
        >
            
            {/* 1. HEADER INDUSTRIAL */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-2xl shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    
                    <button 
                        onClick={() => setIsScreenLocked(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl active:bg-amber-500 active:text-black transition-all"
                    >
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Bloquear</span>
                    </button>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">RECEPCIÓN</span>
                    <span className="text-xs font-black uppercase tracking-widest text-white italic">Burst_Mode</span>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => navigate('/sync')}
                        className="h-10 px-4 bg-emerald-600 rounded-xl active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40"
                    >
                        <Cloud className="w-5 h-5 text-white" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest hidden sm:inline">Subir</span>
                    </button>
                </div>
            </div>

            {/* 2. HUD DINÁMICO */}
            <ReceptionHero 
                lastAction={state.lastAction}
                draftCount={state.draftCount}
                isEcoMode={state.isEcoMode}
                onToggleManual={() => {}}
                onCameraClick={() => {}}
            />

            {/* 3. ÁREA DE LISTA Y HERRAMIENTAS */}
            <div className="flex-1 min-h-0 bg-black flex flex-col relative">
                <div className="shrink-0 p-3 bg-slate-900/50 border-b border-white/5 grid grid-cols-1 gap-2">
                    <button
                        onClick={() => { setManualCode(''); state.setShowManualInput(true); }}
                        className="h-11 rounded-xl font-black text-[10px] flex items-center justify-center gap-3 transition-all border-2 bg-slate-800 border-slate-700 text-white shadow-lg active:scale-95"
                    >
                        <Keyboard className="w-4 h-4 text-blue-400" />
                        <span>INGRESAR ETIQUETA MANUAL</span>
                    </button>
                </div>

                <div className="flex-1 min-h-0 relative">
                    <VirtualList 
                        items={state.unsyncedDrafts} 
                        itemHeight={80} 
                        renderRow={ReceptionRow} 
                        rowData={rowData} 
                        className="bg-black/20" 
                        emptyState={
                            <div className="flex flex-col items-center opacity-20 mt-16">
                                <Box className="w-20 h-20 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Esperando_Input</p>
                            </div>
                        }
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
                </div>
            </div>

            {/* 4. GATILLO ÓPTICO */}
            <div className="h-24 md:h-28 shrink-0 bg-slate-900 border-t border-white/5 flex items-center px-4 z-40 pb-6">
                <button 
                    onPointerDown={(e) => { e.preventDefault(); if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} 
                    onPointerUp={() => setIsTriggerActive(false)}
                    onPointerLeave={() => setIsTriggerActive(false)}
                    className={`flex-1 h-16 rounded-2xl flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.98] border-b-4 ${isTriggerActive ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0 shadow-inner' : 'bg-white text-black border-slate-300 shadow-2xl'}`}
                >
                    <Camera className="w-6 h-6" />
                    <span className="text-[11px] font-black uppercase tracking-[0.4em]">{isTriggerActive ? 'LENS_OPEN' : 'GATILLO_OPTICO'}</span>
                </button>
            </div>

            {/* MODALES Y OVERLAYS */}
            {(isTriggerActive || state.isCameraOpen) && (
                <div className="fixed inset-0 z-[250]">
                     <CameraScanner 
                        onScan={(code) => { actions.handleScan(code); setIsTriggerActive(false); state.setIsCameraOpen(false); }} 
                        onClose={() => { setIsTriggerActive(false); state.setIsCameraOpen(false); }} 
                        isTriggered={true} 
                    />
                </div>
            )}

            <NumericKeypad 
                isOpen={state.showManualInput}
                onClose={() => state.setShowManualInput(false)}
                title="Escribir Etiqueta"
                value={manualCode}
                onInput={(v) => setManualCode(prev => prev + v)}
                onDelete={() => setManualCode(prev => prev.slice(0, -1))}
                onConfirm={handleKeypadConfirm}
            />

            <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => { setIsScreenLocked(false); resetAutoLockTimer(); }} />
        </div>
    );
};

export default Reception;
