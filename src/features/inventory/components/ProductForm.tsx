
import React, { useEffect } from 'react';
import { Product } from '../../../types';
import { Pencil, Plus, Save, Box, ScanLine, Copy } from 'lucide-react';
import { useProductForm } from '../hooks/useProductForm';
import { Modal } from '../../../shared/components/ui/Modal';
import { SettingsButton, SettingsInput } from '../../settings/components/common/SettingsElements';
import { useProvidersQuery } from '../../suppliers/hooks/useProvidersQuery';

interface ProductFormProps {
 isOpen: boolean;
 onClose: () => void;
 initialData: Product | null;
 onSaveSuccess: (msg: string) => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, initialData, onSaveSuccess }) => {
  const { formData, error, isSaving, isDuplicating, updateField, handleDuplicate, handleSave } = useProductForm({
    initialData, onSaveSuccess, onClose
  });

  const { filteredProviders } = useProvidersQuery();

  const handleProviderSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rut = e.target.value;
    const provider = filteredProviders.find(p => p.rut === rut);
    if (provider) {
      updateField('supplierRut', provider.rut);
      updateField('supplier', provider.name);
      if (provider.withdrawalDays) updateField('withdrawalDays', provider.withdrawalDays);
      updateField('hasExchange', !!provider.hasExchange);
    } else {
      updateField('supplierRut', rut);
    }
  };

  const title = isDuplicating ? 'Duplicar Producto' : (initialData ? 'Editar SKU' : 'Nuevo SKU');
  const icon = isDuplicating ? <Copy className="w-6 h-6" /> : (initialData ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />);

  return (
  <Modal isOpen={isOpen} onClose={onClose} variant="side-drawer" className="md:max-w-md" showCloseButton={true}>
  <div className="px-8 pt-8 pb-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-900 leading-none tracking-tight">{title}</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Ficha Maestra de Producto</p>
      </div>
    </div>
    {initialData && !isDuplicating && (
      <button
        type="button"
        onClick={handleDuplicate}
        className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
        title="Duplicar con nuevo SKU"
      >
        <Copy className="w-4 h-4" />
        <span className="hidden sm:inline">Duplicar</span>
      </button>
    )}
  </div>

 <form onSubmit={handleSave} className="px-8 pb-8 space-y-5">
 
 <div className="space-y-1.5">
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de Barras</label>
 <div className="relative">
 <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
 <input
 required
 disabled={!!initialData && !isDuplicating}
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
 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor Maestro</label>
 <select
   value={formData.supplierRut || ''}
   onChange={handleProviderSelect}
   className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all cursor-pointer"
 >
   <option value="">Seleccionar Proveedor Maestro...</option>
   {filteredProviders.map(p => (
     <option key={p.rut} value={p.rut}>
       {p.name}
     </option>
   ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
   <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUT Proveedor</label>
    <div className="relative">
     <input
      value={formData.supplierRut || ''}
      onChange={(e) => updateField('supplierRut', e.target.value)}
      className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
      placeholder="Ej: 12345678-9"
     />
     <div className="absolute right-4 top-1/2 -translate-y-1/2">
      <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded-lg uppercase">ID LOG</span>
     </div>
    </div>
   </div>
   <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
    <SettingsInput 
     value={formData.supplier || ''}
     onChange={(e: any) => updateField('supplier', e.target.value)}
     placeholder="Nombre"
    />
   </div>
 </div>

 <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/10 space-y-4">
  <p className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
   <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
   Logística del Proveedor
  </p>
  
  <div className="grid grid-cols-2 gap-4">
   <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Días de Retiro</label>
    <input 
     type="number"
     placeholder="Defecto (30)"
     value={(formData as any).withdrawalDays === '' ? '' : (formData as any).withdrawalDays}
     onChange={(e) => updateField('withdrawalDays', e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
     className="w-full h-11 px-4 bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-500/20 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
    />
   </div>
   <div className="space-y-1.5 flex flex-col justify-center pt-5">
    <label className="flex items-center gap-3 cursor-pointer group">
     <div 
      onClick={() => updateField('hasExchange', !(formData as any).hasExchange)}
      className={`w-12 h-6 rounded-full transition-all relative ${
       (formData as any).hasExchange ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
      }`}
     >
      <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all ${
       (formData as any).hasExchange ? 'left-7' : 'left-1'
      }`} />
     </div>
     <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
      {(formData as any).hasExchange ? 'Tiene Canje' : 'Es Merma'}
     </span>
    </label>
   </div>
  </div>
  <p className="text-[8px] font-medium text-indigo-400 dark:text-indigo-500/60 leading-tight italic px-1">
   * Al modificar estos valores, se actualizará la política general para TODOS los productos de este proveedor.
  </p>
 </div>

 {error && (
 <div className="bg-rose-50 text-rose-600 text-xs font-bold p-4 rounded-2xl animate-in shake border border-rose-100 text-center">
 {error}
 </div>
 )}

 <div className="pt-2">
 <SettingsButton 
 type="submit" 
 label={isDuplicating ? "Crear Duplicado" : (initialData ? "Guardar Cambios" : "Crear Producto")} 
 icon={isDuplicating ? Copy : Save} 
 isLoading={isSaving} 
 variant="primary" 
 />
 </div>
 </form>
 </Modal>
 );
};

