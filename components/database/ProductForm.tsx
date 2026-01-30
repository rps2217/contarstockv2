import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { Pencil, Plus, Save, Box, ScanLine } from 'lucide-react';
import * as productService from '../../services/productService';
import { sanitizeBarcode } from '../../services/utils';
import { Modal } from '../common/Modal';

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
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        className="md:max-w-md"
        showCloseButton={true}
    >
        <div className="px-8 pt-8 pb-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                {initialData ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none">{initialData ? 'Editar SKU' : 'Nuevo SKU'}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Ficha Maestra de Producto</p>
            </div>
        </div>

        <form onSubmit={handleSave} className="px-8 pb-8 space-y-5">
            
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de Barras</label>
                <div className="relative">
                    <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                        required
                        disabled={!!initialData}
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-transparent rounded-2xl font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300 disabled:opacity-60 disabled:bg-slate-100"
                        placeholder="EAN / SKU"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                <div className="relative">
                    <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                        placeholder="Nombre del producto"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mundo</label>
                    <input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full h-14 px-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                        placeholder="Categoría"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
                    <input
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full h-14 px-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
                        placeholder="Nombre"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 text-rose-600 text-xs font-bold p-4 rounded-2xl animate-in shake border border-rose-100 text-center">
                    {error}
                </div>
            )}

            <div className="pt-2">
                <button type="submit" className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                    <Save className="w-5 h-5" /> Guardar Cambios
                </button>
            </div>
        </form>
    </Modal>
  );
};