import React, { useState, useEffect } from 'react';
import { X, Save, Package, Calendar, Hash, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { db } from '../../../db';
import { normalizeSku } from '../../../services/utils';

interface ExpiryAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    barcode: string;
    productName: string;
    mm: number;
    yyyy: number;
    quantity: number;
  }) => Promise<void>;
  theme: 'dark' | 'light';
}

export const ExpiryAddModal: React.FC<ExpiryAddModalProps> = ({ isOpen, onClose, onAdd, theme }) => {
  const [barcode, setBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [mm, setMm] = useState<number | null>(null);
  const [yyyy, setYyyy] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  // Buscar producto al cambiar el código
  useEffect(() => {
    const searchProduct = async () => {
      if (barcode.length >= 3) {
        const product = await db.products.get(normalizeSku(barcode));
        if (product) {
          setProductName(product.name);
        }
      }
    };
    searchProduct();
  }, [barcode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode || !productName || mm === null || yyyy === null) {
      toast.error('Por favor complete todos los campos obligatorios (Código, Nombre, Mes y Año)');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAdd({
        barcode: normalizeSku(barcode),
        productName,
        mm,
        yyyy,
        quantity: 1 // Enviamos 1 por defecto internamente
      });
      onClose();
      // Reset form
      setBarcode('');
      setProductName('');
      setMm(null);
      setYyyy(null);
    } catch (error) {
      // Error handled in hook
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
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={`relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border ${
            theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          {/* HEADER */}
          <div className={`p-6 border-b flex items-center justify-between ${
            theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Package className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className={`text-lg font-black uppercase tracking-tighter italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Nuevo Vencimiento
                </h2>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Registro Directo en Nube</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* BARCODE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Código de Barras *</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  autoFocus
                  required
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Escanear o escribir..."
                  className={`w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-bold border transition-all outline-none ${
                    theme === 'dark' 
                      ? 'bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:bg-white/10' 
                      : 'bg-slate-100 border-slate-200 text-slate-900 focus:border-amber-500/50 focus:bg-white'
                  }`}
                />
              </div>
            </div>

            {/* PRODUCT NAME */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Descripción del Producto *</label>
              <input 
                required
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Nombre del producto..."
                className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border transition-all outline-none ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/10 text-white focus:border-amber-500/50 focus:bg-white/10' 
                    : 'bg-slate-100 border-slate-200 text-slate-900 focus:border-amber-500/50 focus:bg-white'
                }`}
              />
            </div>

            {/* MONTH SELECTION (MM) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                Mes (MM) *
                {mm === null && <span className="text-rose-500 animate-pulse text-[8px]">(Obligatorio)</span>}
              </label>
              <div className="grid grid-cols-6 gap-2">
                {months.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMm(m)}
                    className={`h-12 rounded-xl text-sm font-black transition-all border ${
                      mm === m
                        ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105'
                        : theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* YEAR SELECTION (YYYY) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                Año (YYYY) *
                {yyyy === null && <span className="text-rose-500 animate-pulse text-[8px]">(Obligatorio)</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYyyy(y)}
                    className={`flex-1 min-w-[80px] h-12 rounded-xl text-sm font-black transition-all border ${
                      yyyy === y
                        ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105'
                        : theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-amber-500/20 mt-4"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSubmitting ? 'Guardando...' : 'Registrar Vencimiento'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
