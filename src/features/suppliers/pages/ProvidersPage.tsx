import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Search, Plus, ShieldAlert, AlertTriangle, CheckCircle2, ChevronRight, Edit2, Trash2, Wand2, UploadCloud } from 'lucide-react';
import { Provider } from '../../../types';
import { ProviderRepository } from '../../../repositories/ProviderRepository';
import { db } from '../../../db';
import { toast } from 'sonner';
import { ProviderFormModal } from '../components/ProviderFormModal';
import { syncProvidersToCloud } from '../../../services/cloudSync';

export const ProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | undefined>(undefined);

  const loadProviders = async () => {
    const data = await ProviderRepository.getAll();
    // Sort by name
    data.sort((a, b) => a.name.localeCompare(b.name));
    setProviders(data);
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  };

  const handleDelete = async (rut: string) => {
    if (confirm('¿Estás seguro de eliminar este proveedor? Esto afectará el cálculo de vencimientos de sus productos.')) {
      await ProviderRepository.delete(rut);
      toast.success('Proveedor eliminado');
      loadProviders();
    }
  };

  const handleSave = async (provider: Provider) => {
    await ProviderRepository.save(provider);
    toast.success('Proveedor guardado exitosamente');
    setIsFormOpen(false);
    loadProviders();
  };

  const handleAutoFill = async () => {
    if (!confirm('¿Deseas extraer los proveedores de tu catálogo de productos actual? Se agregarán con la política por defecto (Canje: Sí, 90 días).')) return;
    
    const products = await db.products.toArray();
    const existingProviders = await ProviderRepository.getAll();
    const existingRuts = new Set(existingProviders.map(p => p.rut));
    
    const newProvidersMap = new Map<string, Provider>();
    
    products.forEach(p => {
      if (p.supplier && p.supplier.trim() !== '' && p.supplier.trim().toUpperCase() !== 'N/A') {
        const rut = p.supplierRut || `GEN-${p.supplier.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
        if (!existingRuts.has(rut) && !newProvidersMap.has(rut)) {
          newProvidersMap.set(rut, {
            rut,
            name: p.supplier.trim().toUpperCase(),
            hasExchange: true,
            withdrawalDays: 90
          });
        }
      }
    });
    
    const newProviders = Array.from(newProvidersMap.values());
    if (newProviders.length > 0) {
      await db.providers.bulkPut(newProviders);
      toast.success(`Se agregaron ${newProviders.length} proveedores desde el catálogo.`);
      loadProviders();
    } else {
      toast.info('No se encontraron proveedores nuevos en el catálogo.');
    }
  };

  const handleSyncToCloud = async () => {
    try {
      const allProviders = await ProviderRepository.getAll();
      if (allProviders.length === 0) {
        toast.info('No hay proveedores para sincronizar.');
        return;
      }
      toast.loading('Sincronizando proveedores a la nube...');
      await syncProvidersToCloud(allProviders);
      toast.dismiss();
      toast.success('Proveedores sincronizados exitosamente.');
    } catch (e: any) {
      toast.dismiss();
      toast.error('Error al sincronizar: ' + e.message);
    }
  };

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.rut.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <Truck className="w-7 h-7 text-indigo-600" />
              Proveedores y Canjes
            </h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              Políticas de Logística Inversa
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToCloud}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-200 transition-colors"
            >
              <UploadCloud className="w-5 h-5" />
              <span className="hidden sm:inline">Sincronizar Nube</span>
            </button>
            <button
              onClick={handleAutoFill}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              <Wand2 className="w-5 h-5" />
              <span className="hidden sm:inline">Autocompletar</span>
            </button>
            <button
              onClick={() => { setEditingProvider(undefined); setIsFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nuevo Proveedor</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o RUT..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-sm font-medium text-slate-900 transition-all outline-none border-2"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredProviders.map(provider => (
              <motion.div
                key={provider.rut}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-lg leading-tight">{provider.name}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">RUT: {provider.rut}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(provider)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(provider.rut)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Política de Canje</span>
                    {provider.hasExchange ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-md">
                        <AlertTriangle className="w-3 h-3" /> Sin Canje
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700">
                        {provider.withdrawalDays || 0} Días
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Anticipación de Retiro
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredProviders.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Truck className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-black text-slate-700 uppercase">Sin Proveedores</h3>
              <p className="text-sm font-medium text-slate-500 max-w-sm mt-2">
                No se encontraron proveedores. Agrega uno nuevo para configurar sus políticas de canje y retiro.
              </p>
            </div>
          )}
        </div>
      </div>

      <ProviderFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        initialData={editingProvider}
      />
    </div>
  );
};
