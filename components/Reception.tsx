
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReception } from '../hooks/useReception';
import { CameraScanner } from './CameraScanner';
import { ChevronLeft, List, AlertTriangle, Sun, Moon, X, Keyboard, Camera, ArrowRight } from 'lucide-react';
import { QueueManager } from './reception/QueueManager';
import { ReceptionHero } from './reception/ReceptionHero';
import { IndustrialButton } from './common/IndustrialButton';

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
    // Usamos colores consistentes con el resto de la app (Slate 950 base)
    const bgColor = state.flashActive 
        ? 'bg-blue-600' 
        : (state.lastAction?.type === 'duplicate' ? 'bg-rose-900' : 'bg-slate-950');

    return (
        <div className={`flex flex-col h-full w-full transition-colors duration-200 overflow-hidden relative ${bgColor} text-white font-mono`}>
            
            {/* OVERLAY DUPLICADO (BLOQUEANTE) */}
            {state.lastAction?.type === 'duplicate' && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-200 bg-rose-950/90 backdrop-blur-sm">
                    <div className="bg-rose-500 p-8 rounded-full mb-8 shadow-2xl animate-bounce">
                        <AlertTriangle className="w-20 h-20 text-white" />
                    </div>
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">¡DUPLICADO!</h2>
                    <p className="text-rose-200 font-bold text-xl mb-12 max-w-xs mx-auto leading-relaxed">
                        La etiqueta <br/><span className="text-white bg-rose-800 px-2 rounded decoration-white underline-offset-4">{state.lastAction.label}</span><br/> ya fue escaneada.
                    </p>
                    <IndustrialButton 
                        variant="ghost"
                        onClick={actions.clearError}
                        className="bg-white text-rose-700 hover:bg-rose-50 w-full max-w-sm"
                    >
                        ENTENDIDO
                    </IndustrialButton>
                </div>
            )}

            {/* HEADER INDUSTRIAL */}
            <div className="p-4 flex items-center justify-between shrink-0 z-20 border-b-4 border-white/5 bg-black/20 backdrop-blur-sm">
                <button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-white/10 rounded-2xl text-white/60 transition-all active:scale-90 border-2 border-transparent hover:border-white/10">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Módulo</span>
                    <span className="text-lg font-black uppercase tracking-widest text-white italic">Recepción</span>
                </div>

                <button 
                    onClick={() => state.setShowQueueModal(true)} 
                    className="p-3 hover:bg-white/10 rounded-2xl text-white/60 relative border-2 border-transparent hover:border-white/10 active:scale-90 transition-all"
                >
                    <List className="w-6 h-6" />
                    {state.draftCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-500 border-2 border-black rounded-full animate-pulse"></span>
                    )}
                </button>
            </div>

            {/* HERO COMPONENT */}
            <ReceptionHero 
                lastAction={state.lastAction}
                draftCount={state.draftCount}
                isEcoMode={state.isEcoMode}
                onToggleManual={() => state.setShowManualInput(true)} // Dummy func, buttons controlled below
                onCameraClick={() => state.setIsCameraOpen(true)}     // Dummy func
            />

            {/* ACCIONES PRINCIPALES (FOOTER) */}
            <div className="p-6 pb-safe-area grid grid-cols-2 gap-4 shrink-0 bg-slate-900/50 border-t border-white/5">
                <IndustrialButton 
                    variant="secondary"
                    icon={Keyboard}
                    onClick={() => state.setShowManualInput(true)}
                    className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 h-20"
                >
                    TECLADO
                </IndustrialButton>
                
                <IndustrialButton 
                    variant="primary"
                    icon={Camera}
                    onClick={() => state.setIsCameraOpen(true)}
                    className="h-20"
                >
                    CÁMARA
                </IndustrialButton>
            </div>

            {/* MODAL INPUT MANUAL (ESTILO MARTILLO) */}
            {state.showManualInput && (
                <div className="absolute inset-0 z-[60] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm">
                        <div className="flex justify-end mb-4">
                            <button onClick={() => state.setShowManualInput(false)} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 active:scale-90 transition-all">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>
                        
                        <div className="text-center mb-8">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white italic">Entrada Manual</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Digite ID de Etiqueta</p>
                        </div>

                        <form onSubmit={handleManualSubmit}>
                            <input 
                                autoFocus 
                                value={inputValue} 
                                onChange={(e) => setInputValue(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase())} 
                                type="text" 
                                className="w-full h-24 bg-black border-4 border-white/10 rounded-[2rem] text-4xl font-black text-center outline-none focus:border-blue-500 text-white tracking-widest mb-6 transition-colors shadow-inner font-mono"
                                placeholder="LBL-..."
                            />
                            <IndustrialButton 
                                type="submit" 
                                variant="primary" 
                                icon={ArrowRight} 
                                fullWidth
                                disabled={inputValue.length < 3}
                            >
                                REGISTRAR
                            </IndustrialButton>
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
