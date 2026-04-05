import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  theme?: 'dark' | 'light';
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  theme = 'dark'
}) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (isOpen) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              // Success
              html5QrCode.stop().then(() => {
                onScan(decodedText);
                onClose();
              }).catch(err => {
                console.error("Failed to stop scanner", err);
              });
            },
            (errorMessage) => {
              // Ignore continuous scanning errors
            }
          );
        } catch (err) {
          console.error("Error starting scanner", err);
          setError("No se pudo acceder a la cámara. Verifique los permisos.");
        }
      };

      startScanner();
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border ${
            theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className={`p-4 border-b flex items-center justify-between ${
            theme === 'dark' ? 'border-white/5' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Camera className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className={`font-black uppercase tracking-tighter italic leading-none ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Escáner</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Busca un producto</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{error}</p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <div id="reader" className="w-full h-full"></div>
                <div className="absolute inset-0 border-4 border-amber-500/50 rounded-2xl pointer-events-none"></div>
              </div>
            )}
            
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-6">
              Apunta la cámara al código de barras del producto
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Forced GitHub sync
