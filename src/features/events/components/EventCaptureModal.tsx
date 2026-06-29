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
import { useToastStore } from '@/stores';
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
  theme?: 'dark' | 'light' | 'high-contrast';
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
  onAddItem,
  theme = 'dark'
}) => {
  const { addToast } = useToastStore.getState();

  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';

  // Clases según tema
  const modalBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-slate-200' : 'bg-base border-white/10';
  const overlayBg = isHighContrast ? 'bg-yellow-950/60' : 'bg-black/60';
  const headerBg = isHighContrast ? 'bg-yellow-950/30' : isLight ? 'bg-slate-50' : 'bg-surface/50';
  const headerBorder = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-200' : 'border-white/5';
  const handleBg = isHighContrast ? 'bg-yellow-400' : isLight ? 'bg-slate-300' : 'bg-white/10';
  const accentText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-blue-600' : 'text-blue-500';
  const titleText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const subtitleText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500';
  const labelText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500';
  const inputBg = isHighContrast ? 'bg-yellow-950 border-yellow-400/30 text-yellow-400' : isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/5 text-white';
  const inputFocus = isHighContrast ? 'focus:border-yellow-400' : 'focus:border-blue-500';
  const selectBg = isHighContrast ? 'bg-yellow-950 border-yellow-400/30 text-yellow-400' : isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/5 text-white';
  const errorBg = isHighContrast ? 'bg-red-500/10 border-red-500/25 text-red-400' : isLight ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-500/10 border-rose-500/25 text-rose-400';
  const btnActive = isHighContrast ? 'bg-yellow-400 border-yellow-300 text-black shadow-lg' : isLight ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-blue-600 border-blue-400 text-white shadow-lg';
  const btnInactive = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30 text-yellow-500 hover:bg-yellow-900/30' : isLight ? 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10';
  const qtyBtn = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30 text-yellow-400' : isLight ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white/5 border-white/5 text-white';
  const qtyDisplay = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30 text-yellow-400' : isLight ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white/5 border-white/5 text-white';
  const submitEnabled = isHighContrast ? 'bg-yellow-400 text-black hover:bg-yellow-300' : isLight ? 'bg-surface text-white hover:bg-elevated' : 'bg-white text-black hover:bg-blue-50';
  const submitDisabled = isHighContrast ? 'bg-yellow-900/20 text-yellow-600 cursor-not-allowed' : isLight ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-elevated text-slate-600 cursor-not-allowed';
  const destRequired = isHighContrast ? 'border-red-500/30 bg-red-500/10 text-red-400' : isLight ? 'border-rose-500/30 bg-rose-50 text-rose-600' : 'border-rose-500/50 bg-rose-950/10 text-rose-400';
  const traspasoActive = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-indigo-500/30' : 'border-indigo-500/30';

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
      
      
      addToast('Evento registrado correctamente', 'success');
      onClose();
    } catch (error) {
      
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
            className={`absolute inset-0 backdrop-blur-sm pointer-events-auto ${overlayBg}`}
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`w-full max-w-2xl rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto ${modalBg}`}
          >
            <div className={`w-12 h-1.5 rounded-full mx-auto mt-3 mb-1 shrink-0 ${handleBg}`} />

            <div className={`p-4 border-b flex items-center justify-between ${headerBg} ${headerBorder}`}>
              <div className="flex-1 min-w-0 pr-4">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${accentText}`}>Evento</span>
                <p className={`text-base font-black truncate leading-tight mt-1 uppercase italic tracking-tighter tabular-nums ${titleText}`}>
                  {scannedBarcode}
                </p>
                <p className={`text-[11px] mt-0.5 truncate uppercase font-bold ${subtitleText}`}>{product?.name}</p>
              </div>
              <button 
                onClick={onClose}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${isHighContrast ? 'bg-yellow-900/20 text-yellow-400' : isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-muted'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar pb-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`text-[9px] font-black uppercase tracking-widest px-1 flex items-center gap-1 ${labelText}`}>
                    <Hash className="w-3 h-3" /> FRC
                  </label>
                  <input
                    type="text"
                    value={frc}
                    onChange={(e) => setFrc(e.target.value.toUpperCase())}
                    className={`w-full px-5 py-4 border-2 rounded-2xl text-lg font-black focus:outline-none ${inputBg} ${inputFocus}`}
                    placeholder="Obligatorio"
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[9px] font-black uppercase tracking-widest px-1 flex items-center gap-1 ${labelText}`}>
                    <Truck className="w-3 h-3" /> Guía
                  </label>
                  <input
                    type="text"
                    value={nguia}
                    onChange={(e) => setNguia(e.target.value.toUpperCase())}
                    className={`w-full px-5 py-4 border-2 rounded-2xl text-lg font-black focus:outline-none ${inputBg} ${inputFocus}`}
                    placeholder="Obligatorio"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`text-[9px] font-black uppercase tracking-widest px-1 flex items-center gap-1 ${labelText}`}>
                    <Hash className="w-3 h-3" /> Traspaso
                  </label>
                  <input
                    type="text"
                    value={traspaso}
                    onChange={(e) => setTraspaso(e.target.value.toUpperCase())}
                    className={`w-full px-5 py-4 border-2 rounded-2xl text-lg font-black focus:outline-none transition-all ${inputBg} ${
                      traspaso.trim() ? traspasoActive : 'border-transparent'
                    }`}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[9px] font-black uppercase tracking-widest px-1 flex items-center gap-1 ${labelText}`}>
                    <Truck className="w-3 h-3" /> Destino {traspaso.trim() && <span className="text-rose-500">*</span>}
                  </label>
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    className={`w-full px-5 py-4 border-2 rounded-2xl text-lg font-black focus:outline-none appearance-none transition-all ${selectBg} ${
                      isDestinoRequiredButMissing 
                        ? destRequired
                        : 'border-transparent'
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
                    className={`p-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border ${errorBg}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span>Regla Req_If: Se requiere un Destino válido para justificar el número de traspaso.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${labelText}`}>Tipo de Evento</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedEvent(type);
                      }}
                      type="button"
                      className={`py-3 px-3 rounded-xl text-[10px] font-black transition-all border-2 ${
                        selectedEvent === type 
                          ? btnActive
                          : btnInactive
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${labelText}`}>Cantidad</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    type="button"
                    className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center active:scale-90 transition-transform ${qtyBtn}`}
                  >
                    <Minus className="w-8 h-8" />
                  </button>
                  <div className={`flex-1 h-16 border-2 rounded-2xl flex items-center justify-center ${qtyDisplay}`}>
                    <span className="text-3xl font-black">{quantity}</span>
                  </div>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    type="button"
                    className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center active:scale-90 transition-transform ${qtyBtn}`}
                  >
                    <Plus className="w-8 h-8" />
                  </button>
                </div>
              </div>

              <button
                disabled={isSubmitting || !frc || !nguia}
                onClick={handleSubmit}
                type="button"
                className={`w-full py-6 rounded-[1.5rem] font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
                  isSubmitting || !frc || !nguia
                    ? submitDisabled
                    : submitEnabled
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
