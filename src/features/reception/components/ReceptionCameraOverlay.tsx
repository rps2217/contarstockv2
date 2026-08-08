import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CameraScanner } from '../../../components/CameraScanner';

interface ReceptionCameraOverlayProps {
  pendingPhotoCode: string | null;
  onClose: () => void;
  onCapture: (photo: string) => void;
}

export const ReceptionCameraOverlay: React.FC<ReceptionCameraOverlayProps> = ({
  pendingPhotoCode,
  onClose,
  onCapture,
}) => {
  return (
    <AnimatePresence>
      {pendingPhotoCode && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-black flex flex-col"
        >
          <div className="absolute top-0 left-0 right-0 p-6 z-[2110] flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Capturar Etiqueta</span>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">{pendingPhotoCode}</h2>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white active:bg-white/20 transition-colors"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 relative">
            <CameraScanner 
              onScan={() => {}} 
              onClose={onClose} 
              inline={false}
              mode="photo"
              onCapture={onCapture}
            />
          </div>

          <div className="p-8 bg-black flex flex-col items-center gap-4">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center">
              Encuadre la etiqueta y capture la imagen para finalizar el registro
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
