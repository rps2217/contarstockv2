
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
    const requestRef = useRef<number | undefined>(undefined);
    
    const lastScanTime = useRef(0);
    // Si no es inline (ej: modal QR), forzamos trigger true para que se vea la cámara
    const effectiveTrigger = inline ? isTriggered : true;
    const triggerRef = useRef(effectiveTrigger);
    const isComponentMounted = useRef(true);

    const SCANNER_DOM_ID = "v8-core-optical-engine";

    useEffect(() => { triggerRef.current = effectiveTrigger; }, [effectiveTrigger]);

    const startNativeEngine = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
            });
            streamRef.current = stream;
            if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }

            const formats = ['qr_code', 'ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'itf'];
            let detector: any;
            try {
                // @ts-ignore
                detector = new window.BarcodeDetector({ formats });
                setEngineType('native');
            } catch (e) {
                startLegacyEngine();
                return;
            }

            const detectLoop = async () => {
                if (!videoRef.current || !isComponentMounted.current) return;
                try {
                    if (triggerRef.current && videoRef.current.readyState === 4) {
                        const barcodes = await detector.detect(videoRef.current);
                        if (barcodes.length > 0) handleSuccessfulScan(barcodes[0].rawValue);
                    }
                } catch (e) {}
                requestRef.current = requestAnimationFrame(detectLoop);
            };
            detectLoop();
        } catch (err) {
            startLegacyEngine();
        }
    };

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
                (decodedText) => { if (triggerRef.current) handleSuccessfulScan(decodedText); },
                () => {}
            );
        } catch (err: any) {
            if (isComponentMounted.current) setError("OPTICAL_ENGINE_FAILURE");
        }
    };

    const handleSuccessfulScan = (code: string) => {
        if (!isComponentMounted.current) return;
        const now = Date.now();
        if (now - lastScanTime.current < 1000) return;
        lastScanTime.current = now;
        
        setFeedbackStatus('success');
        if (navigator.vibrate) navigator.vibrate(40);
        onScan(code);
        setTimeout(() => { if (isComponentMounted.current) setFeedbackStatus(null); }, 250);
    };

    useEffect(() => {
        isComponentMounted.current = true;
        // @ts-ignore
        if ('BarcodeDetector' in window && typeof window.BarcodeDetector === 'function') {
            startNativeEngine();
        } else {
            startLegacyEngine();
        }
        return () => {
            isComponentMounted.current = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(() => {}).finally(() => { scannerRef.current = null; });
            }
        };
    }, []);

    return (
        <div className={`${inline ? 'w-full h-full relative' : 'fixed inset-0 z-[100]'} bg-black overflow-hidden`}>
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                <div className={`w-64 h-64 border-2 transition-all duration-150 rounded-3xl flex items-center justify-center ${effectiveTrigger ? 'border-blue-500/40 scale-100' : 'border-white/10 scale-90 opacity-20'}`}>
                    <Target className={`w-12 h-12 transition-all duration-300 ${effectiveTrigger ? 'text-blue-500 opacity-30 animate-pulse' : 'text-white'}`} />
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                </div>
                {effectiveTrigger && !feedbackStatus && <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-red-500 shadow-[0_0_10px_red] animate-[radar-pulse_1s_infinite] opacity-50"></div>}
            </div>
            
            <div className="absolute top-4 left-4 z-50 pointer-events-auto">
                <button onClick={onClose} className="bg-black/60 backdrop-blur-md text-white/60 p-3 rounded-2xl active:bg-white active:text-black transition-colors">
                    <Activity className="w-5 h-5" />
                </button>
            </div>

            <div className="absolute top-4 right-4 z-50 pointer-events-none">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${engineType === 'native' ? 'bg-blue-900/40 border-blue-500/30 text-blue-400' : 'bg-orange-900/40 border-orange-500/30 text-orange-400'}`}>
                    {engineType === 'native' ? <Zap className="w-3 h-3 fill-current" /> : <Activity className="w-3 h-3" />}
                    <span className="text-[9px] font-black uppercase tracking-widest">{engineType === 'native' ? 'GPU_NATIVE' : 'CPU_LEGACY'}</span>
                </div>
            </div>

            <div className="flex-1 relative bg-black flex flex-col justify-center h-full">
                {feedbackStatus === 'success' && <div className="absolute inset-0 z-[60] bg-emerald-600/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-75"><CheckCircle2 className="w-20 h-20 text-white" /></div>}
                {error && <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center"><AlertTriangle className="w-12 h-12 text-rose-500 mb-4" /><h3 className="text-white font-black uppercase text-[10px] tracking-widest">{error}</h3><button onClick={onClose} className="mt-8 bg-white text-black px-10 py-4 font-black uppercase text-[10px] border-b-8 border-slate-300">Volver</button></div>}
                <video ref={videoRef} className={`w-full h-full object-cover transition-all duration-150 ${engineType === 'native' ? 'block' : 'hidden'} ${effectiveTrigger ? 'opacity-100 scale-100' : 'opacity-10 scale-110 grayscale blur-sm'}`} playsInline muted />
                <div id={SCANNER_DOM_ID} className={`w-full h-full transition-all duration-150 ${engineType === 'wasm' ? 'block' : 'hidden'} ${effectiveTrigger ? 'opacity-100 scale-100' : 'opacity-10 scale-110 grayscale blur-sm'}`}></div>
            </div>
            <style>{`
                #${SCANNER_DOM_ID} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
                @keyframes radar-pulse { 0% { transform: translateY(-30px); opacity: 0; } 50% { opacity: 0.8; } 100% { transform: translateY(30px); opacity: 0; } }
            `}</style>
        </div>
    );
};
