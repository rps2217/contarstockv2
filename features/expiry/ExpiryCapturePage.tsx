import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  const days = getDaysUntilExpiry(item.mm || 0, item.yyyy || 0);
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
  isModalOpen 
}: { 
  onScan: (code: string) => void;
  isModalOpen: boolean;
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
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <ScanLine className="w-6 h-6 text-blue-500" />
      </div>
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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScan = useCallback(async (code: string) => {
    if (!code) return;
    SoundFX.play('scan');
    if (navigator.vibrate) navigator.vibrate(40);
    
    const normalizedCode = normalizeSku(code);
    setScannedBarcode(normalizedCode);
    
    // Fetch product info
    const product = await db.products.get(normalizedCode);
    setProductName(product?.name || 'Producto Desconocido');
    
    // Reset modal state and open
    setSelectedMonth(null);
    setSelectedYear(null);
    setIsModalOpen(true);
  }, []);

  useHIDScanner({
    onScan: handleScan,
    isEnabled: !isModalOpen,
    maxLatency: 50
  });

  const handleSave = async () => {
    if (!selectedMonth || !selectedYear) {
      addToast('Seleccione mes y año', 'error');
      SoundFX.play('error');
      return;
    }

    try {
      setIsSubmitting(true);
      await actions.handleAddItem({
        barcode: scannedBarcode,
        productName: productName,
        mm: selectedMonth,
        yyyy: selectedYear,
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

  const getDaysUntilExpiry = (mm: number, yyyy: number) => {
    const expiryDate = new Date(yyyy, mm - 1, 1);
    // Set to end of month
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    expiryDate.setDate(0);
    return differenceInDays(expiryDate, new Date());
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#050505] overflow-hidden font-mono text-white">
      {/* STICKY HEADER & SCANNER INPUT */}
      <div className="shrink-0 p-4 bg-[#050505] z-10 border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => navigate('/expiry', { state: { preventAutoRedirect: true } })} 
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest text-slate-400">Captura Rápida</h1>
        </div>

        <ScannerInput onScan={handleScan} isModalOpen={isModalOpen} />
      </div>

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

      {/* SIMPLIFIED DATE MODAL */}
      <AnimatePresence>
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
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Fecha de Vencimiento</h2>
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
              <div className="p-4 overflow-y-auto space-y-6">
                
                {/* Months Grid */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">
                    Mes (1-12)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className={`h-12 rounded-xl text-lg font-black transition-all border ${
                          selectedMonth === m
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400 active:bg-white/10'
                        }`}
                      >
                        {m.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Years Grid (2026, 2027) */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">
                    Año
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[2026, 2027].map((y) => (
                      <button
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className={`h-14 rounded-xl text-xl font-black transition-all border ${
                          selectedYear === y
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400 active:bg-white/10'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-[#1a1a1a]">
                <button
                  onClick={handleSave}
                  disabled={!selectedMonth || !selectedYear || isSubmitting}
                  className="w-full h-14 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpiryCapturePage;
