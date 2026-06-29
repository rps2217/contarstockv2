/**
 * ExpiryCaptureModal - Modal para capturar vencimientos
 * 
 * Características:
 * - Búsqueda de producto por SKU/Barcode
 * - Selector de mes/año con auto-detección de teclado
 * - Campo de cantidad
 * - Campo de ubicación
 * - Observaciones
 * - Validación de fecha vencida
 * - Políticas de proveedor
 * 
 * @version 2.0.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CornerDownLeft, Loader2, X, Package, AlertTriangle, MapPin, CheckCircle2 } from 'lucide-react';
import { ProductSearchInput } from '@/shared/features/inventory/components/ProductSearchInput';
import { QuantityInput } from '@/shared/features/inventory/components/QuantityInput';
import type { ProductInfo } from '@/shared/features/inventory/components';

interface ExpiryCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedBarcode?: string | null;
  onSubmit?: (data: ExpiryFormData) => Promise<void>;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export interface ExpiryFormData {
  barcode: string;
  productName: string;
  quantity: number;
  mm: number;
  yyyy: number;
  location: string;
  observaciones: string;
  providerName?: string;
  providerRut?: string;
  hasCanje?: boolean;
  withdrawalDays?: number;
}

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const AÑOS = [2025, 2026, 2027, 2028];

export const ExpiryCaptureModal: React.FC<ExpiryCaptureModalProps> = ({
  isOpen,
  onClose,
  scannedBarcode,
  onSubmit,
  theme = 'dark',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedMm, setSelectedMm] = useState<number | null>(null);
  const [selectedYyyy, setSelectedYyyy] = useState<number | null>(null);
  const [location, setLocation] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const isDark = theme === 'dark';
  const isHighContrast = theme === 'high-contrast';

  // Usar barcode escaneado si existe
  useEffect(() => {
    if (scannedBarcode && isOpen) {
      setBarcode(scannedBarcode);
    }
  }, [scannedBarcode, isOpen]);

  // Limpiar form al cerrar
  useEffect(() => {
    if (!isOpen) {
      setBarcode('');
      setProduct(null);
      setQuantity(1);
      setSelectedMm(null);
      setSelectedYyyy(null);
      setLocation('');
      setObservaciones('');
    }
  }, [isOpen]);

  // Validar fecha vencida
  const isDateExpired = useMemo(() => {
    if (!selectedMm || !selectedYyyy) return false;
    const expiryDate = new Date(selectedYyyy, selectedMm - 1, 1);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    expiryDate.setDate(0);
    return expiryDate < new Date();
  }, [selectedMm, selectedYyyy]);

  // Es próximo a vencer (30 días)
  const isNearExpiry = useMemo(() => {
    if (!selectedMm || !selectedYyyy) return false;
    const now = new Date();
    const expiryDate = new Date(selectedYyyy, selectedMm, 0);
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }, [selectedMm, selectedYyyy]);

  // Auto-detectar fecha del teclado
  useKeyboardDateDetection(selectedMm, selectedYyyy, setSelectedMm, setSelectedYyyy, isOpen);

  // ¿Se puede enviar? (requiere barcode, mes y año)
  const canSubmit = barcode.length >= 8 && selectedMm && selectedYyyy && !isSubmitting;

  // ¿El producto fue encontrado en la BD?
  const productFound = product !== null;

  // Handler de submit
  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit?.({
        barcode,
        productName: product?.name || barcode, // Usar barcode como nombre si no se encontró
        quantity,
        mm: selectedMm!,
        yyyy: selectedYyyy!,
        location,
        observaciones,
        providerName: product?.supplierName,
        providerRut: product?.supplierRut,
        hasCanje: product?.providerPolicy?.hasExchange,
        withdrawalDays: product?.providerPolicy?.withdrawalDays,
      });
      onClose();
    } catch {
      // Error manejado externamente
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex justify-end pointer-events-none">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 pointer-events-auto z-0"
          />
          
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative z-10 w-full sm:w-[480px] h-full overflow-hidden flex flex-col pointer-events-auto ${
              isDark ? 'bg-base border-white/10' : 'bg-white border-slate-200'
            } shadow-[-20px_0_60px_rgba(0,0,0,0.8)]`}
          >
            {/* HEADER */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-white/5 bg-surface/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                }`}>
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    isDark ? 'text-slate-500' : 'text-slate-500'
                  }`}>
                    Captura de Vencimiento
                  </span>
                  <p className={`font-black text-sm truncate max-w-[200px] ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {product?.name || barcode || 'Sin producto'}
                  </p>
                </div>
              </div>
              
              {/* Proveedor y Políticas */}
              <div className="flex items-center gap-2">
                {/* Indicador de producto encontrado */}
                {barcode.length >= 8 && (
                  <div className={`px-2 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 ${
                    productFound
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-500/10 text-muted border-slate-500/30'
                  }`}>
                    {productFound ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>BD</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>NUEVO</span>
                      </>
                    )}
                  </div>
                )}
                
                {product?.providerPolicy && (
                  <div className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-tighter flex flex-col items-center leading-none ${
                    product.providerPolicy.hasExchange 
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' 
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  }`}>
                    <span className="mb-1">{product.providerPolicy.hasExchange ? 'CANJE' : 'MERMA'}</span>
                    <span className="text-xs">{product.providerPolicy.withdrawalDays}D</span>
                  </div>
                )}
                <button 
                  onClick={onClose}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                    isDark 
                      ? 'bg-white/5 text-muted active:bg-white/10' 
                      : 'bg-slate-200 text-slate-500 active:bg-slate-300'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              
              {/* 1. BÚSQUEDA DE PRODUCTO */}
              <ProductSearchInput
                value={barcode}
                onChange={(val) => { setBarcode(val); }}
                onProductFound={(p) => setProduct(p)}
                placeholder="Escanee o ingrese código..."
                theme={theme}
                autoFocus={!scannedBarcode}
              />

              {/* 2. CANTIDAD */}
              <QuantityInput
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={9999}
                label="Cantidad"
                theme={theme}
              />

              {/* 3. SELECTOR DE MES */}
              <div className="space-y-3">
                <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  isDark ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  <span className="w-5 h-5 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px] font-black">3</span>
                  Seleccione Mes {selectedMm && <span className="text-blue-400">→ {MESES[selectedMm - 1]}</span>}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MESES.map((mes, i) => i + 1).map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedMm(m)}
                      className={`h-11 rounded-xl font-black text-sm transition-all border-2 active:scale-90 ${
                        selectedMm === m 
                          ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                          : isDark
                            ? 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {MESES[m - 1]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. SELECTOR DE AÑO */}
              <div className="space-y-3">
                <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  isDark ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-black">4</span>
                  Seleccione Año {selectedYyyy && <span className="text-emerald-400">→ {selectedYyyy}</span>}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AÑOS.map(y => (
                    <button
                      key={y}
                      onClick={() => setSelectedYyyy(y)}
                      className={`h-12 rounded-xl font-black text-lg italic tracking-tighter transition-all border-2 active:scale-95 ${
                        selectedYyyy === y 
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]' 
                          : isDark
                            ? 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. UBICACIÓN */}
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  isDark ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  <MapPin className="w-3 h-3" />
                  Ubicación en bodega
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value.toUpperCase())}
                  placeholder="Ej: BOD-37, EST-5, NIVEL-2"
                  className={`w-full px-4 py-3 rounded-xl text-sm font-mono font-bold uppercase tracking-wider border-2 transition-all outline-none ${
                    isDark
                      ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white placeholder-slate-600'
                      : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* 6. OBSERVACIONES */}
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest ${
                  isDark ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales sobre este lote..."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl text-sm border-2 transition-all outline-none resize-none ${
                    isDark
                      ? 'bg-white/5 border-white/10 focus:border-blue-500 text-white placeholder-slate-600'
                      : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* ALERTAS */}
              <AnimatePresence>
                {isDateExpired && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${
                      isDark 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">⚠️ Producto Vencido</p>
                      <p className="text-[10px] mt-1 opacity-80">
                        La fecha seleccionada ya pasó. ¿Desea registrarlo como merma?
                      </p>
                    </div>
                  </motion.div>
                )}

                {isNearExpiry && !isDateExpired && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${
                      isDark 
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">⏰ Por Vencer</p>
                      <p className="text-[10px] mt-1 opacity-80">
                        Este producto vencerá en menos de 30 días.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FOOTER */}
            <div className={`p-5 border-t ${
              isDark ? 'border-white/5 bg-surface/50' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                disabled={!canSubmit}
                onClick={handleSubmit}
                className={`w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
                  isSubmitting 
                    ? 'bg-slate-700 text-slate-500 cursor-wait'
                    : canSubmit
                      ? 'bg-white text-black hover:bg-blue-50 active:bg-blue-100 shadow-blue-500/20'
                      : isDark
                        ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-200 text-muted cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <><CornerDownLeft className="w-6 h-6 text-black" /> Registrar Vencimiento</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Auto-detección de fecha desde teclado numérico
 */
function useKeyboardDateDetection(
  selectedMm: number | null,
  selectedYyyy: number | null,
  setSelectedMm: (mm: number) => void,
  setSelectedYyyy: (yyyy: number) => void,
  isOpen: boolean
) {
  useEffect(() => {
    if (!isOpen) return;

    let yearAccumulator = '';
    let monthAccumulator = '';
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si hay focus en input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') return;
      if (e.key === 'Enter') return;

      if (/^[0-9]$/.test(e.key)) {
        if (resetTimer) clearTimeout(resetTimer);
        
        resetTimer = setTimeout(() => {
          yearAccumulator = '';
          monthAccumulator = '';
        }, 1200);

        yearAccumulator += e.key;
        monthAccumulator += e.key;

        // Auto-detectar año (4 dígitos)
        if (yearAccumulator.length === 4) {
          const year = parseInt(yearAccumulator);
          if (year >= 2025 && year <= 2035) {
            setSelectedYyyy(year);
            yearAccumulator = '';
          } else {
            yearAccumulator = yearAccumulator.slice(-1);
          }
        }

        // Auto-detectar mes (1-2 dígitos)
        const month = parseInt(monthAccumulator);
        if (monthAccumulator.length === 2 && month >= 1 && month <= 12) {
          setSelectedMm(month);
          monthAccumulator = '';
        } else if (monthAccumulator.length === 1 && month >= 1 && month <= 9) {
          setSelectedMm(month);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [isOpen, setSelectedMm, setSelectedYyyy]);
}

