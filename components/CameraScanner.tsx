
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Lock, Unlock, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { SoundFX } from '../services/audio';

interface CameraScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
    inline?: boolean;
    isTriggered?: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose, inline = true, isTriggered = false }) => {
    const [error, setError] = useState<string | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<'success' | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanTime = useRef(0);
    const triggerRef = useRef(isTriggered);
    const isComponentMounted = useRef(true);

    const SCANNER_DOM_ID = "v8-core-optical-engine";

    useEffect(() => { triggerRef.current = isTriggered; }, [isTriggered]);

    useEffect(() => {
        isComponentMounted.current = true;
        let scannerInstance: Html5Qrcode | null = null;

        const startEngine = async () => {
            try {
                const oldScanner = document.getElementById(SCANNER_DOM_ID);
                if (oldScanner) oldScanner.innerHTML = "";

                scannerInstance = new Html5Qrcode(SCANNER_DOM_ID);
                scannerRef.current = scannerInstance;

                await scannerInstance.start(
                    { facingMode: "environment" }, 
                    { fps: 30, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                    (decodedText) => {
                        if (!isComponentMounted.current || !triggerRef.current) return;
                        
                        const now = Date.now();
                        if (now - lastScanTime.current < 1200) return;
                        
                        lastScanTime.current = now;
                        setFeedbackStatus('success');
                        
                        if (navigator.vibrate) navigator.vibrate(40);
                        onScan(decodedText);
                        
                        setTimeout(() => {
                            if (isComponentMounted.current) setFeedbackStatus(null);
                        }, 250);
                    },
                    () => {}
                );
            } catch (err: any) {
                if (isComponentMounted.current) {
                    setError("OPTICAL_ENGINE_LOCK_FAILURE");
                }
            }
        };

        startEngine();

        return () => {
            isComponentMounted.current = false;
            if (scannerInstance && scannerInstance.isScanning) {
                scannerInstance.stop().catch(() => {}).finally(() => {
                    scannerRef.current = null;
                });
            }
        };
    }, [onScan]);

    return (
        <div className={`${inline ? 'w-full h-full relative' : 'fixed inset-0 z-[100]'} bg-black overflow-hidden`}>
            
            {/* RETÍCULO HUD */}
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                <div className={`w-64 h-64 border-2 transition-all duration-150 rounded-3xl flex items-center justify-center ${isTriggered ? 'border-blue-500/40 scale-100' : 'border-white/10 scale-90 opacity-20'}`}>
                    <Target className={`w-12 h-12 transition-all duration-300 ${isTriggered ? 'text-blue-500 opacity-30 animate-pulse' : 'text-white'}`} />
                    
                    {/* Esquinas Técnicas */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                </div>
                
                {/* Línea de barrido solo si está disparado */}
                {isTriggered && !feedbackStatus && (
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-red-500 shadow-[0_0_10px_red] animate-[radar-pulse_1s_infinite] opacity-50"></div>
                )}
            </div>

            {/* VELO DE BLOQUEO (TRANSICIÓN ULTRARRÁPIDA 75ms) */}
            <div className={`absolute inset-0 z-40 transition-all duration-75 pointer-events-none flex flex-col items-center justify-center ${isTriggered ? 'bg-transparent opacity-0' : 'bg-black/80 backdrop-blur-sm'}`}>
                {!isTriggered && !error && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-slate-900 border-4 border-white/5 p-5 rounded-full text-blue-500">
                            <Lock className="w-10 h-10" />
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em]">LENS_LOCKED</span>
                    </div>
                )}
            </div>

            <div className="flex-1 relative bg-black flex flex-col justify-center h-full">
                {feedbackStatus === 'success' && (
                    <div className="absolute inset-0 z-[60] bg-emerald-600/60 backdrop-blur-md flex items-center justify-center animate-in zoom-in duration-100">
                        <CheckCircle2 className="w-20 h-20 text-white" />
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
                        <h3 className="text-white font-black uppercase text-[10px] tracking-widest">{error}</h3>
                        <button onClick={onClose} className="mt-8 bg-white text-black px-10 py-4 font-black uppercase text-[10px] border-b-8 border-slate-300">Volver</button>
                    </div>
                )}
                
                {/* VIDEO ENGINE (TRANSICIÓN 150ms) */}
                <div id={SCANNER_DOM_ID} className={`w-full h-full transition-all duration-150 ${isTriggered ? 'opacity-100 scale-100' : 'opacity-10 scale-110 grayscale blur-sm'}`}></div>
            </div>
            
            <style>{`
                #${SCANNER_DOM_ID} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
            `}</style>
        </div>
    );
};
