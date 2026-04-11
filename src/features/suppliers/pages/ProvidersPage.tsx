import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Search, Plus, ShieldAlert, AlertTriangle, CheckCircle2, ChevronRight, Edit2, Trash2, Wand2, UploadCloud } from 'lucide-react';
import { Provider } from '../../../types';
import { ProviderRepository } from '../../../repositories/ProviderRepository';
import { db } from '../../../db';
import { toast } from 'sonner';
import { ProviderFormModal } from '../components/ProviderFormModal';
import { syncProvidersToCloud } from '../../../services/cloudSync';
import { ManagementSearchBar } from '../../../shared/components/core/ManagementSearchBar';
import { useAppStore } from '../../../store/mainAppStore';

export const ProvidersPage: React.FC = () => {
  const { settings } = useAppStore();
  const theme = settings.theme;
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
    <div className={`h-full flex flex-col transition-colors duration-500 ${
      theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-brand-surface/50 border-white/5' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-3 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <Truck className="w-7 h-7 text-brand-info" />
              {settings.pharmacyName || 'Proveedores'}
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              Políticas de Logística Inversa y Canjes
            </p>
          </div>
        </div>

        <ManagementSearchBar 
          searchQuery={search}
          setSearchQuery={setSearch}
          onOpenFilters={() => {}} // No filters for now
          onOpenAdd={() => { setEditingProvider(undefined); setIsFormOpen(true); }}
          onClearFilters={() => setSearch('')}
          activeFiltersCount={0}
          placeholder="BUSCAR POR NOMBRE O RUT..."
          accentColor="indigo"
          theme={theme}
          extraActions={
            <div className="flex gap-2">
              <button
                onClick={handleSyncToCloud}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
                  theme === 'dark' ? 'bg-brand-info/10 border-brand-info/20 text-brand-info hover:bg-brand-info/20' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                }`}
                title="Sincronizar con la Nube"
              >
                <UploadCloud className="w-5 h-5" />
              </button>
              <button
                onClick={handleAutoFill}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
                  theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
                title="Autocompletar desde Catálogo"
              >
                <Wand2 className="w-5 h-5" />
              </button>
            </div>
          }
        />
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
                className={`rounded-2xl p-5 border transition-all group ${
                  theme === 'dark' ? 'bg-brand-surface border-white/5 shadow-lg' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`font-black uppercase text-lg leading-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-800'
                    }`}>{provider.name}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">RUT: {provider.rut}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(provider)} className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'text-slate-400 hover:text-brand-info bg-brand-dark hover:bg-brand-info/10' : 'text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50'
                    }`}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(provider.rut)} className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'text-slate-400 hover:text-rose-400 bg-brand-dark hover:bg-rose-400/10' : 'text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50'
                    }`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className={`rounded-xl p-4 border ${
                  theme === 'dark' ? 'bg-brand-dark border-white/5' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Política de Canje</span>
                    {provider.hasExchange ? (
                      <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${
                        theme === 'dark' ? 'text-brand-info bg-brand-info/10' : 'text-emerald-600 bg-emerald-100'
                      }`}>
                        <CheckCircle2 className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${
                        theme === 'dark' ? 'text-rose-400 bg-rose-400/10' : 'text-rose-600 bg-rose-100'
                      }`}>
                        <AlertTriangle className="w-3 h-3" /> Sin Canje
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      theme === 'dark' ? 'bg-brand-info/10' : 'bg-indigo-100'
                    }`}>
                      <ShieldAlert className={`w-5 h-5 ${theme === 'dark' ? 'text-brand-info' : 'text-indigo-600'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>
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
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                theme === 'dark' ? 'bg-brand-surface' : 'bg-slate-100'
              }`}>
                <Truck className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
              </div>
              <h3 className={`text-lg font-black uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>Sin Proveedores</h3>
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
        theme={theme}
      />
    </div>
  );
};
