
import React, { useEffect, useRef, useState, useId } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertTriangle } from 'lucide-react';

interface CameraScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    
    // QA FIX: Use a stable ID component-scoped to prevent collisions if multiple instances existed
    const uniqueId = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`).current;

    useEffect(() => {
        // Ensure we don't create multiple instances if re-renders happen quickly
        if (!scannerRef.current) {
             scannerRef.current = new Html5Qrcode(uniqueId);
        }
        
        const startScanner = async () => {
            if (!scannerRef.current) return;

            try {
                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                await scannerRef.current.start(
                    { facingMode: "environment" }, 
                    config,
                    (decodedText) => {
                        if (decodedText !== lastScanned) {
                            setLastScanned(decodedText);
                            if (navigator.vibrate) navigator.vibrate(50);
                            onScan(decodedText);
                            // Prevent rapid duplicates
                            setTimeout(() => setLastScanned(null), 2000);
                        }
                    },
                    (errorMessage) => {
                        // Ignore frame parse errors
                    }
                );
            } catch (err: any) {
                console.error("Error starting camera:", err);
                // Only set error if we are still mounted/scanning
                if (isScanning) {
                    setError("No se pudo acceder a la cámara. Verifique permisos o use HTTPS.");
                }
            }
        };

        if (isScanning) {
            startScanner();
        }

        return () => {
            // QA FIX: Robust async cleanup
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop()
                    .then(() => {
                        return scannerRef.current?.clear();
                    })
                    .catch((err) => {
                        console.warn("Scanner stop/clear warning:", err);
                    })
                    .finally(() => {
                        scannerRef.current = null;
                    });
            }
        };
    }, [isScanning, uniqueId]); 

    return (
        <div className="fixed inset-0 z-[80] bg-black flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 w-full z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white">
                    <Camera className="w-5 h-5 text-blue-400" />
                    <span className="font-bold text-sm">Escáner de Emergencia</span>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Viewport Area */}
            <div className="flex-1 relative bg-black flex flex-col justify-center overflow-hidden">
                {error ? (
                    <div className="text-center p-8">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-white font-bold text-xl mb-2">Error de Cámara</h3>
                        <p className="text-slate-400 text-sm mb-6">{error}</p>
                        <button onClick={onClose} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold">Cerrar</button>
                    </div>
                ) : (
                    <>
                        {/* The HTML element where scanner renders. Uses Unique ID. */}
                        <div id={uniqueId} className="w-full h-full object-cover"></div>
                        
                        {/* Overlay Guidelines */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-blue-500/50 rounded-3xl relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                                
                                {/* Scanning Laser Animation */}
                                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[scan_2s_infinite]"></div>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none px-6">
                            <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 inline-flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <span className="text-white text-xs font-bold">Apunte al código de barras</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100px); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(100px); opacity: 0; }
                }
                /* Hide HTML5-QRCode default elements we don't want */
                #reader__scan_region img { display: none; }
                #reader__dashboard_section_csr button { display: none; }
            `}</style>
        </div>
    );
};
