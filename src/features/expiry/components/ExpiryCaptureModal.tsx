import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CornerDownLeft, Loader2, X } from 'lucide-react';
import { SoundFX } from '../../../services/audio';

interface ExpiryCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedBarcode: string | null;
  productName?: string;
  providerPolicy?: { hasCanje: boolean; days: number } | null;
  selectedMm: number | null;
  setSelectedMm: (mm: number | null) => void;
  selectedYyyy: number | null;
  setSelectedYyyy: (yyyy: number | null) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const ExpiryCaptureModal: React.FC<ExpiryCaptureModalProps> = ({
  isOpen,
  onClose,
  scannedBarcode,
  productName,
  providerPolicy,
  selectedMm,
  setSelectedMm,
  selectedYyyy,
  setSelectedYyyy,
  onSubmit,
  isSubmitting
}) => {
  // Escucha de teclado para agilizar captura manual en escritorio / terminales con teclado físico
  React.useEffect(() => {
    if (!isOpen) return;

    let yearAccumulator = '';
    let monthAccumulator = '';
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        if (scannedBarcode && selectedMm && selectedYyyy && !isSubmitting) {
          e.preventDefault();
          onSubmit();
        }
        return;
      }

      // Si es un número del teclado
      if (/^[0-9]$/.test(e.key)) {
        if (resetTimer) clearTimeout(resetTimer);
        
        resetTimer = setTimeout(() => {
          yearAccumulator = '';
          monthAccumulator = '';
        }, 1200);

        yearAccumulator += e.key;
        monthAccumulator += e.key;

        // Auto-detección de año (ej. 2025 - 2030)
        const matchedYear = parseInt(yearAccumulator);
        if (yearAccumulator.length === 4) {
          if (matchedYear >= 2025 && matchedYear <= 2035) {
            setSelectedYyyy(matchedYear);
            SoundFX.play('increment');
            yearAccumulator = '';
          } else {
            yearAccumulator = yearAccumulator.slice(-1);
          }
        }

        // Auto-detección de mes (01 - 12)
        const matchedMonth = parseInt(monthAccumulator);
        if (monthAccumulator.length === 2) {
          if (matchedMonth >= 1 && matchedMonth <= 12) {
            setSelectedMm(matchedMonth);
            SoundFX.play('increment');
            monthAccumulator = '';
          } else {
            monthAccumulator = monthAccumulator.slice(-1);
            const singleDigitMonth = parseInt(monthAccumulator);
            if (singleDigitMonth >= 1 && singleDigitMonth <= 9) {
              setSelectedMm(singleDigitMonth);
              SoundFX.play('increment');
            }
          }
        } else if (monthAccumulator.length === 1) {
          if (matchedMonth >= 1 && matchedMonth <= 9) {
            setSelectedMm(matchedMonth);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [isOpen, scannedBarcode, selectedMm, selectedYyyy, isSubmitting, onClose, onSubmit, setSelectedMm, setSelectedYyyy]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center pointer-events-none">
          {/* Backdrop sutil */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl bg-slate-950 border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto"
          >
            {/* HANDLE INDICATOR */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <div className="flex-1 min-w-0 pr-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-warning">Escaneado</span>
                <p className="text-base font-black text-white truncate leading-tight mt-1 uppercase italic tracking-tighter tabular-nums">
                  {scannedBarcode}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate uppercase font-bold">{productName}</p>
              </div>
              <div className="flex items-center gap-3">
                {providerPolicy && (
                  <div className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-tighter flex flex-col items-center leading-none ${
                    providerPolicy.hasCanje ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  }`}>
                    <span className="mb-1">{providerPolicy.hasCanje ? 'CANJE' : 'MERMA'}</span>
                    <span className="text-xs">{providerPolicy.days}D</span>
                  </div>
                )}
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 active:bg-white/10 active:scale-95 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
              {/* MONTH SELECTOR */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">1. SELECCIONE MES</label>
                  {selectedMm && <span className="text-[10px] font-black text-brand-warning uppercase">MES {selectedMm}</span>}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <button
                      key={m}
                      onClick={() => { setSelectedMm(m); SoundFX.play('increment'); }}
                      className={`h-14 rounded-2xl font-black text-xl transition-all border-2 active:scale-90 ${
                        selectedMm === m 
                          ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105 z-10' 
                          : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                      }`}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {/* YEAR SELECTOR */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">2. SELECCIONE AÑO</label>
                  {selectedYyyy && <span className="text-[10px] font-black text-emerald-500 uppercase">AÑO {selectedYyyy}</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                    <button
                      key={y}
                      onClick={() => { setSelectedYyyy(y); SoundFX.play('increment'); }}
                      className={`h-16 rounded-2xl font-black text-2xl transition-all border-2 flex items-center justify-center italic tracking-tighter active:scale-95 ${
                        selectedYyyy === y 
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)] scale-105 z-10' 
                          : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-2">
                <button
                  disabled={!scannedBarcode || !selectedMm || !selectedYyyy || isSubmitting}
                  onClick={onSubmit}
                  className={`w-full py-7 rounded-[1.5rem] font-black text-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl ${
                    isSubmitting 
                      ? 'bg-slate-800 text-slate-500 cursor-wait'
                      : scannedBarcode && selectedMm && selectedYyyy
                        ? 'bg-white text-black hover:bg-blue-50 shadow-blue-500/20'
                        : 'bg-white/5 text-slate-700 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <><CornerDownLeft className="w-8 h-8 text-black" /> REGISTRAR</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
