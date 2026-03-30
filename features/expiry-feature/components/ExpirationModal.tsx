import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Barcode, Calendar, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SoundFX } from '../../../services/audio';
import { normalizeSku } from '../../../services/utils';

interface ExpirationModalProps {
  onComplete: (data: { barcode: string; productName: string; mm: number; yyyy: number }) => void;
  onCancel?: () => void;
  productMap: Record<string, any>;
}

export const ExpirationModal: React.FC<ExpirationModalProps> = ({ 
  onComplete, 
  onCancel,
  productMap 
}) => {
  const [barcode, setBarcode] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [selectedMm, setSelectedMm] = useState<number | null>(null);
  const [selectedYyyy, setSelectedYyyy] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Auto-lookup logic - Búsqueda ultra-precisa con SKU normalizado
  useEffect(() => {
    const sku = normalizeSku(barcode);
    if (sku) {
      const product = productMap[sku];
      if (product) {
        setProductName(product.name || product.DESCRIPTOR || 'PRODUCTO ENCONTRADO');
      } else {
        setProductName('PRODUCTO NO ENCONTRADO EN CATÁLOGO');
      }
    } else {
      setProductName('');
    }
  }, [barcode, productMap]);

  const handleSave = async () => {
    if (barcode && selectedMm && selectedYyyy && !isSubmitting) {
      setIsSubmitting(true);
      SoundFX.play('success');
      try {
        await onComplete({
          barcode,
          productName: productName || 'Producto Manual',
          mm: selectedMm,
          yyyy: selectedYyyy
        });
      } catch (err) {
        setIsSubmitting(false);
      }
    } else if (!isSubmitting) {
      SoundFX.play('error');
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [2026, 2027];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]"
      >
        {/* HEADER */}
        <div className="p-8 bg-[#111] border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-500/20 rounded-3xl flex items-center justify-center border border-amber-500/30">
              <Zap className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">REGISTRO ULTRA-RÁPIDO</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Optimizado para escaneo y entrada táctil de alta frecuencia</p>
            </div>
          </div>
          {onCancel && (
            <button 
              onClick={onCancel} 
              className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors group"
            >
              <X className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors" />
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="p-10 space-y-10">
          
          {/* BARCODE SECTION */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">1. ESCANEO O INGRESO DE SKU</label>
              <AnimatePresence>
                {productName && (
                  <motion.span 
                    initial={{ opacity: 0, x: 10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      productName.includes('NO ENCONTRADO') ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {productName.includes('NO ENCONTRADO') ? 'Producto Desconocido' : 'Producto Identificado'}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="relative group">
              <div className="absolute left-8 top-1/2 -translate-y-1/2">
                <Barcode className={`w-8 h-8 transition-colors ${barcode ? 'text-blue-500' : 'text-slate-700'}`} />
              </div>
              <input 
                autoFocus
                ref={barcodeRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-black border-2 border-white/10 group-hover:border-white/20 rounded-[2rem] py-8 pl-20 pr-10 text-4xl font-black focus:outline-none focus:border-blue-600 text-white tracking-[0.1em] transition-all placeholder:text-white/5"
                placeholder="00000000"
              />
            </div>
            {productName && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl"
              >
                <p className="text-xl font-black text-blue-400 uppercase italic truncate text-center">
                  {productName}
                </p>
              </motion.div>
            )}
          </div>

          {/* MONTH SELECTOR - FULL WIDTH ROW */}
          <div className="space-y-5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-4">2. SELECCIONE MES DE VENCIMIENTO</label>
            <div className="grid grid-cols-6 gap-3">
              {months.map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setSelectedMm(m);
                    SoundFX.play('increment');
                  }}
                  className={`h-24 rounded-2xl font-black text-3xl transition-all border-2 ${
                    selectedMm === m 
                      ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(37,99,235,0.5)] scale-[1.05] z-10' 
                      : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* YEAR SELECTOR - HORIZONTAL ROW */}
          <div className="space-y-5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] px-4">3. SELECCIONE AÑO</label>
            <div className="grid grid-cols-2 gap-4">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => {
                    setSelectedYyyy(y);
                    SoundFX.play('increment');
                  }}
                  className={`h-24 rounded-3xl font-black text-4xl transition-all border-2 flex items-center justify-center italic tracking-tighter ${
                    selectedYyyy === y 
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_35px_rgba(16,185,129,0.4)] scale-[1.03] z-10' 
                      : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* FINAL ACTION */}
          <div className="pt-6">
            <button
              disabled={!barcode || !selectedMm || !selectedYyyy || isSubmitting}
              onClick={handleSave}
              className={`w-full py-10 rounded-[3rem] font-black text-4xl uppercase tracking-[0.3em] flex items-center justify-center gap-6 transition-all ${
                isSubmitting 
                  ? 'bg-blue-900/50 text-blue-200 border border-blue-500/30 cursor-wait'
                  : barcode && selectedMm && selectedYyyy
                    ? 'bg-white text-black hover:bg-blue-50 scale-[1.02] shadow-[0_20px_50px_rgba(255,255,255,0.1)] cursor-pointer'
                    : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed grayscale'
              }`}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full"
                  />
                  REGISTRANDO...
                </>
              ) : (
                <>
                  <Check className="w-12 h-12" />
                  REGISTRAR
                </>
              )}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
