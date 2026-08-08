import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PackageCheck, Truck, MapPin, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reception } from '../ReceptionPage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  reception: Reception | null;
}

export const ReceptionDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onEdit,
  reception,
}) => {
  if (!reception) return null;

  const statusConfig = {
    pending: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Pendiente' },
    'in-progress': { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'En Progreso' },
    completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', label: 'Completado' },
  };
  const syncConfig = {
    pending: { bg: 'bg-amber-500/20', text: 'text-amber-500', label: 'Pendiente' },
    synced: { bg: 'bg-emerald-500/20', text: 'text-emerald-500', label: 'Sincronizado' },
    error: { bg: 'bg-rose-500/20', text: 'text-rose-500', label: 'Error' },
  };
  const status = statusConfig[reception.status];
  const sync = syncConfig[reception.syncStatus];
  const date = reception.receivedAt ? new Date(reception.receivedAt).toLocaleString('es-CL') : '-';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative w-full max-w-md bg-base rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-4 border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <PackageCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary">Detalle de Recepción</h2>
                  <p className="text-xs text-muted">{reception.id.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status badges */}
              <div className="flex gap-2">
                <span
                  className={cn('px-3 py-1 rounded-full text-xs font-bold', status.bg, status.text)}
                >
                  {status.label}
                </span>
                <span
                  className={cn('px-3 py-1 rounded-full text-xs font-bold', sync.bg, sync.text)}
                >
                  {sync.label}
                </span>
              </div>

              {/* Provider info */}
              <div className="bg-surface border border-subtle rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-500" />
                  Proveedor
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Nombre:</span>
                    <span className="text-primary">{reception.supplierName || '-'}</span>
                  </div>
                  {reception.supplierRut && (
                    <div className="flex justify-between">
                      <span className="text-muted">RUT:</span>
                      <span className="text-primary font-mono">{reception.supplierRut}</span>
                    </div>
                  )}
                  {reception.documentNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted">Documento:</span>
                      <span className="text-primary font-mono">
                        {reception.documentType?.toUpperCase()} {reception.documentNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location & Receiver */}
              <div className="bg-surface border border-subtle rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Ubicación y Recibido
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Ubicación:</span>
                    <span className="text-primary">{reception.location || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Recibido por:</span>
                    <span className="text-primary">{reception.receivedBy || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Fecha:</span>
                    <span className="text-primary">{date}</span>
                  </div>
                </div>
              </div>

              {/* Items count */}
              <div className="bg-surface border border-subtle rounded-xl p-4">
                <h3 className="text-sm font-semibold text-primary flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-amber-500" />
                  Items ({reception.items?.length || 0})
                </h3>
                {reception.items && reception.items.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {reception.items.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-muted truncate flex-1">
                          {item.name || item.barcode}
                        </span>
                        <span className="text-primary ml-2">x{item.quantity}</span>
                      </div>
                    ))}
                    {reception.items.length > 5 && (
                      <p className="text-xs text-muted text-center">
                        +{reception.items.length - 5} más...
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted">Sin items registrados</p>
                )}
              </div>

              {/* Observations */}
              {reception.observations && (
                <div className="bg-surface border border-subtle rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-primary mb-2">Observaciones</h3>
                  <p className="text-sm text-secondary">{reception.observations}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4 border-t border-subtle flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-surface hover:bg-elevated text-secondary rounded-xl font-medium transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={onEdit}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold transition-colors"
              >
                Editar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
