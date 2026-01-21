
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertTriangle, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { SoundFX } from '../services/audio';

interface CameraScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
    inline?: boolean;
    isTriggered?: boolean; // Nuevo prop para control de gatillo
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose, inline = true, isTriggered = true }) => {
    const [error, setError] = useState<string | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<'success' | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isScanningRef = useRef(false);
    const lastScanTime = useRef(0);
    
    const uniqueId = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`).current;

    useEffect(() => {
        let isMounted = true;
        
        const initScanner = async () => {
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); } catch(e) {}
            }

            const html5QrCode = new Html5Qrcode(uniqueId);
            scannerRef.current = html5QrCode;

            try {
                const el = document.getElementById(uniqueId);
                if (!el) return;

                isScanningRef.current = true;
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    { fps: 25, qrbox: { width: 280, height: 280 } },
                    (decodedText) => {
                        if (!isMounted) return;
                        
                        // LÓGICA DE GATILLO: Solo procesamos si el gatillo está presionado
                        // y ha pasado tiempo suficiente desde el último escaneo
                        const now = Date.now();
                        if (!isTriggered || (now - lastScanTime.current < 1500)) return;
                        
                        lastScanTime.current = now;
                        setError(null);
                        setFeedbackStatus('success');
                        SoundFX.play('success');
                        
                        if (navigator.vibrate) navigator.vibrate(60);
                        
                        onScan(decodedText);
                        
                        setTimeout(() => {
                            if (isMounted) setFeedbackStatus(null);
                        }, 300);
                    },
                    () => {}
                );
            } catch (err: any) {
                isScanningRef.current = false;
                if (isMounted) setError("Error de Cámara. Verifique permisos.");
            }
        };

        const timer = setTimeout(initScanner, 100);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (scannerRef.current && isScanningRef.current) {
                scannerRef.current.stop()
                    .then(() => scannerRef.current?.clear())
                    .catch((err) => console.warn("Scanner clean error", err));
            }
        };
    }, [isTriggered]); // Reiniciar si el estado del gatillo cambia (opcional, mejor manejarlo interno)

    return (
        <div className={`${inline ? 'w-full h-full relative' : 'fixed inset-0 z-[80]'} bg-black flex flex-col overflow-hidden`}>
            {/* Capa de Estado del Gatillo */}
            {!isTriggered && !error && (
                <div className="absolute inset-0 z-40 bg-black/40 backdrop-grayscale flex flex-col items-center justify-center pointer-events-none transition-all duration-300">
                    <div className="bg-black/60 p-6 rounded-full border-2 border-white/20 mb-4">
                        <Lock className="w-12 h-12 text-white/40" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Cámara en Espera</span>
                </div>
            )}

            {isTriggered && !feedbackStatus && (
                <div className="absolute inset-0 z-30 pointer-events-none border-[12px] border-blue-500/20 animate-pulse">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                </div>
            )}

            <div className="flex-1 relative bg-black flex flex-col justify-center overflow-hidden">
                {feedbackStatus === 'success' && (
                    <div className="absolute inset-0 z-[60] bg-emerald-600/40 backdrop-blur-sm flex flex-col items-center justify-center transition-all">
                        <div className="bg-emerald-500 rounded-full p-8 shadow-2xl animate-in zoom-in duration-150">
                            <CheckCircle2 className="w-20 h-20 text-white" />
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="text-center p-8 z-50 bg-black flex flex-col items-center justify-center h-full">
                        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
                        <h3 className="text-white font-bold text-sm mb-4">{error}</h3>
                        <button onClick={onClose} className="bg-white text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase">Reintentar</button>
                    </div>
                )}
                
                <div id={uniqueId} className={`w-full h-full transition-opacity duration-500 ${isTriggered ? 'opacity-100' : 'opacity-40'}`}></div>
            </div>
            
            <style>{`
                #${uniqueId} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
                #${uniqueId} { overflow: hidden; }
            `}</style>
        </div>
    );
};
