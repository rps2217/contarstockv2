
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(base64);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          onLoadedMetadata={() => setIsReady(true)}
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
          <button 
            onClick={onClose}
            className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white border border-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="px-4 py-2 bg-blue-600/80 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-blue-400/30">
            Modo_Captura_Guía
          </div>
        </div>

        <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8 z-10">
          <button 
            onClick={handleCapture}
            disabled={!isReady}
            className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
          >
            <div className="w-14 h-14 bg-white rounded-full border-2 border-slate-900" />
          </button>
        </div>

        <div className="absolute inset-10 border-2 border-dashed border-white/30 rounded-lg pointer-events-none flex items-center justify-center">
          <div className="text-white/30 text-[10px] uppercase font-black tracking-[0.2em]">
            Encuadre la guía física aquí
          </div>
        </div>
      </div>
    </motion.div>
  );
};
