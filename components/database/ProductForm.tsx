
import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { X, Pencil, Plus, Save } from 'lucide-react';
import * as productService from '../../services/productService';
import { sanitizeBarcode } from '../../services/utils';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Product | null;
  onSaveSuccess: (msg: string) => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, initialData, onSaveSuccess }) => {
  const [formData, setFormData] = useState<Product>({ barcode: '', name: '', category: '', supplier: '', supplierRut: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({ barcode: '', name: '', category: '', supplier: '', supplierRut: '' });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.barcode || !formData.name) {
        setError('El código y el nombre son obligatorios.');
        return;
    }

    try {
      const cleanBarcode = sanitizeBarcode(formData.barcode);
      await productService.saveProduct({ ...formData, barcode: cleanBarcode });
      onSaveSuccess(initialData ? 'Producto actualizado' : 'Producto creado');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {initialData ? <Pencil className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
            {initialData ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <p className="text-sm text-slate-500">Complete la información del SKU.</p>
        </div>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Código de Barras</label>
            <input
              required
              disabled={!!initialData}
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 disabled:bg-slate-100"
              placeholder="Ej. 780123456789"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Descripción</label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Nombre del producto"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Mundo / Categoría</label>
              <input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Ej. LACTEOS"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Proveedor</label>
              <input
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Nombre Prov."
              />
            </div>
          </div>

          {error && (
             <div className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">
                 {error}
             </div>
          )}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
            <Save className="w-5 h-5" /> Guardar Producto
          </button>
        </form>
      </div>
    </div>
  );
};
