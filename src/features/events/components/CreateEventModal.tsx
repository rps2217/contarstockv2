/**
 * CreateEventModal - Modal para crear/editar eventos
 * 
 * Arquitectura Lego: Delega toda la lógica al hook useEventForm
 * y rendering a componentes especializados.
 * 
 * Antes: ~600 líneas
 * Después: ~300 líneas
 */

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEventForm } from '../hooks/useEventForm';
import { EventFormHeader } from './EventFormHeader';
import { EventMainFields } from './EventMainFields';
import { ProductSearchInput } from './ProductSearchInput';

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
  const [showAdditional, setShowAdditional] = useState(false);
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
          className={`relative w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-black flex flex-col ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}
        >
          {/* HEADER */}
          <EventFormHeader 
            isEditing={!!editingItem} 
            onClose={onClose} 
            theme={theme} 
          />

          {/* CONTENT */}
          <div className="flex flex-col md:flex-row overflow-hidden min-h-[500px] max-h-[85vh]">
            {/* LEFT PANEL - MAIN INFO */}
            <div className={`flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 ${showAdditional ? 'md:border-r-4 border-black' : ''}`}>
              <div className="space-y-6">
                {/* SHARED HEADER INFO */}
                <EventMainFields
                  frc={frc}
                  onFrcChange={setFrc}
                  nguia={nguia}
                  onNguiaChange={setNguia}
                  eventType={eventType}
                  onEventTypeChange={setEventType}
                  theme={theme}
                />

                {/* ITEM BUILDER / SKU INPUT */}
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

                {/* ITEMS LIST */}
                {items.length > 0 && (
                  <ItemsList 
                    items={items} 
                    onRemove={removeItem} 
                    theme={theme}
                    isEditing={!!editingItem}
                  />
                )}
              </div>
            </div>

            {/* DESKTOP RIGHT PANEL - ADDITIONAL INFO */}
            <AnimatePresence>
              {showAdditional && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 384, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="hidden md:flex flex-col bg-black/5 overflow-y-auto no-scrollbar shrink-0"
                >
                  <AdditionalFieldsPanel
                    destino={destino}
                    onDestinoChange={setDestino}
                    traspaso={traspaso}
                    onTraspasoChange={setTraspaso}
                    observaciones={observaciones}
                    onObservacionesChange={setObservaciones}
                    onClose={() => setShowAdditional(false)}
                    theme={theme}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FOOTER */}
          <div className={`p-6 border-t-4 border-black flex flex-col-reverse md:flex-row items-center justify-between gap-4 shrink-0 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <button
              type="button"
              onClick={() => setShowAdditional(!showAdditional)}
              className={`w-full md:w-auto text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 px-4 py-4 md:py-3 rounded-xl transition-colors ${
                theme === 'dark' ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
              }`}
            >
              {showAdditional ? 'Ocultar detalles adicionales' : 'Mostrar detalles adicionales'}
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!product && items.length === 0) || !frc || !nguia}
              className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                isSubmitting || (!product && items.length === 0) || !frc || !nguia
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {editingItem ? '💾' : '+'}
                  {editingItem ? 'Guardar Cambios' : `Registrar ${items.length + (product ? 1 : 0)} Productos`}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

interface ItemsListProps {
  items: Array<{ barcode: string; productName: string; providerName?: string; quantity: number }>;
  onRemove: (index: number) => void;
  theme: 'dark' | 'light' | 'high-contrast';
  isEditing: boolean;
}

const ItemsList: React.FC<ItemsListProps> = ({ items, onRemove, theme, isEditing }) => (
  <div className="space-y-3">
    <h3 className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
      Productos en este registro
    </h3>
    <div className="grid grid-cols-1 gap-2">
      {items.map((item, itemIndex) => (
        <motion.div
          layout
          key={item.barcode}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`group flex items-center gap-3 p-3 rounded-xl border-2 ${
            theme === 'dark' 
              ? 'bg-black/20 border-white/5' 
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black uppercase truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {item.productName}
            </p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              {item.barcode} • {item.providerName || 'N/A'} • <span className="text-blue-500">{item.quantity} UNID</span>
            </p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => onRemove(itemIndex)}
              className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      ))}
    </div>
  </div>
);

interface AdditionalFieldsPanelProps {
  destino: string;
  onDestinoChange: (value: string) => void;
  traspaso: string;
  onTraspasoChange: (value: string) => void;
  observaciones: string;
  onObservacionesChange: (value: string) => void;
  onClose: () => void;
  theme: 'dark' | 'light' | 'high-contrast';
}

const DESTINOS_OPTIONS = [
  'BOD. 37', 'BOD. 80', 'BOD. 95', 'BOD. 98', 'BOD. 106', 'BOD. 121'
];

const AdditionalFieldsPanel: React.FC<AdditionalFieldsPanelProps> = ({
  destino,
  onDestinoChange,
  traspaso,
  onTraspasoChange,
  observaciones,
  onObservacionesChange,
  onClose,
  theme,
}) => (
  <div className="p-8 space-y-6 w-96">
    <div className="flex items-center justify-between mb-2">
      <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
        Detalles Adicionales
      </h3>
      <button
        type="button"
        onClick={onClose}
        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/5 text-slate-500'}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Destino */}
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
        🏭 Destino {traspaso && <span className="text-rose-500">*</span>}
      </label>
      <select
        value={destino}
        onChange={(e) => onDestinoChange(e.target.value)}
        className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none appearance-none ${
          theme === 'dark'
            ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
            : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
        }`}
      >
        <option value="">Seleccionar destino...</option>
        {DESTINOS_OPTIONS.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>

    {/* Traspaso */}
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
        #️⃣ Número de Traspaso
      </label>
      <input
        type="text"
        value={traspaso}
        onChange={(e) => onTraspasoChange(e.target.value.toUpperCase())}
        className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
          theme === 'dark'
            ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
            : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
        }`}
      />
    </div>

    {/* Observaciones */}
    <div className="space-y-2">
      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
        📝 Observaciones
      </label>
      <textarea
        value={observaciones}
        onChange={(e) => onObservacionesChange(e.target.value)}
        className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
          theme === 'dark'
            ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
            : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
        }`}
        rows={5}
      />
    </div>
  </div>
);
