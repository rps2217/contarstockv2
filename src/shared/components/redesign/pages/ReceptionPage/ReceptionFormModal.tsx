import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { Reception } from '../ReceptionPage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Reception>) => void;
  reception?: Reception | null;
}

export const ReceptionFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  reception,
}) => {
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierRut: '',
    documentNumber: '',
    documentType: 'factura',
    location: '',
    receivedBy: '',
    observations: '',
  });

  useEffect(() => {
    if (reception) {
      setFormData({
        supplierName: reception.supplierName || '',
        supplierRut: reception.supplierRut || '',
        documentNumber: reception.documentNumber || '',
        documentType: reception.documentType || 'factura',
        location: reception.location || '',
        receivedBy: reception.receivedBy || '',
        observations: reception.observations || '',
      });
    } else {
      setFormData({
        supplierName: '',
        supplierRut: '',
        documentNumber: '',
        documentType: 'factura',
        location: '',
        receivedBy: '',
        observations: '',
      });
    }
  }, [reception, isOpen]);

  const handleSubmit = () => {
    if (!formData.supplierName.trim()) {
      toast.error('El nombre del proveedor es requerido');
      return;
    }
    onSave(formData);
    onClose();
  };

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
              <h2 className="text-lg font-bold text-primary">
                {reception ? 'Editar Recepción' : 'Nueva Recepción'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-xs text-muted mb-1 block">Proveedor *</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="Nombre del proveedor"
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">RUT Proveedor</label>
                  <input
                    type="text"
                    value={formData.supplierRut}
                    onChange={e => setFormData({ ...formData, supplierRut: e.target.value })}
                    placeholder="12.345.678-9"
                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Tipo Documento</label>
                  <select
                    value={formData.documentType}
                    onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="factura">Factura</option>
                    <option value="guia">Guía</option>
                    <option value="orden">Orden de Compra</option>
                    <option value="nota">Nota</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Número Documento</label>
                <input
                  type="text"
                  value={formData.documentNumber}
                  onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="12345"
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Ubicación</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Bodega A"
                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Recibido por</label>
                  <input
                    type="text"
                    value={formData.receivedBy}
                    onChange={e => setFormData({ ...formData, receivedBy: e.target.value })}
                    placeholder="Nombre"
                    className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Observaciones</label>
                <textarea
                  value={formData.observations}
                  onChange={e => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full bg-surface border border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4 border-t border-subtle flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-surface hover:bg-elevated text-secondary rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
              >
                {reception ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
