
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReception } from '../hooks/useReception';
import { CameraScanner } from './CameraScanner';
import { ChevronLeft, List, AlertTriangle, Sun, Moon, X } from 'lucide-react';
import { QueueManager } from './reception/QueueManager';
import { ReceptionHero } from './reception/ReceptionHero';

export const Reception: React.FC = () => {
    const navigate = useNavigate();
    const { state, actions } = useReception();
    const [inputValue, setInputValue] = useState('');

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        actions.handleManualSubmit(inputValue);
        setInputValue('');
    };

    // UI DINÁMICA SEGÚN MODO
    const bgColor = state.flashActive 
        ? 'bg-emerald-500' 
        : (state.lastAction?.type === 'duplicate' ? 'bg-rose-700' : (state.isEcoMode ? 'bg-black' : 'bg-slate-900'));

    return (
        <div className={`flex flex-col h-full w-full transition-colors duration-300 overflow-hidden relative ${bgColor}`}>
            
            {/* OVERLAY DUPLICADO (BLOQUEANTE POR SEGURIDAD) */}
            {state.lastAction?.type === 'duplicate' && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                    <div className="bg-white p-8 rounded-full mb-8 shadow-2xl animate-bounce">
                        <AlertTriangle className="w-20 h-20 text-rose-600" />
                    </div>
                    <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">¡DUPLICADO!</h2>
                    <p className="text-rose-100 font-bold text-2xl mb-12 italic">
                        La etiqueta <span className="underline decoration-white underline-offset-8">{state.lastAction.label}</span> ya está registrada.
                    </p>
                    <button 
                        onClick={actions.clearError}
                        className="bg-white text-rose-700 px-16 py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all text-xl"
                    >
                        Limpiar Error
                    </button>
                </div>
            )}

            {/* HEADER MINIMALISTA */}
            <div className={`p-4 flex items-center justify-between shrink-0 z-20 border-b ${state.isEcoMode ? 'bg-black border-white/5' : 'bg-black/20 border-white/5'}`}>
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full text-white/40"><ChevronLeft className="w-6 h-6" /></button>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => state.setIsEcoMode(!state.isEcoMode)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${state.isEcoMode ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                    >
                        {state.isEcoMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{state.isEcoMode ? 'Modo Eco Activo' : 'Modo Estándar'}</span>
                    </button>
                </div>

                <button onClick={() => state.setShowQueueModal(true)} className="p-2 hover:bg-white/10 rounded-full text-white/40 relative">
                    <List className="w-6 h-6" />
                    {state.draftCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
                </button>
            </div>

            {/* HERO COMPONENT (VISUALS) */}
            <ReceptionHero 
                lastAction={state.lastAction}
                draftCount={state.draftCount}
                isEcoMode={state.isEcoMode}
                onToggleManual={() => state.setShowManualInput(true)}
                onCameraClick={() => state.setIsCameraOpen(true)}
            />

            {/* INPUT MANUAL MODAL */}
            {state.showManualInput && (
                <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
                    <div className="w-full max-w-sm">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-xl font-black uppercase tracking-widest text-white italic">Entrada Manual</h3>
                            <button onClick={() => state.setShowManualInput(false)} className="p-3 bg-white/5 rounded-full text-white"><X className="w-6 h-6"/></button>
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

            {state.isCameraOpen && (
                <CameraScanner 
                    isTriggered={true} 
                    onScan={(code) => { state.setIsCameraOpen(false); actions.handleScan(code); }} 
                    onClose={() => state.setIsCameraOpen(false)} 
                />
            )}
            
            <QueueManager 
                isOpen={state.showQueueModal} 
                onClose={() => state.setShowQueueModal(false)} 
                drafts={state.unsyncedDrafts} 
                onDelete={actions.deleteDraft} 
                onDiscardAll={actions.discardAllDrafts} 
            />
        </div>
    );
};

export default Reception;
