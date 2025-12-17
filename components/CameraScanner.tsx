
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SoundFX } from '../services/audio';

interface CameraScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'error' | null>(null);
    
    const uniqueId = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`).current;

    useEffect(() => {
        let isMounted = true;

        if (!scannerRef.current) {
             scannerRef.current = new Html5Qrcode(uniqueId);
        }
        
        const startScanner = async () => {
            if (!scannerRef.current) return;

            try {
                const config = {
                    fps: 15, // Aumentado para mayor fluidez
                    qrbox: { width: 260, height: 260 },
                };

                await scannerRef.current.start(
                    { facingMode: "environment" }, 
                    config,
                    (decodedText) => {
                        if (!isMounted || lastScanned === decodedText) return;

                        // --- FEEDBACK SEQUENCE ---
                        setLastScanned(decodedText);
                        setFeedbackStatus('success');
                        SoundFX.play('success');
                        
                        if (navigator.vibrate) {
                            navigator.vibrate(60);
                        }

                        // Delay closure slightly so user sees the confirmation
                        setTimeout(() => {
                            if (isMounted) {
                                onScan(decodedText);
                            }
                        }, 400);
                    },
                    () => {
                        // Ignore frame parse errors
                    }
                );
            } catch (err: any) {
                console.error("Error starting camera:", err);
                if (isMounted) {
                    setError("No se pudo acceder a la cámara. Verifique permisos o use HTTPS.");
                }
            }
        };

        if (isScanning) {
            startScanner();
        }

        return () => {
            isMounted = false;
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop()
                    .then(() => scannerRef.current?.clear())
                    .catch((err) => console.warn("Scanner stop warning:", err))
                    .finally(() => { scannerRef.current = null; });
            }
        };
    }, [isScanning, uniqueId, onScan, lastScanned]);

    return (
        <div className="fixed inset-0 z-[80] bg-black flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-black/60 absolute top-0 w-full z-30 backdrop-blur-md">
                <div className="flex items-center gap-2 text-white">
                    <div className="bg-blue-500 p-1.5 rounded-lg">
                        <Camera className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-sm tracking-tight">Escáner de Cámara</span>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Viewport Area */}
            <div className="flex-1 relative bg-black flex flex-col justify-center overflow-hidden">
                
                {/* 1. FLASH FEEDBACK LAYER */}
                {feedbackStatus === 'success' && (
                    <div className="absolute inset-0 z-40 bg-emerald-500/40 animate-in fade-in zoom-in duration-200 pointer-events-none flex flex-col items-center justify-center">
                        <div className="bg-white rounded-full p-4 shadow-2xl animate-bounce">
                            <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                        </div>
                        <div className="mt-4 bg-black/60 backdrop-blur px-6 py-2 rounded-2xl border border-white/20">
                            <span className="text-white font-mono font-bold text-xl">{lastScanned}</span>
                        </div>
                    </div>
                )}

                {error ? (
                    <div className="text-center p-8 z-50">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-white font-bold text-xl mb-2">Error de Cámara</h3>
                        <p className="text-slate-400 text-sm mb-6">{error}</p>
                        <button onClick={onClose} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold">Cerrar</button>
                    </div>
                ) : (
                    <>
                        <div id={uniqueId} className="w-full h-full"></div>
                        
                        {/* Overlay Guidelines */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                            <div className="w-64 h-64 border-2 border-white/30 rounded-[2.5rem] relative">
                                {/* Corners */}
                                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl"></div>
                                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl"></div>
                                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl"></div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-3xl"></div>
                                
                                {/* Scanning Laser Animation */}
                                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_1.5s_infinite]"></div>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none px-6 z-30">
                            <div className="bg-black/40 backdrop-blur-md rounded-full px-6 py-3 inline-flex items-center gap-3 border border-white/10 shadow-2xl">
                                <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
                                <span className="text-white text-xs font-bold uppercase tracking-widest">Encuadre el Código</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-110px); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(110px); opacity: 0; }
                }
                #reader__scan_region img { display: none; }
                #reader__dashboard_section_csr button { display: none; }
                
                #${uniqueId} video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 0 !important;
                }
            `}</style>
        </div>
    );
};
