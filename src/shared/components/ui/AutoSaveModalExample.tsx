"use client";
/**
 * AutoSaveModalExample - Ejemplo de uso del hook useAutoSave
 * 
 * Este es un ejemplo de cómo integrar el auto-guardado en un formulario.
 * Copia este patrón a los formularios que necesiten auto-guardado.
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useAutoSave, AutoSaveIndicator, DraftRecoveryBanner } from '@/shared/hooks/useAutoSave';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  description: string;
  quantity: number;
  category: string;
  notes: string;
}

interface AutoSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<FormData>;
  onSave: (data: FormData) => Promise<void>;
  formKey?: string; // Clave única para identificar el formulario
}

// Hook personalizado que combina el formulario con auto-guardado
function useProductForm(initialData?: Partial<FormData>, formKey = 'product-form') {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    quantity: 1,
    category: '',
    notes: '',
    ...initialData,
  });

  const [isDirty, setIsDirty] = useState(false);

  const {
    status,
    save,
    clear,
    hasDraft,
    lastSavedAt,
  } = useAutoSave<FormData>({
    key: formKey,
    debounceMs: 2000, // Guardar después de 2 segundos de inactividad
    maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 días
    onRestore: (data) => {
      setFormData(data);
      setIsDirty(true);
    },
    enabled: isDirty, // Solo guardar si hay cambios
  });

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // Auto-guardar cuando hay cambios
  useEffect(() => {
    if (isDirty) {
      save(formData);
    }
  }, [formData, isDirty, save]);

  return {
    formData,
    updateField,
    status,
    clear,
    lastSavedAt,
    hasDraft,
  };
}

export const AutoSaveModal: React.FC<AutoSaveModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave,
  formKey = 'product-form',
}) => {
  const {
    formData,
    updateField,
    status,
    clear,
    hasDraft,
  } = useProductForm(initialData, formKey);

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      clear(); // Limpiar draft después de guardar exitosamente
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = () => {
    // El draft se restaura automáticamente via onRestore callback
    clear(); // Limpiar para que no muestre el banner
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-subtle rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-primary">Producto</h2>
            <AutoSaveIndicator status={status} />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-elevated rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Banner de recuperación de draft */}
          <DraftRecoveryBanner
            hasDraft={hasDraft}
            onRestore={handleRestore}
            onDismiss={clear}
            formName="formulario de producto"
          />

          {/* Campos del formulario */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Nombre del producto
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full bg-elevated border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
                placeholder="Ej: Leche semidescremada"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                className="w-full bg-elevated border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Descripción opcional..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  Cantidad
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => updateField('quantity', parseInt(e.target.value) || 0)}
                  className="w-full bg-elevated border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
                  min={0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">
                  Categoría
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full bg-elevated border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="lacteos">Lácteos</option>
                  <option value="carnes">Carnes</option>
                  <option value="frutas">Frutas</option>
                  <option value="verduras">Verduras</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={2}
                className="w-full bg-elevated border border-subtle rounded-xl px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-subtle">
          <p className="text-xs text-muted">
            Se guarda automáticamente cada 2 segundos
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !formData.name}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors',
                'bg-blue-600 text-white hover:bg-blue-500',
                (isSaving || !formData.name) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoSaveModal;