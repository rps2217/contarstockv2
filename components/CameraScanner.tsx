
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SoundFX } from '../services/audio';

interface CameraScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
    inline?: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose, inline = true }) => {
    const [error, setError] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'error' | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isScanningRef = useRef(false);
    
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
                    { fps: 20, qrbox: { width: 280, height: 280 } },
                    (decodedText) => {
                        if (!isMounted) return;
                        
                        setError(null);
                        setLastScanned(decodedText);
                        setFeedbackStatus('success');
                        SoundFX.play('success');
                        
                        if (navigator.vibrate) navigator.vibrate(60);
                        
                        onScan(decodedText);
                        // Breve delay visual para el usuario
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
    }, []);

    return (
        <div className={`${inline ? 'w-full h-full relative' : 'fixed inset-0 z-[80]'} bg-black flex flex-col animate-in fade-in duration-300`}>
            {!inline && (
                <div className="flex justify-between items-center p-4 bg-black/60 absolute top-0 w-full z-50 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-white">
                        <div className="bg-blue-500 p-1.5 rounded-lg"><Camera className="w-5 h-5 text-white" /></div>
                        <span className="font-bold text-sm tracking-tight">Escáner de Cámara</span>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white"><X className="w-6 h-6" /></button>
                </div>
            )}

            <div className="flex-1 relative bg-black flex flex-col justify-center overflow-hidden">
                {feedbackStatus === 'success' && (
                    <div className="absolute inset-0 z-[60] bg-emerald-600/20 backdrop-blur-sm flex flex-col items-center justify-center transition-all">
                        <div className="bg-emerald-500 rounded-full p-6 shadow-2xl animate-in zoom-in duration-150">
                            <CheckCircle2 className="w-16 h-16 text-white" />
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
                <div id={uniqueId} className="w-full h-full"></div>
            </div>
            <style>{`
                #${uniqueId} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
                #${uniqueId} { overflow: hidden; }
            `}</style>
        </div>
    );
};
