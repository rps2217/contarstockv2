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
  onSubmit: (data: Array<{
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
  }>) => Promise<void>;
  theme: 'dark' | 'light';
  editingItem?: any;
}

const EVENT_TYPES = [
  'DIF. PED.',
  'DET. PED.',
  'VENCE CERC.',
  'DET. CALIDAD INT.',
  'DET. CALIDAD EXT.',
  'CANJES',
  'MERMAS'
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
  const [items, setItems] = useState<Array<{ barcode: string; productName: string; providerName?: string; quantity: number }>>([]);

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
      setItems([]); // Clear items when editing
      
      // Pre-load product info
      const loadProduct = async () => {
        const found = await db.products.get(normalizeSku(editingItem.barcode));
        if (found) setProduct(found);
        else {
          setProduct({
            barcode: editingItem.barcode,
            name: editingItem.productName,
            supplier: editingItem.providerName,
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
    if (sku.length >= 3) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const found = await db.products.get(normalizeSku(sku));
          if (found) {
            setProduct(found);
          } else if (editingItem && sku === editingItem.barcode) {
             // Keep existing product info if it's the original SKU and not in local DB
             setProduct({
               barcode: editingItem.barcode,
               name: editingItem.productName,
               supplier: editingItem.providerName,
               category: 'GENERAL'
             } as Product);
          } else {
            setProduct(null);
          }
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
  }, [sku, editingItem]);

  const addItem = () => {
    if (!product) {
      toast.error('Selecciona un producto válido');
      return;
    }
    if (quantity === 0) {
      toast.error('La cantidad no puede ser 0');
      return;
    }

    // Evitar duplicados en la lista local
    if (items.some(item => item.barcode === product.barcode)) {
      toast.error('Este producto ya está en la lista');
      return;
    }

    setItems(prev => [...prev, {
      barcode: product.barcode,
      productName: product.name,
      providerName: product.supplier || 'N/A',
      quantity
    }]);

    // Limpiar campos de producto para el siguiente
    setSku('');
    setProduct(null);
    setQuantity(1);
    toast.success('Producto añadido a la lista');
  };

  const removeItem = (barcode: string) => {
    setItems(prev => prev.filter(item => item.barcode !== barcode));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalItems = [...items];
    
    // Si hay un producto seleccionado actualmente que no se ha añadido a la lista, lo incluimos
    if (product && !items.some(item => item.barcode === product.barcode)) {
      finalItems.push({
        barcode: product.barcode,
        productName: product.name,
        providerName: product.supplier || 'N/A',
        quantity
      });
    }

    if (finalItems.length === 0) {
      toast.error('Debes agregar al menos un producto');
      return;
    }

    if (finalItems.some(item => item.quantity === 0)) {
      toast.error('La cantidad no puede ser 0');
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

    if (traspaso.trim() && !destino.trim()) {
      toast.error('El destino es obligatorio cuando hay un número de traspaso');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = finalItems.map(item => ({
        ...item,
        event: eventType,
        frc,
        nguia,
        destino,
        traspaso,
        observaciones
      }));

      await onSubmit(payload);
      toast.success(editingItem ? 'Evento actualizado correctamente' : `${finalItems.length} registros creados correctamente`);
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
          className={`relative w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-black flex flex-col ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-white'
          }`}
        >
          {/* HEADER (Full width) */}
          <div className="bg-black p-6 flex items-center justify-between border-b-4 border-black shrink-0">
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
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row overflow-hidden min-h-[500px] max-h-[85vh]">
            {/* LEFT PANEL - MAIN INFO */}
            <div className={`flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 ${showAdditional ? 'md:border-r-4 border-black' : ''}`}>
              <div className="space-y-6">
                {/* SHARED HEADER INFO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-3xl bg-black/5 border-2 border-black/10">
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
                      className={`w-full px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all outline-none ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                          : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <Truck className="w-3 h-3" /> Guía
                    </label>
                    <input
                      type="text"
                      required
                      value={nguia}
                      onChange={(e) => setNguia(e.target.value.toUpperCase())}
                      placeholder="Obligatorio"
                      className={`w-full px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all outline-none ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                          : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <FileText className="w-3 h-3" /> Evento
                    </label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all outline-none appearance-none ${
                        theme === 'dark'
                          ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                          : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
                      }`}
                    >
                      {EVENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ITEM BUILDER / SKU INPUT */}
                <div className={`p-6 rounded-[2rem] border-4 border-black space-y-4 ${
                  theme === 'dark' ? 'bg-blue-500/5' : 'bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                      {editingItem ? 'Información del Producto' : 'Agregar Productos'}
                    </h3>
                    {!editingItem && (
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {items.length} en lista
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-7 space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="SKU / EAN..."
                          className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                            theme === 'dark'
                              ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                              : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
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
                    </div>

                    <div className="md:col-span-3 space-y-2">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all outline-none ${
                          theme === 'dark'
                            ? 'bg-black/40 border-white/10 focus:border-blue-500 text-white'
                            : 'bg-white border-slate-200 focus:border-blue-500 text-slate-900'
                        }`}
                      />
                    </div>

                    {!editingItem && (
                      <div className="md:col-span-2">
                        <button
                          type="button"
                          onClick={addItem}
                          disabled={!product}
                          className={`w-full h-full flex items-center justify-center rounded-2xl transition-all ${
                            !product 
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                              : 'bg-black text-white hover:bg-slate-800 active:scale-95'
                          }`}
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      </div>
                    )}
                  </div>

                  {product && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl border-2 flex items-center gap-3 ${
                        theme === 'dark' ? 'bg-black/40 border-blue-500/30' : 'bg-white border-blue-200 shadow-sm'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-black uppercase truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {product.name}
                        </p>
                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">
                          {product.barcode} • {product.supplier || 'N/A'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ITEMS LIST */}
                {items.length > 0 && (
                  <div className="space-y-3">
                    <h3 className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                      Productos en este registro
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {items.map((item) => (
                        <motion.div
                          layout
                          key={item.barcode}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`group flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                            theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-black uppercase truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {item.productName}
                              </p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                {item.barcode} • {item.providerName || 'N/A'} • <span className="text-blue-500">{item.quantity} UNID</span>
                              </p>
                            </div>
                          </div>
                          {!editingItem && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.barcode)}
                              className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}


                <form id="event-form" onSubmit={handleSubmit} className="hidden" />
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
                  <div className="p-8 space-y-6 w-96">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Detalles Adicionales
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAdditional(false)}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-black/5 text-slate-500'}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <Truck className="w-3 h-3" /> Destino {traspaso.trim() && <span className="text-rose-500">*</span>}
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
              type="submit"
              form="event-form"
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
                  {editingItem ? <FileText className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
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

// Forced GitHub sync
