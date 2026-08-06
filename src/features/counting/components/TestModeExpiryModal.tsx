/**
 * =============================================================================
 * TestModeExpiryModal - Modal para registrar fecha de vencimiento en conteo
 * =============================================================================
 *
 * SIMPLIFICADO según feedback:
 * - Solo muestra años válidos (2025-2027)
 * - Botón "Omitir" para productos sin fecha de interés
 * - Si selecciona año válido → se registra el vencimiento
 * - Si presiona omitir → solo se cuenta el producto
 *
 * @since 2026-07-07
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Zap, Calendar, SkipForward } from 'lucide-react';
import { EXPIRY_MIN_YEAR, EXPIRY_MAX_YEAR } from '@/lib/expiryConfig';

interface TestModeExpiryModalProps {
  barcode: string;
  productName: string;
  onComplete: (data: { mm: number; yyyy: number }) => void;
  onCancel: () => void;
  /** Callback cuando se omite el registro de fecha */
  onSkip?: () => void;
}

export const TestModeExpiryModal: React.FC<TestModeExpiryModalProps> = ({
  barcode,
  productName,
  onComplete,
  onCancel,
  onSkip,
}) => {
  const [selectedMm, setSelectedMm] = useState<number | null>(null);
  const [selectedYyyy, setSelectedYyyy] = useState<number | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Solo años válidos para registrar (2025-2027)
  const years = Array.from(
    { length: EXPIRY_MAX_YEAR - EXPIRY_MIN_YEAR + 1 },
    (_, i) => EXPIRY_MIN_YEAR + i
  );

  // Verificar si podemos confirmar
  const canConfirm = selectedMm !== null && selectedYyyy !== null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && canConfirm) {
        e.preventDefault();
        onComplete({ mm: selectedMm, yyyy: selectedYyyy });
      }
      // Omitir con Shift+Enter
      if (e.shiftKey && e.key === 'Enter' && onSkip) {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMm, selectedYyyy, canConfirm, onCancel, onComplete, onSkip]);

  const handleSave = () => {
    if (selectedMm && selectedYyyy) {
      onComplete({ mm: selectedMm, yyyy: selectedYyyy });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]"
      >
        {/* HEADER */}
        <div className="p-6 bg-[#111] border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                FECHA VENCIMIENTO
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Conteo</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors group"
          >
            <X className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* PRODUCT INFO */}
        <div className="px-6 pt-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
              SKU
            </div>
            <div className="text-xl font-black text-white font-mono tracking-wider">{barcode}</div>
            <div className="text-sm text-muted mt-1 uppercase truncate">{productName}</div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-6">
          {/* MES */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              MES
            </label>
            <div className="grid grid-cols-4 gap-2">
              {months.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMm(m)}
                  className={`h-14 rounded-xl font-black text-lg transition-all border-2 ${
                    selectedMm === m
                      ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105 z-10'
                      : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* AÑO - Solo válidos */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              AÑO ({EXPIRY_MIN_YEAR} - {EXPIRY_MAX_YEAR})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYyyy(y)}
                  className={`h-16 rounded-2xl font-black text-xl transition-all border-2 ${
                    selectedYyyy === y
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-105 z-10'
                      : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="space-y-3">
            {/* Confirmar - Registrar vencimiento */}
            <button
              disabled={!canConfirm}
              onClick={handleSave}
              className={`w-full py-6 rounded-[1.5rem] font-black text-xl uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all ${
                canConfirm
                  ? 'bg-white text-black hover:bg-blue-50 shadow-lg cursor-pointer active:scale-[0.98]'
                  : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed grayscale'
              }`}
            >
              <Check className="w-6 h-6" />
              REGISTRAR
            </button>

            {/* Omitir - Solo contar sin registro */}
            <button
              onClick={onSkip}
              className="w-full py-5 rounded-[1rem] font-bold text-base uppercase tracking-wider flex items-center justify-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              <SkipForward className="w-5 h-5" />
              OMITIR - Solo contar
            </button>

            <p className="text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              ENTER = Registrar • SHIFT+ENTER = Omitir • ESC = Cancelar
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
