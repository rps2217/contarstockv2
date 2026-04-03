import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ScanLine, 
  Trash2, 
  X, 
  CornerDownLeft, 
  Package, 
  Hash, 
  Truck,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from '../../store/useToastStore';
import { db } from '../../db';
import { normalizeSku } from '../../services/utils';
import { useEventDatabase } from './hooks/useEventDatabase';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { SoundFX } from '../../services/audio';
import { useFeedbackSystem } from '../../hooks/useFeedbackSystem';
import { CameraScanner } from '../../components/CameraScanner';
import { ScannerTargetOverlay } from '../../shared/components/scanner/ScannerTargetOverlay';

const EVENT_TYPES = [
  'DIF. PED.',
  'DET. PED.',
  'VENCE CERC.',
  'DET. CALIDAD INT.',
  'DET. CALIDAD EXT.'
];

// Memoized Item Component
const EventItemRow = React.memo(({ 
  item, 
  onDelete 
}: { 
  item: any; 
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0a0a0a] border border-white/5">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
          <Package className="w-6 h-6 text-blue-500" />
        </div>
        <div className={`mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
          item.isAdjusted ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        }`}>
          {item.isAdjusted ? 'AJUSTADO' : 'PENDIENTE'}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-white uppercase truncate">
          {item.productName}
        </h3>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
            {item.barcode}
          </span>
          <span className="text-blue-400 text-[10px] font-black uppercase">
            {item.event}
          </span>
          <span className="text-slate-500 text-[10px] font-bold uppercase truncate">
            {item.quantity} UNID
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <button
          onClick={() => onDelete(item.id)}
          className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 active:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

const ScannerInput = React.memo(({ 
  onScan, 
  isModalOpen,
  onOpenScanner
}: { 
  onScan: (code: string) => void;
  isModalOpen: boolean;
  onOpenScanner: () => void;
}) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusInput = () => {
      if (!isModalOpen && inputRef.current) {
        inputRef.current.focus();
      }
    };
    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, [isModalOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        onScan(value.trim());
        setValue('');
      }
    }
  };

  return (
    <div className="relative flex items-center">
      <button 
        onClick={onOpenScanner}
        className="absolute inset-y-0 left-0 pl-4 flex items-center z-10 active:scale-90 transition-transform"
      >
        <ScanLine className="w-6 h-6 text-blue-500" />
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escanear o digitar..."
        className="w-full pl-12 pr-14 py-4 bg-[#0a0a0a] border border-blue-900/30 rounded-2xl text-xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
        autoFocus
      />
      {value.length > 0 && (
        <button
          onClick={() => {
            onScan(value.trim());
            setValue('');
          }}
          className="absolute right-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center active:bg-blue-700 transition-colors"
        >
          <CornerDownLeft className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});

export const EventCapturePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToastStore.getState();
  const { state, actions } = useEventDatabase();
  const { feedback, trigger } = useFeedbackSystem(400);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [providerName, setProviderName] = useState('');
  
  // Form State
  const [selectedEvent, setSelectedEvent] = useState('DIF. PED.');
  const [quantity, setQuantity] = useState(1);
  const [frc, setFrc] = useState(() => localStorage.getItem('last_frc') || '');
  const [nguia, setNguia] = useState(() => localStorage.getItem('last_nguia') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScan = useCallback(async (code: string) => {
    if (!code || isModalOpen) return;

    trigger('success');
    const normalizedCode = normalizeSku(code);
    setScannedBarcode(normalizedCode);
    
    const product = await db.products.get(normalizedCode);
    setProductName(product?.name || 'Producto Desconocido');
    setProviderName(product?.supplier || 'N/A');
    
    setIsModalOpen(true);
  }, [isModalOpen, trigger]);

  useHIDScanner({
    onScan: handleScan,
    isEnabled: !isModalOpen,
    maxLatency: 50
  });

  const handleSubmit = async () => {
    if (!scannedBarcode || !selectedEvent || !quantity || !frc || !nguia || isSubmitting) {
      addToast('Completa todos los campos obligatorios', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Save FRC and Guía for next time
      localStorage.setItem('last_frc', frc);
      localStorage.setItem('last_nguia', nguia);

      await actions.handleAddItem({
        barcode: scannedBarcode,
        productName,
        providerName,
        event: selectedEvent,
        quantity,
        frc,
        nguia,
        timestamp: new Date().toISOString()
      });
      
      SoundFX.play('success');
      addToast('Evento registrado correctamente', 'success');
      setIsModalOpen(false);
      // Reset some fields but keep FRC/Guía
      setQuantity(1);
    } catch (error) {
      SoundFX.play('error');
      addToast('Error al guardar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Eliminar este registro?')) {
      const itemToDelete = state.allItems.find(i => i.id === id);
      if (itemToDelete) {
        await actions.handleRemoveItem(itemToDelete);
        SoundFX.play('delete');
      }
    }
  }, [state.allItems, actions]);

  const sortedItems = useMemo(() => {
    return [...state.allItems]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 50);
  }, [state.allItems]);

  return (
    <div className="h-screen w-full flex flex-col bg-[#050505] overflow-hidden font-mono text-white">
      {/* HEADER */}
      <div className="shrink-0 p-4 bg-[#050505] z-10 border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate('/')} 
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest text-slate-400">Captura de Eventos</h1>
        </div>

        <ScannerInput 
          onScan={handleScan} 
          isModalOpen={isModalOpen || isCameraActive} 
          onOpenScanner={() => setIsCameraActive(!isCameraActive)}
        />
      </div>

      {/* CAMERA SCANNER */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 200, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative bg-black shrink-0 overflow-hidden border-b border-blue-500/30"
          >
            <CameraScanner 
              onScan={handleScan} 
              onClose={() => setIsCameraActive(false)} 
              inline={true}
              isTriggered={true}
            />
            <ScannerTargetOverlay feedback={feedback} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        {sortedItems.map((item) => (
          <EventItemRow 
            key={item.id} 
            item={item} 
            onDelete={handleDelete} 
          />
        ))}
        
        {sortedItems.length === 0 && (
          <div className="text-center py-12 text-slate-500 font-bold text-sm uppercase tracking-widest">
            No hay eventos recientes
          </div>
        )}
      </div>

      {/* SIMPLE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Registrar Evento</h2>
                  <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[250px]">{productName}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto no-scrollbar space-y-6">
                {/* FRC & GUIA (Persistent-ish) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> FRC
                    </label>
                    <input
                      type="text"
                      value={frc}
                      onChange={(e) => setFrc(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white focus:border-blue-500 outline-none"
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
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white focus:border-blue-500 outline-none"
                      placeholder="Obligatorio"
                    />
                  </div>
                </div>

                {/* EVENT TYPE SELECTOR */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Tipo de Evento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedEvent(type);
                          SoundFX.play('increment');
                        }}
                        className={`py-3 px-2 rounded-xl text-[10px] font-black transition-all border-2 ${
                          selectedEvent === type 
                            ? 'bg-blue-600 border-blue-400 text-white' 
                            : 'bg-white/5 border-white/5 text-slate-500'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QUANTITY SELECTOR */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Cantidad</label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Minus className="w-6 h-6 text-white" />
                    </button>
                    <div className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl font-black text-white">{quantity}</span>
                    </div>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Plus className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 20].map(val => (
                      <button
                        key={val}
                        onClick={() => setQuantity(val)}
                        className="py-2 rounded-lg bg-white/5 text-[10px] font-bold text-slate-400 active:bg-white/10"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SUBMIT */}
                <div className="pt-2">
                  <button
                    disabled={isSubmitting || !frc || !nguia}
                    onClick={handleSubmit}
                    className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                      isSubmitting || !frc || !nguia
                        ? 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-blue-50 shadow-lg'
                    }`}
                  >
                    {isSubmitting ? 'Registrando...' : 'Registrar Evento'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventCapturePage;
