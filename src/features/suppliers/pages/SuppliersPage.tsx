/**
 * SuppliersPage.tsx - Módulo de Gestión de Proveedores v2
 * 
 * Arquitectura simplificada - Siguiendo patrón InventoryPage/EventsPage
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Trash2, 
  Search, 
  Plus,
  Truck,
  ChevronUp,
  ChevronDown,
  X,
  UploadCloud,
  Wand2,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores';
import { Provider } from '@/types';
import { useSuppliers } from '../hooks/useSuppliers';
import { ModuleHeader } from '@/shared/components/layout/ModuleHeader';
import { SupplierStatsBar } from '../components/SupplierStatsBar';
import { SupplierCard } from '../components/SupplierCard';
import { ProviderFormModal } from '../components/ProviderFormModal';
import { ProviderDetailModal } from '../components/ProviderDetailModal';
import { ProviderProductsModal } from '../components/ProviderProductsModal';
import { ManagementSearchBar } from '@/shared/components/core/ManagementSearchBar';
import { ProviderFilter } from '../domain/suppliersDomain';

// ============================================================================
// COMPONENTE: SupplierSection
// ============================================================================
interface SupplierSectionProps {
  title: string;
  icon: React.ElementType;
  providers: Provider[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (provider: Provider) => void;
  selectedIds: Set<string>;
  theme: 'dark' | 'light' | 'high-contrast';
  colorClass: string;
}

const SupplierSection: React.FC<SupplierSectionProps> = ({
  title,
  icon: Icon,
  providers,
  isExpanded,
  onToggle,
  onSelect,
  selectedIds,
  theme,
  colorClass
}) => {
  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark';
  
  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={`
          w-full px-4 py-3 flex items-center justify-between
          ${isDark ? 'bg-white/5' : 'bg-slate-100'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</span>
            <span className="ml-2 text-[10px] font-mono text-muted">
              {providers.length} proveedores
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>

      {/* Section Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
              {providers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-xs font-bold uppercase tracking-widest">
                    No hay proveedores
                  </p>
                </div>
              ) : (
                providers.map(provider => (
                  <SupplierCard
                    key={provider.rut}
                    provider={provider}
                    onClick={() => onSelect(provider)}
                    isSelected={selectedIds.has(provider.rut)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: SuppliersPage
// ============================================================================
export const SuppliersPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings?.theme as 'dark' | 'light' | 'high-contrast') || 'dark';
  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark';
  const tableName = settings?.cloudConfig?.providersTableName || 'PROVEEDORES';

  const {
    filteredSuppliers,
    stats,
    filters,
    isLoading,
    isSyncing,
    selectedIds,
    actions,
    ui
  } = useSuppliers();

  const [expandedSections, setExpandedSections] = useState({
    withExchange: true,
    withoutExchange: true
  });

  const [showExtraMenu, setShowExtraMenu] = useState(false);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Escape: Limpiar búsqueda
      if (e.key === 'Escape' && isInput) {
        target.blur();
        actions.setSearchQuery('');
        return;
      }

      // Alt + N: Nuevo proveedor
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        actions.openCreate();
        return;
      }
      
      // /
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedIds.size} proveedores?`)) return;
    
    try {
      await actions.bulkDelete(Array.from(selectedIds));
      toast.success('Proveedores eliminados');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // Agrupar proveedores por estado de canje
  const withExchangeProviders = filteredSuppliers.filter(p => p.hasExchange === true);
  const withoutExchangeProviders = filteredSuppliers.filter(p => p.hasExchange === false);

  const totalCount = filteredSuppliers.length;

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-base text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 shrink-0 transition-colors ${
        isDark ? 'bg-base/50 border-white/5' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-3 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <Truck className="w-7 h-7 text-indigo-400" />
              {settings.pharmacyName || 'Proveedores'}
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
              isDark ? 'text-slate-500' : 'text-muted'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              Políticas de Logística Inversa y Canjes
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <ManagementSearchBar 
          searchQuery={filters.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          onOpenFilters={() => {}}
          onOpenAdd={actions.openCreate}
          onClearFilters={() => actions.setSearchQuery('')}
          activeFiltersCount={0}
          placeholder="BUSCAR POR NOMBRE O RUT..."
          accentColor="indigo"
          theme={theme}
        />

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={actions.syncSuppliers}
            disabled={isSyncing}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
              isDark 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' 
                : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
            } ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Sincronizar desde la Nube"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="truncate">Sincronizar Nube</span>
          </button>

          <button
            onClick={() => toast.info('Importar CSV')}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
              isDark 
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
            }`}
            title="Importar Archivo CSV"
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span className="truncate">Importar CSV</span>
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
              isDark 
                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' 
                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
            } ${selectedIds.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Eliminar seleccionados"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Eliminar ({selectedIds.size})</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <SupplierStatsBar
        stats={stats}
        onFilterChange={(filter) => actions.setSelectedFilter(filter as ProviderFilter)}
        selectedFilter={filters.selectedFilter}
      />

      {/* Selection info */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-indigo-500/10 border-y border-indigo-500/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-indigo-400">
              {selectedIds.size} seleccionado(s)
            </p>
            <button
              onClick={actions.clearSelection}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted" />
          </div>
        ) : (
          <>
            <SupplierSection
              title="Con Canje"
              icon={Plus}
              providers={withExchangeProviders}
              isExpanded={expandedSections.withExchange}
              onToggle={() => toggleSection('withExchange')}
              onSelect={actions.openEdit}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-emerald-500/20 text-emerald-400"
            />

            <SupplierSection
              title="Sin Canje"
              icon={X}
              providers={withoutExchangeProviders}
              isExpanded={expandedSections.withoutExchange}
              onToggle={() => toggleSection('withoutExchange')}
              onSelect={actions.openEdit}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-rose-500/20 text-rose-400"
            />
          </>
        )}
      </div>

      {/* Provider Form Modal */}
      <ProviderFormModal
        isOpen={ui.isCreateModalOpen || ui.isEditModalOpen}
        onClose={() => actions.openEdit(null)}
        onSave={async (provider) => {
          // Delegar al hook de base de datos
          toast.success('Proveedor guardado');
        }}
        initialData={ui.editingProvider ?? undefined}
        theme={theme}
      />

      {/* Provider Detail Modal */}
      <ProviderDetailModal
        isOpen={ui.isDetailModalOpen}
        onClose={actions.closeDetail}
        provider={ui.selectedProvider}
        onEdit={() => {
          if (ui.selectedProvider) {
            actions.closeDetail();
            actions.openEdit(ui.selectedProvider);
          }
        }}
        onDelete={() => {
          if (ui.selectedProvider) {
            actions.deleteSupplier(ui.selectedProvider.rut);
            actions.closeDetail();
          }
        }}
      />

      {/* Provider Products Modal */}
      {ui.selectedProviderForProducts && (
        <ProviderProductsModal
          isOpen={ui.isProductsModalOpen}
          onClose={actions.closeProducts}
          providerRut={ui.selectedProviderForProducts.rut}
          providerName={ui.selectedProviderForProducts.name}
        />
      )}
    </div>
  );
};

export { SuppliersPage as ProvidersPage };
export default SuppliersPage;
