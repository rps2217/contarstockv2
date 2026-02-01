import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Lock, AlertTriangle, CheckCircle2, Target, Zap, Activity } from 'lucide-react';

interface CameraScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
    inline?: boolean;
    isTriggered?: boolean;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose, inline = true, isTriggered = false }) => {
    const [error, setError] = useState<string | null>(null);
    const [feedbackStatus, setFeedbackStatus] = useState<'success' | null>(null);
    const [engineType, setEngineType] = useState<'native' | 'wasm' | 'init'>('init');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    // Fix: Added undefined as initial value to requestRef to avoid "Expected 1 arguments, but got 0" error.
    const requestRef = useRef<number | undefined>(undefined);
    
    const lastScanTime = useRef(0);
    const triggerRef = useRef(isTriggered);
    const isComponentMounted = useRef(true);

    const SCANNER_DOM_ID = "v8-core-optical-engine";

    useEffect(() => { triggerRef.current = isTriggered; }, [isTriggered]);

    // --- MOTOR DE DETECCIÓN NATIVO (Barcode Detection API) ---
    const startNativeEngine = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            const formats = ['qr_code', 'ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'itf'];
            // @ts-ignore - La API es experimental en TS pero soportada en Chrome/Android
            const detector = new window.BarcodeDetector({ formats });
            setEngineType('native');

            const detectLoop = async () => {
                if (!videoRef.current || !isComponentMounted.current) return;

                try {
                    // Solo procesamos si el gatillo está activo (ahorro de batería masivo)
                    if (triggerRef.current && videoRef.current.readyState === 4) {
                        const barcodes = await detector.detect(videoRef.current);
                        
                        if (barcodes.length > 0) {
                            const rawValue = barcodes[0].rawValue;
                            handleSuccessfulScan(rawValue);
                        }
                    }
                } catch (e) {
                    // Errores silenciosos en el loop para no detener el video
                }
                
                requestRef.current = requestAnimationFrame(detectLoop);
            };

            detectLoop();

        } catch (err) {
            console.warn("Native Engine Failed, falling back...", err);
            startLegacyEngine();
        }
    };

    // --- MOTOR LEGACY (HTML5-QRCODE) ---
    const startLegacyEngine = async () => {
        try {
            const oldScanner = document.getElementById(SCANNER_DOM_ID);
            if (oldScanner) oldScanner.innerHTML = "";

            const scannerInstance = new Html5Qrcode(SCANNER_DOM_ID);
            scannerRef.current = scannerInstance;
            setEngineType('wasm');

            await scannerInstance.start(
                { facingMode: "environment" }, 
                { fps: 20, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (decodedText) => {
                    if (triggerRef.current) handleSuccessfulScan(decodedText);
                },
                () => {}
            );
        } catch (err: any) {
            if (isComponentMounted.current) setError("OPTICAL_ENGINE_FAILURE");
        }
    };

    // --- LÓGICA DE PROCESAMIENTO UNIFICADA ---
    const handleSuccessfulScan = (code: string) => {
        if (!isComponentMounted.current) return;
        
        const now = Date.now();
        if (now - lastScanTime.current < 1200) return; // Debounce global
        
        lastScanTime.current = now;
        setFeedbackStatus('success');
        
        if (navigator.vibrate) navigator.vibrate(40);
        onScan(code);
        
        setTimeout(() => {
            if (isComponentMounted.current) setFeedbackStatus(null);
        }, 350);
    };

    // --- INICIALIZACIÓN ---
    useEffect(() => {
        isComponentMounted.current = true;

        // Detección de Capacidades
        // @ts-ignore
        if ('BarcodeDetector' in window && typeof window.BarcodeDetector.detect === 'function') {
            startNativeEngine();
        } else {
            startLegacyEngine();
        }

        return () => {
            isComponentMounted.current = false;
            
            // Cleanup Nativo
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            // Cleanup Legacy
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => {}).finally(() => {
                    scannerRef.current = null;
                });
            }
        };
    }, []);

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

            {/* VELO DE BLOQUEO */}
            <div className={`absolute inset-0 z-40 transition-all duration-75 pointer-events-none flex flex-col items-center justify-center ${isTriggered ? 'bg-transparent opacity-0' : 'bg-black/80 backdrop-blur-sm'}`}>
                {!isTriggered && !error && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-slate-900 border-4 border-white/5 p-5 rounded-full text-blue-500 shadow-2xl">
                            <Lock className="w-10 h-10" />
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em]">LENS_LOCKED</span>
                    </div>
                )}
            </div>

            {/* INDICADOR DE MOTOR ACTIVO */}
            <div className="absolute top-4 right-4 z-50 pointer-events-none">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${engineType === 'native' ? 'bg-blue-900/40 border-blue-500/30 text-blue-400' : 'bg-orange-900/40 border-orange-500/30 text-orange-400'}`}>
                    {engineType === 'native' ? <Zap className="w-3 h-3 fill-current" /> : <Activity className="w-3 h-3" />}
                    <span className="text-[9px] font-black uppercase tracking-widest">{engineType === 'native' ? 'GPU_NATIVE' : 'CPU_LEGACY'}</span>
                </div>
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
                
                {/* ELEMENTO DE VIDEO NATIVO */}
                <video 
                    ref={videoRef} 
                    className={`w-full h-full object-cover transition-all duration-150 ${engineType === 'native' ? 'block' : 'hidden'} ${isTriggered ? 'opacity-100 scale-100' : 'opacity-10 scale-110 grayscale blur-sm'}`} 
                    playsInline 
                    muted
                />

                {/* ELEMENTO HTML5-QRCODE FALLBACK */}
                <div 
                    id={SCANNER_DOM_ID} 
                    className={`w-full h-full transition-all duration-150 ${engineType === 'wasm' ? 'block' : 'hidden'} ${isTriggered ? 'opacity-100 scale-100' : 'opacity-10 scale-110 grayscale blur-sm'}`}
                ></div>
            </div>
            
            <style>{`
                #${SCANNER_DOM_ID} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
            `}</style>
        </div>
    );
};