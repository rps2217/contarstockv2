
import React, { useState, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReception } from '../hooks/useReception';
import { CameraScanner } from './CameraScanner';
import { ChevronLeft, Keyboard, Camera, Trash2, Box } from 'lucide-react';
import { ReceptionHero } from './reception/ReceptionHero';
import { VirtualList } from './common/VirtualList';
import { NumericKeypad } from './NumericKeypad';
import { SoundFX } from '../services/audio';

// Componente de Fila para la Lista Virtual (Estilo Martillo)
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
                            <span className="text-blue-500">PENDIENTE</span>
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
    
    // Estados locales para UI interactiva
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [manualCode, setManualCode] = useState('');

    const handleKeypadConfirm = () => {
        if (manualCode.length > 0) {
            actions.handleManualSubmit(manualCode);
            setManualCode('');
        }
        state.setShowManualInput(false);
    };

    // Datos memoizados para la lista virtual
    const rowData = useMemo(() => ({ 
        onDelete: actions.deleteDraft 
    }), [actions.deleteDraft]);

    // Color de fondo dinámico para feedback
    const containerClass = state.flashActive 
        ? 'bg-blue-600' 
        : (state.lastAction?.type === 'duplicate' ? 'bg-rose-900' : 'bg-black');

    return (
        <div className={`h-screen w-full flex flex-col font-mono select-none overflow-hidden text-white transition-colors duration-200 ${containerClass}`}>
            
            {/* 1. HEADER (Estilo Industrial Compacto) */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900/80 shrink-0 z-20">
                <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40">RECEPCIÓN</span>
                    <span className="text-xs font-black uppercase tracking-widest text-white italic">Modo Ráfaga</span>
                </div>

                <button 
                    onClick={actions.discardAllDrafts}
                    disabled={state.unsyncedDrafts.length === 0}
                    className="p-2.5 bg-white/5 rounded-xl text-rose-500 disabled:opacity-20 active:bg-rose-900/40 transition-colors"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            {/* 2. HUD (Panel de Instrumentos) */}
            <ReceptionHero 
                lastAction={state.lastAction}
                draftCount={state.draftCount}
                isEcoMode={state.isEcoMode}
                onToggleManual={() => {}} // No usado aquí, controlado por toolbar
                onCameraClick={() => {}}  // No usado aquí, controlado por gatillo
            />

            {/* 3. ÁREA PRINCIPAL (Lista Virtual) */}
            <div className="flex-1 min-h-0 bg-black flex flex-col relative">
                {/* Barra de Herramientas Superior */}
                <div className="shrink-0 p-3 bg-slate-900/50 border-b border-white/5 grid grid-cols-1 gap-2">
                    <button
                        onClick={() => { setManualCode(''); state.setShowManualInput(true); }}
                        className="h-12 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all border-2 bg-slate-800 border-slate-700 text-white shadow-lg active:scale-95 hover:bg-slate-700"
                    >
                        <Keyboard className="w-4 h-4" />
                        <span>ENTRADA MANUAL</span>
                    </button>
                </div>

                {/* Lista Scrollable */}
                <div className="flex-1 min-h-0 relative">
                    <VirtualList 
                        items={state.unsyncedDrafts} 
                        itemHeight={80} 
                        renderRow={ReceptionRow} 
                        rowData={rowData} 
                        className="bg-black/20" 
                        emptyState={
                            <div className="flex flex-col items-center opacity-20 mt-10">
                                <Box className="w-16 h-16 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Cola Vacía</p>
                            </div>
                        }
                    />
                    {/* Sombra de scroll inferior */}
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
                </div>
            </div>

            {/* 4. GATILLO ÓPTICO (Estilo Martillo) */}
            <div className="h-24 md:h-28 shrink-0 bg-slate-900 border-t border-white/5 flex items-center px-4 z-40 pb-safe">
                <button 
                    onPointerDown={(e) => { e.preventDefault(); if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} 
                    onPointerUp={() => setIsTriggerActive(false)}
                    onPointerLeave={() => setIsTriggerActive(false)}
                    className={`flex-1 h-14 md:h-16 rounded-2xl flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.98] border-b-4 ${isTriggerActive ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0' : 'bg-white text-black border-slate-300 shadow-xl'}`}
                >
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isTriggerActive ? 'LENS_OPEN' : 'GATILLO_OPTICO'}</span>
                </button>
            </div>

            {/* LÓGICA DE CÁMARA */}
            {(isTriggerActive || state.isCameraOpen) && (
                <div className="fixed inset-0 z-[100]">
                     <CameraScanner 
                        onScan={(code) => { actions.handleScan(code); setIsTriggerActive(false); state.setIsCameraOpen(false); }} 
                        onClose={() => { setIsTriggerActive(false); state.setIsCameraOpen(false); }} 
                        isTriggered={true} 
                    />
                </div>
            )}

            {/* TECLADO MANUAL */}
            <NumericKeypad 
                isOpen={state.showManualInput}
                onClose={() => state.setShowManualInput(false)}
                title="ID de Bulto / Etiqueta"
                value={manualCode}
                onInput={(v) => setManualCode(prev => prev + v)}
                onDelete={() => setManualCode(prev => prev.slice(0, -1))}
                onConfirm={handleKeypadConfirm}
            />
        </div>
    );
};

export default Reception;
