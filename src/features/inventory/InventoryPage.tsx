/**
 * InventoryPage.tsx - Módulo de Gestión de Inventario v2
 * 
 * Arquitectura simplificada - Siguiendo patrón EventsPage/ExpiryPage
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Trash2, 
  Search, 
  Plus,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  MoreVertical,
  Barcode,
  MapPin,
  Printer,
  LayoutGrid,
  List
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores';
import { Product } from '@/types';
import { ProductWithPolicy } from '@/features/product/types';
import { useInventory } from './hooks/useInventory';
import { ModuleHeader } from '@/shared/components/layout/ModuleHeader';
import { ProductStatsBar } from './components/ProductStatsBar';
import { ProductCard } from './components/ProductCard';
import { ProductForm } from './components/ProductForm';
import { ImportTools } from './components/ImportTools';
import { BarcodeLabelModal } from '@/shared/components/ui/BarcodeLabelModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { thermalPrinter } from '@/services/thermalPrinterService';
import { handlePrintLabels } from '../expiry/utils/expiryUtils';
import { MassActionsPanel } from '@/shared/components/ui/MassActionsPanel';
import { InventoryKanbanView } from './components/InventoryKanbanView';
import { ProductPolicyStatus } from './domain/productsDomain';

// ============================================================================
// COMPONENTE: ProductSection
// ============================================================================
interface ProductSectionProps {
  title: string;
  icon: React.ElementType;
  products: Product[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (product: Product) => void;
  onViewDetail: (product: Product) => void;
  selectedIds: Set<string>;
  theme: 'dark' | 'light' | 'high-contrast';
  colorClass: string;
}

const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  icon: Icon,
  products,
  isExpanded,
  onToggle,
  onSelect,
  onViewDetail,
  selectedIds,
  theme,
  colorClass
}) => {
  const isDark = theme === 'dark';
  
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
            <span className="ml-2 text-[10px] font-mono text-slate-400">
              {products.length} productos
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        ) : (
          <Minus className="w-4 h-4 text-slate-400" />
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
              {products.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-xs font-bold uppercase tracking-widest">
                    No hay productos
                  </p>
                </div>
              ) : (
                products.map(product => (
                  <ProductCard
                    key={product.barcode}
                    product={product}
                    onClick={() => onViewDetail(product)}
                    isSelected={selectedIds.has(product.barcode)}
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
// COMPONENTE PRINCIPAL: InventoryPage
// ============================================================================
export const InventoryPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings?.theme as 'dark' | 'light' | 'high-contrast') || 'dark';
  const isDark = theme === 'dark';

  const {
    filteredProducts,
    stats,
    filters,
    isLoading,
    isSyncing,
    selectedIds,
    actions,
    ui
  } = useInventory();

  const [expandedSections, setExpandedSections] = useState({
    exchange: true,
    loss: true,
    noInfo: false
  });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [printingProduct, setPrintingProduct] = useState<Product | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

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

      // Alt + N: Nuevo producto
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

  const handleOpenPrint = useCallback((product: Product) => {
    setPrintingProduct(product);
    setIsLabelModalOpen(true);
  }, []);

  const handlePrintThermal = async () => {
    if (!printingProduct) return;
    setIsPrinting(true);
    try {
      if (!thermalPrinter.isConnected()) {
        toast.error('Impresora no conectada. Conéctala en Configuración.');
        return;
      }
      await thermalPrinter.printLabel(printingProduct.barcode, printingProduct.name, 1);
      toast.success('Etiqueta enviada a impresora');
    } catch (error: unknown) {
      toast.error(`Error de impresión: ${String(error)}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintPDF = () => {
    if (!printingProduct) return;
    handlePrintLabels([{ barcode: printingProduct.barcode, productName: printingProduct.name }]);
  };

  const handleMassPrint = () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }
    
    const selectedProducts = filteredProducts.filter(p => selectedIds.has(p.barcode));
    const printItems = selectedProducts.map(p => ({
      barcode: p.barcode,
      productName: p.name
    }));
    
    handlePrintLabels(printItems);
    toast.success(`Generando ${printItems.length} etiquetas`);
    actions.clearSelection();
  };

  const handleMassDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedIds.size} productos?`)) return;
    
    try {
      await actions.bulkDelete(Array.from(selectedIds));
      toast.success('Productos eliminados');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // Agrupar productos por política
  const exchangeProducts = filteredProducts.filter(p => {
    const pWithPolicy = p as ProductWithPolicy;
    return pWithPolicy.hasExchange === true || 
           (pWithPolicy.policy?.daysToExpiry && pWithPolicy.policy.daysToExpiry > 0) ||
           (pWithPolicy.withdrawalDays && pWithPolicy.withdrawalDays > 0);
  });

  const lossProducts = filteredProducts.filter(p => {
    const pWithPolicy = p as ProductWithPolicy;
    return pWithPolicy.hasExchange === false;
  });

  const noInfoProducts = filteredProducts.filter(p => {
    const pWithPolicy = p as ProductWithPolicy;
    return pWithPolicy.hasExchange === undefined && 
           !pWithPolicy.policy?.daysToExpiry && 
           !pWithPolicy.withdrawalDays;
  });

  const totalCount = filteredProducts.length;

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <ModuleHeader
        title="Inventario"
        subtitle={`${totalCount} productos`}
        hideTitleOnMobile={false}
        hideBackButtonOnMobile={true}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(v => v === 'list' ? 'kanban' : 'list')}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              title="Cambiar vista"
            >
              {viewMode === 'list' ? (
                <LayoutGrid className="w-5 h-5" />
              ) : (
                <List className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={actions.openCreate}
              className="w-10 h-10 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center transition-colors"
              title="Nuevo producto (Alt+N)"
            >
              <Plus className="w-5 h-5 text-blue-400" />
            </button>
            <button
              onClick={() => actions.syncProducts()}
              disabled={isSyncing}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Sincronizar"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleMassDelete}
              disabled={selectedIds.size === 0}
              className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Eliminar seleccionados"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
            </button>
          </div>
        }
      />

      {/* Search & Filters */}
      <div className="px-4 py-3 space-y-3">
        <div className={`
          flex items-center gap-3 px-4 py-3 rounded-2xl border
          ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}
        `}>
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nombre, barcode, categoría... (presiona /)"
            value={filters.searchQuery}
            onChange={(e) => actions.setSearchQuery(e.target.value)}
            className={`
              flex-1 bg-transparent outline-none text-sm font-medium
              ${isDark ? 'placeholder:text-slate-500 text-white' : 'placeholder:text-slate-400 text-slate-900'}
            `}
          />
          {filters.searchQuery && (
            <button
              onClick={() => actions.setSearchQuery('')}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <ProductStatsBar
          stats={{
            total: stats.total,
            byPolicy: {
              [ProductPolicyStatus.EXCHANGE]: stats.byPolicy.EXCHANGE,
              [ProductPolicyStatus.LOSS]: stats.byPolicy.LOSS,
              [ProductPolicyStatus.NO_INFO]: stats.byPolicy.NO_INFO,
              [ProductPolicyStatus.ALL]: stats.total
            },
            byStock: { NORMAL: 0, LOW: 0, CRITICAL: 0, EXCESS: 0 },
            lowStock: stats.lowStock,
            missingPolicy: stats.missingPolicy,
            syncing: 0,
            pendingChanges: stats.pendingChanges
          }}
          onPolicyFilter={actions.setSelectedPolicy}
          selectedFilter={filters.selectedPolicy}
        />
      </div>

      {/* Selection info */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-blue-500/10 border-y border-blue-500/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-400">
              {selectedIds.size} seleccionado(s)
            </p>
            <button
              onClick={actions.clearSelection}
              className="text-xs text-blue-400 hover:text-blue-300"
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
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : viewMode === 'kanban' ? (
          <InventoryKanbanView 
            products={filteredProducts as ProductWithPolicy[]}
            onItemClick={actions.openEdit}
          />
        ) : (
          <>
            <ProductSection
              title="Canje"
              icon={ArrowUpRight}
              products={exchangeProducts}
              isExpanded={expandedSections.exchange}
              onToggle={() => toggleSection('exchange')}
              onSelect={actions.openEdit}
              onViewDetail={actions.openDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-emerald-500/20 text-emerald-400"
            />

            <ProductSection
              title="Merma"
              icon={ArrowDownRight}
              products={lossProducts}
              isExpanded={expandedSections.loss}
              onToggle={() => toggleSection('loss')}
              onSelect={actions.openEdit}
              onViewDetail={actions.openDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-rose-500/20 text-rose-400"
            />

            <ProductSection
              title="Sin Info"
              icon={Minus}
              products={noInfoProducts}
              isExpanded={expandedSections.noInfo}
              onToggle={() => toggleSection('noInfo')}
              onSelect={actions.openEdit}
              onViewDetail={actions.openDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-slate-500/20 text-slate-400"
            />
          </>
        )}
      </div>

      {/* Mass Actions Panel */}
      <MassActionsPanel 
        selectedCount={selectedIds.size}
        onClear={actions.clearSelection}
        actions={[
          { label: 'Imprimir', icon: Printer, onClick: handleMassPrint, variant: 'warning' },
          { label: 'Borrar', icon: Trash2, onClick: handleMassDelete, variant: 'danger' }
        ]}
      />

      {/* Product Form Modal */}
      <ProductForm
        isOpen={ui.isCreateModalOpen || ui.isEditModalOpen}
        onClose={() => actions.openEdit(null)}
        initialData={ui.editingProduct}
        onSaveSuccess={(msg) => toast.success(msg)}
      />

      {/* Import Tools Modal */}
      <ImportTools
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={(count) => toast.success(`${count} productos importados`)}
      />

      {/* Print Label Modal */}
      {printingProduct && (
        <BarcodeLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          barcode={printingProduct.barcode}
          productName={printingProduct.name}
          quantity={1}
          isPrinting={isPrinting}
          onPrintThermal={handlePrintThermal}
          onPrintPDF={handlePrintPDF}
        />
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={ui.isDetailModalOpen}
        onClose={actions.closeDetail}
        product={ui.selectedProduct}
        onEdit={() => {
          if (ui.selectedProduct) {
            actions.closeDetail();
            actions.openEdit(ui.selectedProduct);
          }
        }}
        onDelete={() => {
          if (ui.selectedProduct) {
            actions.deleteProduct(ui.selectedProduct.barcode);
            actions.closeDetail();
          }
        }}
        onPrint={() => {
          if (ui.selectedProduct) {
            handleOpenPrint(ui.selectedProduct);
            actions.closeDetail();
          }
        }}
      />
    </div>
  );
};

export default InventoryPage;

