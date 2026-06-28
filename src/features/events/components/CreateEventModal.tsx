/**
 * CreateEventModal - Modal para crear/editar eventos
 * 
 * Arquitectura Lego: Delega toda la lógica al hook useEventForm
 */

import React, { useState } from 'react';
import { X, Loader2, Plus, Package, AlertTriangle, FileText, Truck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEventForm } from '../hooks/useEventForm';
import { EventType } from '../constants/eventConstants';
import { ProductSearchInput } from './ProductSearchInput';
import { ItemList } from '@/shared/components/ui/ItemList';
import { FormField } from '@/shared/components/ui/FormField';

interface EventFormData {
  barcode: string;
  productName: string;
  providerName?: string;
  event: string;
  quantity: number;
  frc: string;
  nguia: string;
  destino: string;
  traspaso: string;
  observaciones: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormData[]) => Promise<void>;
  theme: 'dark' | 'light' | 'high-contrast';
  editingItem?: EventFormData | null;
}

export const CreateEventModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  theme, 
  editingItem 
}) => {
  const isDark = theme === 'dark';
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    sku,
    setSku,
    product,
    eventType,
    setEventType,
    quantity,
    setQuantity,
    frc,
    setFrc,
    nguia,
    setNguia,
    destino,
    setDestino,
    traspaso,
    setTraspaso,
    observaciones,
    setObservaciones,
    isSearching,
    items,
    addItem,
    removeItem,
    getFormData,
    resetForm,
  } = useEventForm({ editingItem, isOpen });

  const handleSubmit = async () => {
    const formData = getFormData();
    if (!formData) return;

    setIsSubmitting(true);
    try {
      await onSubmit([formData]);
      onClose();
      resetForm();
    } catch {
      // Error ya manejado en getFormData
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tipos de evento disponibles
  const EVENT_TYPES = [
    { value: 'CANJE', label: 'Canje', icon: '🔄', color: 'blue' },
    { value: 'MERMA', label: 'Merma', icon: '📉', color: 'rose' },
    { value: 'DIF. PED.', label: 'Dif. Pedido', icon: '⚠️', color: 'amber' },
    { value: 'AJUSTE', label: 'Ajuste', icon: '📊', color: 'emerald' },
    { value: 'DEVOLUCION', label: 'Devolución', icon: '↩️', color: 'blue' },
    { value: 'TRASPASO', label: 'Traspaso', icon: '🚚', color: 'amber' },
  ];

  // Opciones de destino
  const DESTINOS = [
    'BOD. 37', 'BOD. 80', 'BOD. 95', 'BOD. 98', 'BOD. 106', 'BOD. 121'
  ];

  const isValid = (product || items.length > 0) && frc && nguia;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden border-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
          style={{ maxHeight: '90vh' }}
        >
          {/* HEADER */}
          <div className={`p-6 border-b-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  <Plus className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {editingItem ? 'Editar Evento' : 'Nuevo Evento'}
                  </h2>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    registrar producto(s) con evento
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
              >
                <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className={`overflow-y-auto p-6 space-y-6`} style={{ maxHeight: 'calc(90vh - 200px)' }}>
            
            {/* DOCUMENT INFO */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <h3 className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Información del Documento
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="FRC"
                  placeholder="Ej. FRC-12345"
                  value={frc}
                  onChange={setFrc}
                  icon={<span className="text-sm">📋</span>}
                  uppercase
                  theme={theme}
                />
                <FormField
                  label="N° Documento"
                  placeholder="Ej. 001-23456"
                  value={nguia}
                  onChange={setNguia}
                  icon={<span className="text-sm">🔢</span>}
                  uppercase
                  theme={theme}
                />
                <FormField
                  label="Tipo de Evento"
                  value={eventType}
                  onChange={(v: string) => setEventType(v as EventType)}
                  icon={<AlertTriangle className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />}
                  options={EVENT_TYPES.map(e => ({ value: e.value, label: `${e.icon} ${e.label}` }))}
                  theme={theme}
                />
              </div>
            </div>

            {/* PRODUCTO */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Package className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <h3 className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Agregar Producto
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <ProductSearchInput
                    sku={sku}
                    onSkuChange={setSku}
                    product={product}
                    isSearching={isSearching}
                    quantity={quantity}
                    onQuantityChange={setQuantity}
                    onAdd={addItem}
                    theme={theme}
                    isEditing={!!editingItem}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={!product || quantity === 0}
                    className={`w-full py-4 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 ${
                      !product || quantity === 0
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* LISTA DE PRODUCTOS */}
            {items.length > 0 && (
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/30 border-white/5' : 'bg-white border-slate-200'}`}>
                <ItemList
                  items={items.map(i => ({
                    barcode: i.barcode,
                    productName: i.productName,
                    quantity: i.quantity,
                    providerName: i.providerName,
                  }))}
                  onRemove={removeItem}
                  editable={false}
                  removable={!editingItem}
                  showTotals
                  theme={theme}
                  title="Productos en este Evento"
                />
              </div>
            )}

            {/* DESTINO Y TRASPASO */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Truck className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <h3 className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Destino y Traspaso
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Destino"
                  value={destino}
                  onChange={setDestino}
                  icon={<span className="text-sm">🏭</span>}
                  options={DESTINOS.map(d => ({ value: d, label: d }))}
                  theme={theme}
                />
                <FormField
                  label="N° Traspaso"
                  placeholder="Ej. TRASP-789"
                  value={traspaso}
                  onChange={setTraspaso}
                  icon={<span className="text-sm">🚚</span>}
                  uppercase
                  theme={theme}
                />
              </div>
            </div>

            {/* OBSERVACIONES */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
              <FormField
                label="Observaciones"
                placeholder="Ej. Producto en mal estado por humedad..."
                value={observaciones}
                onChange={setObservaciones}
                icon={<FileText className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />}
                type="textarea"
                rows={3}
                theme={theme}
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className={`p-6 border-t-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider text-xs transition-colors ${
                  isDark 
                    ? 'bg-white/5 hover:bg-white/10 text-slate-400' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !isValid}
                className={`flex-[2] py-4 rounded-xl font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 ${
                  isSubmitting || !isValid
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {editingItem ? '💾' : '+'}
                    {editingItem ? 'Guardar Cambios' : (
                      <>
                        <span>Registrar {items.length + (product ? 1 : 0)} Producto(s)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
