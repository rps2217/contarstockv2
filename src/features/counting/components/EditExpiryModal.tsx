/**
 * EditExpiryModal - Modal para editar fecha de vencimiento
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, X, Check, AlertTriangle } from 'lucide-react';

interface EditExpiryModalProps {
  isOpen: boolean;
  barcode: string;
  productName: string;
  currentMm?: number;
  currentYyyy?: number;
  onSave: (data: { mm: number; yyyy: number }) => void;
  onCancel: () => void;
}

export const EditExpiryModal: React.FC<EditExpiryModalProps> = ({
  isOpen,
  barcode,
  productName,
  currentMm,
  currentYyyy,
  onSave,
  onCancel
}) => {
  const [selectedMm, setSelectedMm] = useState<number | null>(currentMm || null);
  const [selectedYyyy, setSelectedYyyy] = useState<number | null>(currentYyyy || null);

  const months = [
    { value: 1, label: 'Ene' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dic' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    setSelectedMm(currentMm || null);
    setSelectedYyyy(currentYyyy || null);
  }, [currentMm, currentYyyy]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && selectedMm && selectedYyyy) {
        onSave({ mm: selectedMm, yyyy: selectedYyyy });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedMm, selectedYyyy, onCancel, onSave]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (selectedMm && selectedYyyy) {
      onSave({ mm: selectedMm, yyyy: selectedYyyy });
    }
  };

  const hasChanged = selectedMm !== currentMm || selectedYyyy !== currentYyyy;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-lg bg-surface border border-subtle rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-5 bg-elevated border-b border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">Editar Fecha de Vencimiento</h2>
              <p className="text-xs text-muted">Modifica la fecha de vencimiento del producto</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-surface transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="p-3 bg-base rounded-xl border border-subtle">
            <p className="text-sm font-semibold text-primary truncate">{productName}</p>
            <p className="text-xs text-muted font-mono">{barcode}</p>
          </div>

          {currentMm && currentYyyy && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm text-amber-400">
                Fecha actual: <span className="font-bold">{String(currentMm).padStart(2, '0')}/{currentYyyy}</span>
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Mes</label>
            <div className="grid grid-cols-6 gap-2">
              {months.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setSelectedMm(m.value)}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedMm === m.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-elevated text-secondary hover:bg-surface'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Anio</label>
            <div className="grid grid-cols-4 gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYyyy(y)}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedYyyy === y
                      ? 'bg-blue-500 text-white'
                      : 'bg-elevated text-secondary hover:bg-surface'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 bg-base border-t border-subtle flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-surface rounded-xl text-secondary font-medium hover:bg-elevated transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedMm || !selectedYyyy || !hasChanged}
            className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
              selectedMm && selectedYyyy && hasChanged
                ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                : 'bg-elevated text-muted cursor-not-allowed'
            }`}
          >
            <Check className="w-5 h-5" />
            Guardar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
