
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SoundFX } from '../services/audio';

interface CameraScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
    const [error, setError] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'error' | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isScanningRef = useRef(false);
    
    // Unique ID for this instance to prevent collision in React's strict mode double mount
    const uniqueId = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`).current;

    useEffect(() => {
        let isMounted = true;
        
        const initScanner = async () => {
            // Cleanup any previous instance if it exists (safety check)
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); } catch(e) {}
            }

            const html5QrCode = new Html5Qrcode(uniqueId);
            scannerRef.current = html5QrCode;

            try {
                // Ensure element exists
                const el = document.getElementById(uniqueId);
                if (!el) {
                    console.warn("Scanner element not found");
                    return;
                }

                isScanningRef.current = true;
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    { fps: 15, qrbox: { width: 260, height: 260 } },
                    (decodedText) => {
                        if (!isMounted) return;
                        
                        // Prevent multi-trigger
                        html5QrCode.pause(true); 
                        
                        setError(null);
                        setLastScanned(decodedText);
                        setFeedbackStatus('success');
                        SoundFX.play('success');
                        
                        if (navigator.vibrate) navigator.vibrate(60);
                        
                        setTimeout(() => {
                            if (isMounted) onScan(decodedText);
                        }, 450);
                    },
                    () => {}
                );
            } catch (err: any) {
                isScanningRef.current = false;
                console.error("Camera init error", err);
                if (isMounted) setError("No se pudo acceder a la cámara. Verifique permisos.");
            }
        };

        // Small delay to ensure DOM is ready
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
        <div className="fixed inset-0 z-[80] bg-black flex flex-col animate-in fade-in duration-300">
            <div className="flex justify-between items-center p-4 bg-black/60 absolute top-0 w-full z-50 backdrop-blur-md">
                <div className="flex items-center gap-2 text-white">
                    <div className="bg-blue-500 p-1.5 rounded-lg"><Camera className="w-5 h-5 text-white" /></div>
                    <span className="font-bold text-sm tracking-tight">Escáner de Cámara</span>
                </div>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 relative bg-black flex flex-col justify-center overflow-hidden">
                {feedbackStatus === 'success' && (
                    <div className="absolute inset-0 z-[60] bg-emerald-600 flex flex-col items-center justify-center">
                        <div className="bg-white rounded-full p-6 shadow-2xl animate-bounce"><CheckCircle2 className="w-20 h-20 text-emerald-600" /></div>
                        <div className="mt-6 bg-black/40 backdrop-blur-xl px-8 py-3 rounded-2xl border border-white/20 shadow-2xl">
                            <span className="text-white font-mono font-black text-2xl tracking-wider">{lastScanned}</span>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="text-center p-8 z-50">
                        <div className="bg-red-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30"><AlertTriangle className="w-12 h-12 text-red-500" /></div>
                        <h3 className="text-white font-bold text-2xl mb-2">Error de Cámara</h3>
                        <button onClick={onClose} className="bg-white text-black px-8 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">Cerrar y Volver</button>
                    </div>
                )}
                <div id={uniqueId} className="w-full h-full"></div>
            </div>
            <style>{`
                #${uniqueId} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
            `}</style>
        </div>
    );
};
