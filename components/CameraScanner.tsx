
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Lock, Unlock, CheckCircle2, AlertTriangle } from 'lucide-react';
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
    const isScanningRef = useRef(false);
    const lastScanTime = useRef(0);
    const uniqueId = useRef(`v8-scanner-${Math.random().toString(36).substr(2, 5)}`).current;

    useEffect(() => {
        let isMounted = true;
        
        const initScanner = async () => {
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); } catch(e) {}
            }

            const html5QrCode = new Html5Qrcode(uniqueId);
            scannerRef.current = html5QrCode;

            try {
                isScanningRef.current = true;
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    { fps: 30, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0 },
                    (decodedText) => {
                        if (!isMounted || !isTriggered) return;
                        
                        const now = Date.now();
                        if (now - lastScanTime.current < 1200) return;
                        
                        lastScanTime.current = now;
                        setFeedbackStatus('success');
                        
                        if (navigator.vibrate) navigator.vibrate(50);
                        onScan(decodedText);
                        
                        setTimeout(() => {
                            if (isMounted) setFeedbackStatus(null);
                        }, 200);
                    },
                    () => {}
                );
            } catch (err: any) {
                isScanningRef.current = false;
                if (isMounted) setError("Motor Óptico Detenido");
            }
        };

        const timer = setTimeout(initScanner, 50);
        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (scannerRef.current && isScanningRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, [uniqueId]);

    return (
        <div className={`${inline ? 'w-full h-full relative' : 'fixed inset-0 z-[100]'} bg-black overflow-hidden`}>
            
            {/* CAPA DE SEGURO (BLOQUEO COGNITIVO) */}
            <div className={`absolute inset-0 z-40 transition-all duration-300 pointer-events-none flex flex-col items-center justify-center ${isTriggered ? 'bg-transparent opacity-0' : 'bg-rose-950/40 backdrop-grayscale'}`}>
                {!isTriggered && !error && (
                    <div className="bg-black/80 p-5 rounded-full border-4 border-rose-600 animate-pulse">
                        <Lock className="w-10 h-10 text-rose-600" />
                    </div>
                )}
            </div>

            {/* LASER DE IMPACTO */}
            {isTriggered && !feedbackStatus && (
                <div className="absolute inset-0 z-30 pointer-events-none">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-red-600/50 shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-pulse"></div>
                    <div className="absolute inset-0 border-[16px] border-white/5"></div>
                </div>
            )}

            <div className="flex-1 relative bg-black flex flex-col justify-center overflow-hidden h-full">
                {feedbackStatus === 'success' && (
                    <div className="absolute inset-0 z-[60] bg-emerald-600/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white rounded-full p-6 shadow-[0_0_50px_rgba(255,255,255,0.4)] animate-in zoom-in duration-100">
                            <Unlock className="w-16 h-16 text-emerald-600" />
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-rose-500 mb-6" />
                        <h3 className="text-white font-black uppercase tracking-widest">{error}</h3>
                        <button onClick={onClose} className="mt-8 bg-white text-black px-10 py-4 font-black uppercase text-xs rounded-none border-b-8 border-slate-300">Cerrar</button>
                    </div>
                )}
                
                <div id={uniqueId} className={`w-full h-full transition-all duration-500 ${isTriggered ? 'scale-100 opacity-100 grayscale-0' : 'scale-95 opacity-30 grayscale'}`}></div>
            </div>
            
            <style>{`
                #${uniqueId} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
            `}</style>
        </div>
    );
};
