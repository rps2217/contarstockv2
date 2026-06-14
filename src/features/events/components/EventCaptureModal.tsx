import React, { useState, useEffect } from 'react';
import { 
  X, 
  Hash, 
  Truck, 
  Plus, 
  Minus, 
  RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SoundFX } from '../../../services/audio';
import { useToastStore } from '../../../store/useToastStore';
import { Product } from '../../../types';

interface EventCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedBarcode: string;
  product: Product | null | undefined;
  onAddItem: (data: {
    barcode: string;
    productName: string;
    providerName: string;
    event: string;
    quantity: number;
    frc: string;
    nguia: string;
    traspaso: string;
    destino: string;
    timestamp: string;
  }) => Promise<any>;
}

const EVENT_TYPES = [
  'DIF. PED.',
  'DET. PED.',
  'VENCE CERC.',
  'DET. CALIDAD INT.',
  'DET. CALIDAD EXT.',
  'CANJES',
  'MERMAS'
];

export const EventCaptureModal: React.FC<EventCaptureModalProps> = React.memo(({
  isOpen,
  onClose,
  scannedBarcode,
  product,
  onAddItem
}) => {
  const { addToast } = useToastStore.getState();

  // Form State
  const [selectedEvent, setSelectedEvent] = useState('DIF. PED.');
  const [quantity, setQuantity] = useState(1);
  const [frc, setFrc] = useState(() => localStorage.getItem('last_frc') || '');
  const [nguia, setNguia] = useState(() => localStorage.getItem('last_nguia') || '');
  const [traspaso, setTraspaso] = useState('');
  const [destino, setDestino] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDestinoRequiredButMissing = !!(traspaso.trim() && !destino.trim());

  // Sync initial fields if barcode changes
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setTraspaso('');
      setDestino('');
    }
  }, [scannedBarcode, isOpen]);

  const handleSubmit = async () => {
    if (!scannedBarcode || !selectedEvent || !quantity || !frc || !nguia || isSubmitting) {
      addToast('Completa todos los campos obligatorios', 'error');
      return;
    }

    if (traspaso.trim() && !destino.trim()) {
      addToast('El destino es obligatorio cuando hay un número de traspaso', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Save FRC and Guía for next time
      localStorage.setItem('last_frc', frc);
      localStorage.setItem('last_nguia', nguia);

      await onAddItem({
        barcode: scannedBarcode,
        productName: product?.name || 'Producto Desconocido',
        providerName: product?.supplier || 'N/A',
        event: selectedEvent,
        quantity,
        frc,
        nguia,
        traspaso,
        destino,
        timestamp: new Date().toISOString()
      });
      
      SoundFX.play('success');
      addToast('Evento registrado correctamente', 'success');
      onClose();
    } catch (error) {
      SoundFX.play('error');
      addToast('Error al guardar el evento', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl bg-slate-950 border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <div className="flex-1 min-w-0 pr-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Evento</span>
                <p className="text-base font-black text-white truncate leading-tight mt-1 uppercase italic tracking-tighter tabular-nums">
                  {scannedBarcode}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate uppercase font-bold">{product?.name}</p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 active:bg-white/10 active:scale-95 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar pb-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> FRC
                  </label>
                  <input
                    type="text"
                    value={frc}
                    onChange={(e) => setFrc(e.target.value.toUpperCase())}
                    className="w-full px-5 py-4 bg-white/5 border-2 border-white/5 rounded-2xl text-lg font-black text-white focus:border-blue-500 outline-none"
                    placeholder="Obligatorio"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Guía
                  </label>
                  <input
                    type="text"
                    value={nguia}
                    onChange={(e) => setNguia(e.target.value.toUpperCase())}
                    className="w-full px-5 py-4 bg-white/5 border-2 border-white/5 rounded-2xl text-lg font-black text-white focus:border-blue-500 outline-none"
                    placeholder="Obligatorio"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Traspaso
                  </label>
                  <input
                    type="text"
                    value={traspaso}
                    onChange={(e) => setTraspaso(e.target.value.toUpperCase())}
                    className={`w-full px-5 py-4 bg-white/5 border-2 rounded-2xl text-lg font-black text-white focus:border-blue-500 outline-none transition-all ${
                      traspaso.trim() ? 'border-indigo-500/30' : 'border-white/5'
                    }`}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Destino {traspaso.trim() && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className={`w-full px-5 py-4 bg-white/5 border-2 rounded-2xl text-lg font-black text-white focus:border-blue-500 outline-none appearance-none transition-all ${
                      isDestinoRequiredButMissing 
                        ? 'border-rose-500/50 bg-rose-950/10 text-rose-400' 
                        : 'border-white/5'
                    }`}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="BOD. 37">BOD. 37</option>
                    <option value="BOD. 80">BOD. 80</option>
                    <option value="BOD. 95">BOD. 95</option>
                    <option value="BOD. 98">BOD. 98</option>
                    <option value="BOD. 106">BOD. 106</option>
                    <option value="BOD. 121">BOD. 121</option>
                  </select>
                </div>
              </div>

              {/* REQUIRED_IF FEEDBACK (AppSheet Rule) */}
              <AnimatePresence>
                {isDestinoRequiredButMissing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>Regla Req_If: Se requiere un Destino válido para justificar el número de traspaso.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Tipo de Evento</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedEvent(type);
                        SoundFX.play('increment');
                      }}
                      type="button"
                      className={`py-3 px-3 rounded-xl text-[10px] font-black transition-all border-2 ${
                        selectedEvent === type 
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
                          : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Cantidad</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    type="button"
                    className="w-16 h-16 rounded-2xl bg-white/5 border-2 border-white/5 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Minus className="w-8 h-8 text-white" />
                  </button>
                  <div className="flex-1 h-16 bg-white/5 border-2 border-white/5 rounded-2xl flex items-center justify-center">
                    <span className="text-3xl font-black text-white">{quantity}</span>
                  </div>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    type="button"
                    className="w-16 h-16 rounded-2xl bg-white/5 border-2 border-white/5 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Plus className="w-8 h-8 text-white" />
                  </button>
                </div>
              </div>

              <button
                disabled={isSubmitting || !frc || !nguia}
                onClick={handleSubmit}
                type="button"
                className={`w-full py-6 rounded-[1.5rem] font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
                  isSubmitting || !frc || !nguia
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-blue-50'
                }`}
              >
                {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'REGISTRAR EVENTO'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

EventCaptureModal.displayName = 'EventCaptureModal';
