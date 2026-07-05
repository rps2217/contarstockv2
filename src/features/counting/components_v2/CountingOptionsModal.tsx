/**
 * CountingOptionsModal - Modal de opciones del conteo
 */

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/shared/components/ui/Modal';

interface CountingOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
  onLocationChange: (location: string) => void;
  onReset: () => void;
  className?: string;
}

// Ubicaciones predefinidas
const LOCATIONS = [
  { value: 'BODEGA_GRAL', label: 'Bodega General' },
  { value: 'BODEGA_2', label: 'Bodega 2' },
  { value: 'SALA_VENTAS', label: 'Sala de Ventas' },
  { value: 'DEPOSITO', label: 'Depósito' },
];

export const CountingOptionsModal = memo(({
  isOpen,
  onClose,
  currentLocation,
  onLocationChange,
  onReset,
  className = '',
}: CountingOptionsModalProps) => {
  const handleReset = () => {
    if (confirm('¿Estás seguro de que quieres vaciar el conteo actual? Esta acción no se puede deshacer.')) {
      onReset();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Opciones de Conteo"
      variant="bottom-sheet"
      size="lg"
      className={className}
    >
      <div className="space-y-6">
        {/* Ubicación */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-primary flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted" />
            Ubicación
          </label>
          <div className="grid grid-cols-2 gap-2">
            {LOCATIONS.map((loc) => (
              <button
                key={loc.value}
                onClick={() => onLocationChange(loc.value)}
                className={cn(
                  'p-3 rounded-xl text-sm font-medium transition-all text-left',
                  currentLocation === loc.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-surface hover:bg-elevated text-primary border border-subtle'
                )}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zona de Peligro */}
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-semibold">⚠️ Zona de Peligro</p>
          </div>
          <p className="text-xs text-secondary">
            Estas acciones son irreversibles. Asegúrate de exportar tus datos antes de continuar.
          </p>
          <button
            onClick={handleReset}
            className="w-full py-3 bg-rose-500/20 text-rose-400 rounded-xl font-medium hover:bg-rose-500/30 transition-colors"
          >
            Vaciar conteo actual
          </button>
        </div>
      </div>
    </Modal>
  );
});

CountingOptionsModal.displayName = 'CountingOptionsModal';

// Legacy version using framer-motion directly (for backwards compatibility)
export const CountingOptionsModalLegacy = memo(({
  isOpen,
  onClose,
  currentLocation,
  onLocationChange,
  onReset,
}: Omit<CountingOptionsModalProps, 'className'>) => {
  const handleReset = () => {
    if (confirm('¿Estás seguro de que quieres vaciar el conteo actual? Esta acción no se puede deshacer.')) {
      onReset();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-base border border-subtle rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-subtle flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Opciones de Conteo</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Ubicación */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </label>
                <select
                  value={currentLocation}
                  onChange={(e) => onLocationChange(e.target.value)}
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-primary"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc.value} value={loc.value}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset sesión */}
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                <p className="text-sm text-rose-400 mb-3">⚠️ Zona de Peligro</p>
                <button
                  onClick={handleReset}
                  className="w-full py-3 bg-rose-500/20 text-rose-400 rounded-xl font-medium hover:bg-rose-500/30 transition-colors"
                >
                  Vaciar conteo actual
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

CountingOptionsModalLegacy.displayName = 'CountingOptionsModalLegacy';