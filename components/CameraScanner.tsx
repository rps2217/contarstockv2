
import React, { useEffect, useRef, useState } from 'react';
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
    
    // Stable ID for the scanner container
    const uniqueId = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`).current;
    
    // Use a ref for onScan to avoid re-triggering the effect when it changes
    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;

    // Use a ref to track the last scanned code to prevent rapid duplicates locally
    const lastScannedCode = useRef<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const startScanner = async () => {
            // Wait for next tick to ensure DOM is fully ready
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (!isMounted) return;

            const element = document.getElementById(uniqueId);
            if (!element) {
                console.error("Scanner element not found in DOM");
                setError("Error de inicialización: Elemento de cámara no encontrado.");
                return;
            }

            try {
                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode(uniqueId);
                }

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                };

                await scannerRef.current.start(
                    { facingMode: "environment" }, 
                    config,
                    (decodedText) => {
                        if (!isMounted) return;
                        // Local debounce to prevent multiple triggers for the same code in a short burst
                        if (decodedText !== lastScannedCode.current) {
                            lastScannedCode.current = decodedText;
                            if (navigator.vibrate) navigator.vibrate(50);
                            
                            // Execute the callback via ref
                            onScanRef.current(decodedText);
                            
                            // Reset local debounce after 2 seconds
                            setTimeout(() => {
                                lastScannedCode.current = null;
                            }, 2000);
                        }
                    },
                    () => {
                        // Ignore frame parse errors (normal behavior)
                    }
                );
            } catch (err: any) {
                console.error("Error starting camera:", err);
                if (isMounted) {
                    setError("No se pudo acceder a la cámara. Verifique permisos o use HTTPS.");
                }
            }
        };

        startScanner();

        return () => {
            isMounted = false;
            if (scannerRef.current) {
                const stopAndClear = async () => {
                    try {
                        if (scannerRef.current?.isScanning) {
                            await scannerRef.current.stop();
                        }
                        await scannerRef.current?.clear();
                    } catch (e) {
                        console.warn("Cleanup warning:", e);
                    } finally {
                        scannerRef.current = null;
                    }
                };
                stopAndClear();
            }
        };
    }, [uniqueId]); // Only depend on the ID which is stable

    return (
        <div className="fixed inset-0 z-[80] bg-black flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 w-full z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white">
                    <Camera className="w-5 h-5 text-blue-400" />
                    <span className="font-bold text-sm">Escáner de Cámara</span>
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
                        <div id={uniqueId} className="w-full h-full"></div>
                        
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
