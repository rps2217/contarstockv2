import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SoundFX } from '../../services/audio';

interface CameraScannerProps {
 onScan: (code: string) => void;
 onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, onClose }) => {
 const [error, setError] = useState<string | null>(null);
 const [feedbackStatus, setFeedbackStatus] = useState<'success' | null>(null);
 const [isNative, setIsNative] = useState(false);

 const videoRef = useRef<HTMLVideoElement>(null);
 const scannerRef = useRef<Html5Qrcode | null>(null);
 // Fix: Added undefined as initial value to requestRef to avoid "Expected 1 arguments, but got 0" error.
 const requestRef = useRef<number | undefined>(undefined);
 const lastScanTime = useRef(0);
 const isMounted = useRef(true);

 const uniqueId = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`).current;

 const handleScanSuccess = (code: string) => {
 if (!isMounted.current) return;
 const now = Date.now();
 if (now - lastScanTime.current < 1000) return;
 lastScanTime.current = now;

 setFeedbackStatus('success');
 SoundFX.play('success');
 if (navigator.vibrate) navigator.vibrate(60);

 setTimeout(() => {
 if (isMounted.current) onScan(code);
 }, 450);
 };

 useEffect(() => {
 isMounted.current = true;

 const startScanning = async () => {
 // @ts-ignore
 if ('BarcodeDetector' in window && typeof window.BarcodeDetector.detect === 'function') {
 try {
 setIsNative(true);
 const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
 await videoRef.current.play();
 }
 
 // @ts-ignore
 const detector = new window.BarcodeDetector({ formats: ['qr_code', 'ean_13', 'code_128', 'code_39'] });
 
 const loop = async () => {
 if (!videoRef.current || !isMounted.current) return;
 try {
 const barcodes = await detector.detect(videoRef.current);
 if (barcodes.length > 0) handleScanSuccess(barcodes[0].rawValue);
 } catch (e) {}
 requestRef.current = requestAnimationFrame(loop);
 };
 loop();
 } catch (e) {
 setIsNative(false);
 startLegacy();
 }
 } else {
 startLegacy();
 }
 };

 const startLegacy = async () => {
 try {
 if (!scannerRef.current) scannerRef.current = new Html5Qrcode(uniqueId);
 await scannerRef.current.start(
 { facingMode: "environment" },
 { fps: 15, qrbox: { width: 260, height: 260 } },
 (decodedText) => handleScanSuccess(decodedText),
 () => {}
 );
 } catch (err) {
 if (isMounted.current) setError("No se pudo iniciar la cámara.");
 }
 };

 startScanning();

 return () => {
 isMounted.current = false;
 if (requestRef.current) cancelAnimationFrame(requestRef.current);
 if (videoRef.current && videoRef.current.srcObject) {
 (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
 }
 if (scannerRef.current && scannerRef.current.isScanning) {
 scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
 }
 };
 }, []);

 return (
 <div className="fixed inset-0 z-[80] bg-black flex flex-col animate-in fade-in duration-300">
 <div className="flex justify-between items-center p-4 bg-black/60 absolute top-0 w-full z-50 ">
 <div className="flex items-center gap-2 text-white">
 <div className="bg-blue-500 p-1.5 rounded-lg">
 <Camera className="w-5 h-5 text-white" />
 </div>
 <span className="font-bold text-sm tracking-tight">Escáner {isNative ? 'Nativo' : 'Web'}</span>
 </div>
 <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="flex-1 relative bg-black flex flex-col justify-center overflow-hidden">
 {feedbackStatus === 'success' && (
 <div className="absolute inset-0 z-[60] bg-emerald-600 animate-in fade-in zoom-in duration-150 flex flex-col items-center justify-center">
 <div className="bg-white rounded-full p-6 shadow-2xl animate-bounce">
 <CheckCircle2 className="w-20 h-20 text-emerald-600" />
 </div>
 <p className="text-white/80 mt-4 font-bold uppercase tracking-widest text-xs">Captura Exitosa</p>
 </div>
 )}

 {error ? (
 <div className="text-center p-8 z-50 animate-in slide-in-from-bottom-4">
 <div className="bg-red-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
 <AlertTriangle className="w-12 h-12 text-red-500" />
 </div>
 <h3 className="text-white font-bold text-2xl mb-2">Error de Cámara</h3>
 <button onClick={onClose} className="bg-white text-black px-8 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">
 Cerrar y Volver
 </button>
 </div>
 ) : (
 <>
 <video ref={videoRef} className={`w-full h-full object-cover ${isNative ? 'block' : 'hidden'}`} playsInline muted />
 <div id={uniqueId} className={`w-full h-full ${isNative ? 'hidden' : 'block'}`}></div>
 
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
 <div className="bg-black/60 rounded-full px-6 py-3 inline-flex items-center gap-3 border border-white/10 shadow-2xl">
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
 #${uniqueId} video {
 width: 100% !important;
 height: 100% !important;
 object-fit: cover !important;
 }
 `}</style>
 </div>
 );
};