import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReceptionPhotoModalProps {
  selectedPhotoItem: any;
  onClose: () => void;
}

export const ReceptionPhotoModal: React.FC<ReceptionPhotoModalProps> = ({
  selectedPhotoItem,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {selectedPhotoItem && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
        >
          <div className="absolute top-6 right-6">
            <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Etiqueta Logística</span>
                <h3 className="text-lg font-black text-white uppercase">{selectedPhotoItem.logisticsLabel}</h3>
              </div>
            </div>
            
            <div className="aspect-square w-full bg-black flex items-center justify-center">
              <img 
                src={selectedPhotoItem.photoUrl || selectedPhotoItem.labelPhoto} 
                alt="Etiqueta" 
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="p-6 flex justify-center">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
