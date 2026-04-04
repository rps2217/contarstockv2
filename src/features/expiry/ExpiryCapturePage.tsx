import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ScanLine, ShieldAlert, Download, Trash2, X, Save, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from '../../store/useToastStore';
import { db } from '../../db';
import { normalizeSku } from '../../services/utils';
import { useExpiryDatabase, ExpiryItem } from './hooks/useExpiryDatabase';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { SoundFX } from '../../services/audio';
import { differenceInDays } from 'date-fns';
import { useFeedbackSystem } from '../../hooks/useFeedbackSystem';

import { useAppStore } from '@/store/mainAppStore';
import { DynamicForm } from '../../components/DynamicForm';
import { CameraScanner } from '../../components/CameraScanner';
import { ScannerTargetOverlay } from '../../shared/components/scanner/ScannerTargetOverlay';

// Components
import { BarcodeScannerModal } from './components/BarcodeScannerModal';

// Memoized Item Component for performance on low-end devices
const ExpiryItemRow = React.memo(({ 
  item, 
  onDelete 
}: { 
  item: ExpiryItem; 
  onDelete: (id: string) => void;
}) => {
  const getDaysUntilExpiry = (mm: number, yyyy: number) => {
    const expiryDate = new Date(yyyy, mm - 1, 1);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    expiryDate.setDate(0);
    return differenceInDays(expiryDate, new Date());
  };

  const days = getDaysUntilExpiry(Number(item.mm) || 0, Number(item.yyyy) || 0);
  const isWarning = days <= 90;
  const formattedDate = `31/${(item.mm || 0).toString().padStart(2, '0')}/${item.yyyy}`;

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl bg-[#0a0a0a] border ${
        isWarning ? 'border-amber-500/20' : 'border-indigo-500/20'
      }`}
    >
      {/* Left Icon */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative border ${
          isWarning ? 'bg-amber-500/5 border-amber-500/30' : 'bg-indigo-500/5 border-indigo-500/30'
        }`}>
          {isWarning ? (
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          ) : (
            <Download className="w-6 h-6 text-indigo-500" />
          )}
          <div className={`absolute -top-2 -right-2 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            isWarning ? 'bg-amber-500 text-black' : 'bg-indigo-500 text-white'
          }`}>
            {days > 0 ? days : 0}
          </div>
        </div>
        <div className={`mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${
          item.syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
          item.syncStatus === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
          'bg-amber-500/10 text-amber-500 border-amber-500/20'
        }`}>
          {item.syncStatus === 'synced' ? 'NUBE' : item.syncStatus === 'error' ? 'ERROR' : 'COLA'}
        </div>
      </div>

      {/* Middle Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-white uppercase truncate">
          {item.productName}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded">
            {item.barcode}
          </span>
          <span className="text-slate-500 text-[10px] font-bold uppercase truncate">
            {item.providerName || 'SIN PROVEEDOR'}
          </span>
        </div>
      </div>

      {/* Right Info & Action */}
      <div className="flex flex-col items-end shrink-0">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
          Vencimiento
        </span>
        <span className="text-sm font-black text-white mt-0.5">
          {formattedDate}
        </span>
        <button
          onClick={() => onDelete(item.id)}
          className="mt-2 w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 active:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

// Memoized Scanner Input to isolate re-renders from the main list
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

export const ExpiryCapturePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToastStore.getState();
  const { state, actions } = useExpiryDatabase();
  const { feedback, trigger } = useFeedbackSystem(400);
  const expirySchema = useAppStore(s => s.settings.appSheetConfig?.schema?.expiry || s.settings.schema?.expiry);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false); // This is for the modal (legacy/alternative)
  const [isCameraActive, setIsCameraActive] = useState(false); // Persistent inline camera - CLOSED BY DEFAULT
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [selectedMm, setSelectedMm] = useState<number | null>(null);
  const [selectedYyyy, setSelectedYyyy] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScan = useCallback(async (code: string) => {
    if (!code) return;
    
    // Evitar escaneos duplicados muy rápidos si el modal ya está abierto
    if (isModalOpen) return;

    trigger('success');
    
    const normalizedCode = normalizeSku(code);
    setScannedBarcode(normalizedCode);
    
    // Fetch product info
    const product = await db.products.get(normalizedCode);
    setProductName(product?.name || 'Producto Desconocido');
    setProviderName(product?.supplier || 'N/A');
    
    // Open modal
    setSelectedMm(null);
    setSelectedYyyy(null);
    setIsModalOpen(true);
  }, [isModalOpen, trigger]);

  useHIDScanner({
    onScan: handleScan,
    isEnabled: !isModalOpen && !isScannerOpen,
    maxLatency: 50
  });

  const handleSimpleSubmit = async () => {
    if (!scannedBarcode || !selectedMm || !selectedYyyy || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await actions.handleAddItem({
        barcode: scannedBarcode,
        productName: productName,
        providerName: providerName,
        mm: selectedMm,
        yyyy: selectedYyyy,
        quantity: 1
      });
      
      SoundFX.play('success');
      if (navigator.onLine) {
        addToast('Vencimiento registrado', 'success');
      } else {
        addToast('Guardado en cola (Pendiente de sincronización)', 'info');
      }
      setIsModalOpen(false);
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

  // Sort items by newest first and limit to 50 for performance
  const sortedItems = useMemo(() => {
    return [...state.allItems]
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 50);
  }, [state.allItems]);

  return (
    <div className="h-screen w-full flex flex-col bg-[#050505] overflow-hidden font-mono text-white">
      {/* STICKY HEADER & SCANNER INPUT */}
      <div className="shrink-0 p-4 bg-[#050505] z-10 border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate('/')} 
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest text-slate-400">Captura Rápida</h1>
        </div>

        <ScannerInput 
          onScan={handleScan} 
          isModalOpen={isModalOpen || isScannerOpen || isCameraActive} 
          onOpenScanner={() => setIsCameraActive(!isCameraActive)}
        />
      </div>

      {/* PERSISTENT CAMERA SCANNER (Industrial Style) */}
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
            
            {/* Overlay Info */}
            <div className="absolute bottom-2 left-4 z-40 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-white/80">Cámara Activa</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCROLLABLE LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        {sortedItems.map((item) => (
          <ExpiryItemRow 
            key={item.id} 
            item={item} 
            onDelete={handleDelete} 
          />
        ))}
        
        {sortedItems.length === 0 && (
          <div className="text-center py-12 text-slate-500 font-bold text-sm uppercase tracking-widest">
            No hay registros recientes
          </div>
        )}
      </div>

      {/* DYNAMIC FORM MODAL */}
      <AnimatePresence>
        {isScannerOpen && (
          <BarcodeScannerModal 
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScan={handleScan}
            theme="dark"
          />
        )}
        
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[90vh] will-change-transform"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Registro de Vencimiento</h2>
                  <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[250px]">{productName}</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 active:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto no-scrollbar space-y-6">
                {/* MONTH SELECTOR */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">1. MES</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedMm(m);
                          SoundFX.play('increment');
                        }}
                        className={`h-12 rounded-xl font-black text-lg transition-all border-2 ${
                          selectedMm === m 
                            ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                            : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        {String(m).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* YEAR SELECTOR */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">2. AÑO</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[2026, 2027, 2028, 2029].map(y => (
                      <button
                        key={y}
                        onClick={() => {
                          setSelectedYyyy(y);
                          SoundFX.play('increment');
                        }}
                        className={`h-16 rounded-2xl font-black text-2xl transition-all border-2 flex items-center justify-center italic tracking-tighter ${
                          selectedYyyy === y 
                            ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                            : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FINAL ACTION */}
                <div className="pt-2">
                  <button
                    disabled={!scannedBarcode || !selectedMm || !selectedYyyy || isSubmitting}
                    onClick={handleSimpleSubmit}
                    className={`w-full py-6 rounded-2xl font-black text-xl uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all ${
                      isSubmitting 
                        ? 'bg-blue-900/50 text-blue-200 border border-blue-500/30 cursor-wait'
                        : scannedBarcode && selectedMm && selectedYyyy
                          ? 'bg-white text-black hover:bg-blue-50 shadow-[0_10px_20px_rgba(255,255,255,0.05)] cursor-pointer'
                          : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed grayscale'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
                        />
                        REGISTRANDO...
                      </>
                    ) : (
                      <>
                        <CornerDownLeft className="w-6 h-6" />
                        REGISTRAR
                      </>
                    )}
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

export default ExpiryCapturePage;
