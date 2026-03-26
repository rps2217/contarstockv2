import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Package, 
  Hash, 
  FileText, 
  Truck, 
  Plus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../db';
import { Product } from '../../../types';
import { normalizeSku } from '../../../services/utils';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    barcode: string;
    productName: string;
    event: string;
    quantity: number;
    frc: string;
    nguia: string;
    destino: string;
    traspaso: string;
    observaciones: string;
  }) => Promise<void>;
  theme: 'dark' | 'light';
  editingItem?: any;
}

const EVENT_TYPES = [
  'DIF. PED.',
  'DET. PED.',
  'VENCE CERC.',
  'DET. CALIDAD INT.',
  'DET. CALIDAD EXT.'
];

const DESTINOS = [
  'BOD. 37',
  'BOD. 80',
  'BOD. 95',
  'BOD. 98',
  'BOD. 106',
  'BOD. 121'
];

export const CreateEventModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, theme, editingItem }) => {
  const [sku, setSku] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [eventType, setEventType] = useState('DIF. PED.');
  const [quantity, setQuantity] = useState<number>(1);
  const [frc, setFrc] = useState('');
  const [nguia, setNguia] = useState('');
  const [destino, setDestino] = useState('');
  const [traspaso, setTraspaso] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showAdditional, setShowAdditional] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setSku(editingItem.barcode);
      setEventType(editingItem.event);
      setQuantity(editingItem.quantity);
      setFrc(editingItem.frc || '');
      setNguia(editingItem.nguia || '');
      setDestino(editingItem.destino || '');
      setTraspaso(editingItem.traspaso || '');
      setObservaciones(editingItem.observaciones || '');
      
      // Pre-load product info
      const loadProduct = async () => {
        const found = await db.products.get(normalizeSku(editingItem.barcode));
        if (found) setProduct(found);
        else {
          setProduct({
            barcode: editingItem.barcode,
            name: editingItem.productName,
            category: 'GENERAL'
          } as Product);
        }
      };
      loadProduct();
    } else {
      setSku('');
      setProduct(null);
      setEventType('DIF. PED.');
      setQuantity(1);
      setFrc('');
      setNguia('');
      setDestino('');
      setTraspaso('');
      setObservaciones('');
    }
  }, [editingItem, isOpen]);

  useEffect(() => {
    if (!editingItem && sku.length >= 3) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const found = await db.products.get(normalizeSku(sku));
          setProduct(found || null);
        } catch (error) {
          console.error('Error searching product:', error);
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setProduct(null);
    }
  }, [sku]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) {
      toast.error('Debes seleccionar un producto válido');
      return;
    }
    if (!frc.trim()) {
      toast.error('El número FRC es obligatorio');
      return;
    }
    if (!nguia.trim()) {
      toast.error('El número de guía es obligatorio');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        barcode: product.barcode,
        productName: product.name,
        event: eventType,
        quantity,
        frc,
        nguia,
        destino,
        traspaso,
        observaciones
      });
      toast.success(editingItem ? 'Evento actualizado correctamente' : 'Evento creado correctamente');
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Error al ${editingItem ? 'actualizar' : 'crear'} el evento`);
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
          className={`relative w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-black flex flex-col md:flex-row ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}
        >
          {/* LEFT PANEL - MAIN INFO */}
          <div className={`flex-1 flex flex-col ${showAdditional ? 'md:border-r-4 border-black' : ''}`}>
            {/* HEADER */}
            <div className="bg-black p-6 flex items-center justify-between border-b-4 border-black">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
                  {editingItem ? <FileText className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">
                    {editingItem ? 'Editar Registro' : 'Nuevo Registro'}
                  </h2>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Gestión de Eventos Críticos</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors md:hidden"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form id="event-form" onSubmit={handleSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto no-scrollbar">
              {/* PRODUCT SEARCH */}
            <div className="space-y-2">
              <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Package className="w-3 h-3" /> Producto (SKU / EAN)
              </label>
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Escanea o escribe el código..."
                  className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                  }`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <Search className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
                  )}
                </div>
              </div>

              {product && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-4 ${
                    theme === 'dark' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-black uppercase truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {product.name}
                    </p>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                      {product.barcode}
                    </p>
                  </div>
                </motion.div>
              )}
              
              {sku.length >= 3 && !product && !isSearching && (
                <div className="flex items-center gap-2 text-amber-500 p-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Producto no encontrado</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* EVENT TYPE */}
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <FileText className="w-3 h-3" /> Tipo de Evento
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none appearance-none ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                  }`}
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* QUANTITY */}
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <Hash className="w-3 h-3" /> Cantidad
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                  }`}
                />
              </div>

              {/* FRC */}
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <FileText className="w-3 h-3" /> Folio FRC
                </label>
                <input
                  type="text"
                  required
                  value={frc}
                  onChange={(e) => setFrc(e.target.value.toUpperCase())}
                  placeholder="Obligatorio"
                  className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* GUIA */}
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <Truck className="w-3 h-3" /> Número de Guía
                </label>
                <input
                  type="text"
                  required
                  value={nguia}
                  onChange={(e) => setNguia(e.target.value.toUpperCase())}
                  placeholder="Obligatorio"
                  className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                  }`}
                />
              </div>
            </div>

              {/* ADDITIONAL DETAILS TOGGLE */}
              <button
                type="button"
                onClick={() => setShowAdditional(!showAdditional)}
                className={`w-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 py-2 transition-colors md:hidden ${
                  theme === 'dark' ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'
                }`}
              >
                {showAdditional ? 'Ocultar detalles adicionales' : 'Mostrar detalles adicionales'}
              </button>

              {/* MOBILE ADDITIONAL DETAILS */}
              <AnimatePresence>
                {showAdditional && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden md:hidden"
                  >
                    <div className="space-y-2">
                      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <Truck className="w-3 h-3" /> Destino
                      </label>
                      <select
                        value={destino}
                        onChange={(e) => setDestino(e.target.value)}
                        className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none appearance-none ${
                          theme === 'dark'
                            ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                            : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                        }`}
                      >
                        <option value="">Seleccionar destino...</option>
                        {DESTINOS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <Hash className="w-3 h-3" /> Número de Traspaso
                      </label>
                      <input
                        type="text"
                        value={traspaso}
                        onChange={(e) => setTraspaso(e.target.value.toUpperCase())}
                        className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                          theme === 'dark'
                            ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                            : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                        }`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <FileText className="w-3 h-3" /> Observaciones
                      </label>
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                          theme === 'dark'
                            ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                            : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                        }`}
                        rows={3}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                form="event-form"
                disabled={isSubmitting || !product || !frc || !nguia}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 md:hidden ${
                  isSubmitting || !product || !frc || !nguia
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {editingItem ? <FileText className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingItem ? 'Guardar Cambios' : 'Crear Registro de Evento'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* DESKTOP RIGHT PANEL - ADDITIONAL INFO */}
          <AnimatePresence>
            {showAdditional && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="hidden md:flex flex-col w-96 bg-black/5"
              >
                <div className="bg-black p-6 flex items-center justify-between border-b-4 border-black">
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter italic leading-none">
                    Detalles Adicionales
                  </h3>
                  <button 
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div className="p-8 space-y-6 flex-1 overflow-y-auto no-scrollbar">
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <Truck className="w-3 h-3" /> Destino
                    </label>
                    <select
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none appearance-none ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                          : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                      }`}
                    >
                      <option value="">Seleccionar destino...</option>
                      {DESTINOS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <Hash className="w-3 h-3" /> Número de Traspaso
                    </label>
                    <input
                      type="text"
                      value={traspaso}
                      onChange={(e) => setTraspaso(e.target.value.toUpperCase())}
                      className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                          : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <FileText className="w-3 h-3" /> Observaciones
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                          : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                      }`}
                      rows={5}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DESKTOP FOOTER ACTIONS (when additional details are hidden) */}
          {!showAdditional && (
            <div className="hidden md:block absolute bottom-8 left-8 right-8">
              <button
                type="button"
                onClick={() => setShowAdditional(true)}
                className={`w-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 py-2 mb-4 transition-colors ${
                  theme === 'dark' ? 'text-slate-500 hover:text-blue-400' : 'text-slate-400 hover:text-blue-600'
                }`}
              >
                Mostrar detalles adicionales
              </button>
              <button
                type="submit"
                form="event-form"
                disabled={isSubmitting || !product || !frc || !nguia}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                  isSubmitting || !product || !frc || !nguia
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {editingItem ? <FileText className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingItem ? 'Guardar Cambios' : 'Crear Registro de Evento'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* DESKTOP FOOTER ACTIONS (when additional details are shown) */}
          {showAdditional && (
            <div className="hidden md:block absolute bottom-8 right-8 w-80">
              <button
                type="submit"
                form="event-form"
                disabled={isSubmitting || !product || !frc || !nguia}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                  isSubmitting || !product || !frc || !nguia
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {editingItem ? <FileText className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {editingItem ? 'Guardar Cambios' : 'Crear Registro de Evento'}
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
