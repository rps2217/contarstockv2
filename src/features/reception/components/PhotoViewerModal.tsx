import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Disc, Tag, Box, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  item: any | null;
  onClose: () => void;
  theme: 'dark' | 'light' | 'high-contrast';
}

export const PhotoViewerModal: React.FC<Props> = ({ item, onClose, theme }) => {
  if (!item) return null;
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';
  const isSynced = !!item.lastSyncTimestamp;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
        
        {/* Absolute exit button */}
        <div className="absolute top-6 right-6">
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 transition-all rounded-full flex items-center justify-center text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-surface border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Top Panel Detail */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Box className="w-3.5 h-3.5" /> Etiqueta Logística Registrada
              </span>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">{item.logisticsLabel}</h3>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-bold text-muted uppercase block">
                {format(item.createdAt, 'dd/MM/yyyy')}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mt-1">
                {format(item.createdAt, 'HH:mm:ss')}
              </span>
            </div>
          </div>

          {/* Photo Display Frame */}
          <div className="aspect-square w-full bg-base flex items-center justify-center relative overflow-hidden">
            <img 
              src={item.photoUrl || item.labelPhoto} 
              alt="Etiqueta Logística" 
              className="max-w-full max-h-full object-contain relative z-10 p-2"
              referrerPolicy="no-referrer"
            />
            {/* Ambient subtle glow background */}
            <div className="absolute inset-0 bg-blue-500/5 blur-[100px] pointer-events-none" />
          </div>

          {/* Metadata information block */}
          <div className="p-6 bg-base/80 border-t border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Orden Vinculada: </span>
              <div className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-black text-secondary uppercase">
                  {item.erpOrder && item.erpOrder !== 'RECEPCION_BORRADOR' ? item.erpOrder : 'SIN ERP (BORRADOR}'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isSynced ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" /> Resguardado en Nube
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-[10px] font-black text-blue-400 uppercase tracking-wider">
                  <Disc className="w-4 h-4 animate-pulse" /> Cola de Subida Local
                </div>
              )}

              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-white text-black hover:bg-slate-200 rounded-xl font-extrabold uppercase text-[10px] tracking-wider transition-all active:scale-95 shadow-md"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
