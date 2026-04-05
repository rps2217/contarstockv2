
import React from 'react';
import { Product } from '../../../types';
import { Pencil, Plus, Save, Box, ScanLine } from 'lucide-react';
import { useProductForm } from '../hooks/useProductForm';
import { Modal } from '../../../shared/components/ui/Modal';
import { SettingsButton, SettingsInput } from '../../settings/components/common/SettingsElements';

interface ProductFormProps {
 isOpen: boolean;
 onClose: () => void;
 initialData: Product | null;
 onSaveSuccess: (msg: string) => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, initialData, onSaveSuccess }) => {
 const { formData, error, isSaving, updateField, handleSave } = useProductForm({
 initialData, onSaveSuccess, onClose
 });

 return (
 <Modal isOpen={isOpen} onClose={onClose} className="md:max-w-md" showCloseButton={true}>
 <div className="px-8 pt-8 pb-4 flex items-center gap-4">
 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
 {initialData ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
 </div>
 <div>
 <h2 className="text-2xl font-black text-slate-900 leading-none tracking-tight">{initialData ? 'Editar SKU' : 'Nuevo SKU'}</h2>
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
 onChange={(e) => updateField('barcode', e.target.value)}
 className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300 disabled:opacity-60 disabled:bg-slate-100"
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
 onChange={(e) => updateField('name', e.target.value)}
 className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
 placeholder="Nombre del producto"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mundo</label>
 <SettingsInput 
 value={formData.category} 
 onChange={(e: any) => updateField('category', e.target.value)} 
 placeholder="Categoría" 
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
 <SettingsInput 
 value={formData.supplier} 
 onChange={(e: any) => updateField('supplier', e.target.value)} 
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
 <SettingsButton 
 type="submit" 
 label="Guardar Cambios" 
 icon={Save} 
 isLoading={isSaving} 
 variant="primary" 
 />
 </div>
 </form>
 </Modal>
 );
};

// Forced GitHub sync
