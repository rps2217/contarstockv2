
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
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<'success' | 'error' | null>(null);
    const lastProcessedCode = useRef<string | null>(null);
    const uniqueId = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`).current;

    useEffect(() => {
        let isMounted = true;
        if (!scannerRef.current) scannerRef.current = new Html5Qrcode(uniqueId);
        
        const startScanner = async () => {
            try {
                await scannerRef.current!.start(
                    { facingMode: "environment" }, 
                    { fps: 15, qrbox: { width: 260, height: 260 } },
                    (decodedText) => {
                        if (!isMounted || lastProcessedCode.current === decodedText) return;
                        lastProcessedCode.current = decodedText;
                        setError(null);
                        setLastScanned(decodedText);
                        setFeedbackStatus('success');
                        SoundFX.play('success');
                        if (navigator.vibrate) navigator.vibrate(60);
                        setTimeout(() => isMounted && onScan(decodedText), 450);
                    },
                    () => {}
                );
            } catch (err: any) {
                if (isMounted && !lastProcessedCode.current) setError("No se pudo acceder a la cámara.");
            }
        };

        startScanner();
        return () => {
            isMounted = false;
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {}).finally(() => { scannerRef.current = null; });
            }
        };
    }, [uniqueId, onScan]);

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
                {error && feedbackStatus !== 'success' ? (
                    <div className="text-center p-8 z-50">
                        <div className="bg-red-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30"><AlertTriangle className="w-12 h-12 text-red-500" /></div>
                        <h3 className="text-white font-bold text-2xl mb-2">Error de Cámara</h3>
                        <button onClick={onClose} className="bg-white text-black px-8 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">Cerrar y Volver</button>
                    </div>
                ) : (
                    feedbackStatus !== 'success' && (
                        <>
                            <div id={uniqueId} className="w-full h-full"></div>
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                                <div className="w-64 h-64 border-2 border-white/30 rounded-[2.5rem] relative">
                                    <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl"></div>
                                    <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl"></div>
                                    <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl"></div>
                                    <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-3xl"></div>
                                    <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_1.5s_infinite]"></div>
                                </div>
                            </div>
                            <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none px-6 z-30">
                                <div className="bg-black/60 backdrop-blur-md rounded-full px-6 py-3 inline-flex items-center gap-3 border border-white/10 shadow-2xl">
                                    <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
                                    <span className="text-white text-xs font-bold uppercase tracking-widest">Encuadre el Código</span>
                                </div>
                            </div>
                        </>
                    )
                )}
            </div>
            <style>{`
                @keyframes scan { 0% { transform: translateY(-110px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(110px); opacity: 0; } }
                #reader__scan_region img { display: none; }
                #reader__dashboard_section_csr button { display: none; }
                #${uniqueId} video { width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 0 !important; }
            `}</style>
        </div>
    );
};
