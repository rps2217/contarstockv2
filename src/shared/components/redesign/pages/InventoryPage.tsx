/**
 * InventoryPage.tsx - Módulo de Gestión de Inventario v2
 *
 * Diseño monocromático de grises, estructura unificada.
 * Migrado a redesign/pages/ para consolidar UI.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Trash2,
  Plus,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Printer,
  LayoutGrid,
  List,
  Download,
  Upload,
  Table2,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores';
import { Product } from '@/types';
import { ProductWithPolicy } from '@/features/product/types';
// IMPORTANTE: Usar hooks desde features/ (lógica de negocio)
import { useInventory } from '@/features/inventory/hooks/useInventory';
import { useExport } from '@/shared/hooks';
import { ProductCard } from '@/features/inventory/components/ProductCard';
import { ProductForm } from '@/features/inventory/components/ProductForm';
import { ImportTools } from '@/features/inventory/components/ImportTools';
import { BarcodeLabelModal } from '@/shared/components/ui/BarcodeLabelModal';
import { ProductDetailModal } from '@/features/inventory/components/ProductDetailModal';
import { thermalPrinter } from '@/services/thermalPrinterService';
import { handlePrintLabels } from '@/features/expiry/utils/expiryUtils';
import { MassActionsPanel } from '@/shared/components/ui/MassActionsPanel';
import { InventoryKanbanView } from '@/features/inventory/components/InventoryKanbanView';
import { ProductPolicyStatus } from '@/features/inventory/domain/productsDomain';
import { ModulePage } from '@/shared/components/ui/design-system/ModulePage';
import { FilterSearch } from '@/shared/components/ui/design-system/FilterSearch';
import { ActionFAB } from '@/shared/components/ui/design-system/ActionFAB';
import { EmptyState } from '@/shared/components/ui/EmptyState';

// ============================================================================
// COMPONENTE: ProductSection
// ============================================================================
interface ProductSectionProps {
  title: string;
  icon: React.ElementType;
  products: Product[];
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetail: (product: Product) => void;
  selectedIds: Set<string>;
  isDark: boolean;
}

const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  icon: Icon,
  products,
  isExpanded,
  onToggle,
  onViewDetail,
  selectedIds,
  isDark,
}) => {
  return (
    <div
      className={`rounded-2xl border overflow-hidden ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}
    >
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={`w-full px-4 py-3 flex items-center justify-between ${isDark ? 'bg-neutral-900' : 'bg-neutral-100'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
            <Icon className={`w-4 h-4 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`} />
          </div>
          <div className="text-left">
            <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {title}
            </span>
            <span
              className={`ml-2 text-[10px] font-mono ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}
            >
              {products.length} productos
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ArrowUpRight className={`w-4 h-4 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
        ) : (
          <Minus className={`w-4 h-4 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
        )}
      </button>

      {/* Section Content */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0 }}
        className="overflow-hidden"
      >
        <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
          {products.length === 0 ? (
            <p
              className={`text-center py-4 text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}
            >
              Sin productos
            </p>
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
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: InventoryPage (REDESIGN)
// ============================================================================
export const RedesignInventoryPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const isDark = settings?.theme !== 'light';

  const { filteredProducts, filters, isLoading, isSyncing, selectedIds, actions, ui } =
    useInventory();

  // Hook de exportación
  const inventoryColumns = useMemo(
    () => [
      { key: 'barcode' as const, header: 'Código' },
      { key: 'name' as const, header: 'Producto' },
      { key: 'stock' as const, header: 'Stock' },
      { key: 'sku' as const, header: 'SKU' },
      { key: 'location' as const, header: 'Ubicación' },
    ],
    []
  );
  const { isExporting, exportTo } = useExport<Product>({
    fileName: 'Inventario',
    columns: inventoryColumns,
    sheetName: 'Productos',
  });

  const [expandedSections, setExpandedSections] = useState({
    exchange: true,
    loss: true,
    noInfo: false,
  });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [printingProduct, setPrintingProduct] = useState<Product | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const filterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'exchange', label: 'Canje' },
    { value: 'loss', label: 'Merma' },
    { value: 'noInfo', label: 'Sin Info' },
  ];

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === 'Escape' && isInput) {
        target.blur();
        actions.setSearchQuery('');
      }

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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
        toast.error('Impresora no conectada');
        return;
      }
      await thermalPrinter.printLabel(printingProduct.barcode, printingProduct.name, 1);
      toast.success('Etiqueta enviada');
    } catch (error: unknown) {
      toast.error(`Error: ${String(error)}`);
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
    const printItems = selectedProducts.map(p => ({ barcode: p.barcode, productName: p.name }));
    handlePrintLabels(printItems);
    toast.success(`Generando ${printItems.length} etiquetas`);
    actions.clearSelection();
  };

  const handleMassDelete = async () => {
    if (selectedIds.size === 0) return;
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
    return (
      pWithPolicy.hasExchange === true ||
      (pWithPolicy.policy?.daysToExpiry && pWithPolicy.policy.daysToExpiry > 0) ||
      (pWithPolicy.withdrawalDays && pWithPolicy.withdrawalDays > 0)
    );
  });

  const lossProducts = filteredProducts.filter(p => {
    const pWithPolicy = p as ProductWithPolicy;
    return pWithPolicy.hasExchange === false;
  });

  const noInfoProducts = filteredProducts.filter(p => {
    const pWithPolicy = p as ProductWithPolicy;
    return (
      pWithPolicy.hasExchange === undefined &&
      !pWithPolicy.policy?.daysToExpiry &&
      !pWithPolicy.withdrawalDays
    );
  });

  const totalCount = filteredProducts.length;

  return (
    <ModulePage
      title="Inventario"
      subtitle={`${totalCount} productos`}
      icon={<Package className={`w-5 h-5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`} />}
      isDark={isDark}
      isLoading={isLoading}
      onRefresh={actions.syncProducts}
      actions={
        <>
          {/* Importar CSV */}
          <button
            onClick={() => setIsImportOpen(true)}
            className={`p-2.5 rounded-xl ${isDark ? 'bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'}`}
            title="Importar CSV"
          >
            <Upload className="w-4 h-4" />
          </button>

          {/* Exportar dropdown */}
          <div className="relative group">
            <button
              disabled={filteredProducts.length === 0 || isExporting}
              className={`p-2.5 rounded-xl ${isDark ? 'bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'} disabled:opacity-30`}
            >
              <Download className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
              <div
                className={`${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-white border border-neutral-200'} rounded-xl shadow-xl overflow-hidden min-w-[120px]`}
              >
                <button
                  onClick={() => {
                    exportTo(filteredProducts as Product[], 'csv');
                  }}
                  disabled={isExporting}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'} transition-colors text-sm`}
                >
                  <Table2 className="w-4 h-4 text-emerald-500" /> CSV
                </button>
                <button
                  onClick={() => {
                    exportTo(filteredProducts as Product[], 'excel');
                  }}
                  disabled={isExporting}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'} transition-colors text-sm`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" /> Excel
                </button>
                <button
                  onClick={() => {
                    exportTo(filteredProducts as Product[], 'pdf');
                  }}
                  disabled={isExporting}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 ${isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'} transition-colors text-sm`}
                >
                  <FileText className="w-4 h-4 text-rose-500" /> PDF
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setViewMode(v => (v === 'list' ? 'kanban' : 'list'))}
            className={`p-2.5 rounded-xl ${isDark ? 'bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'}`}
          >
            {viewMode === 'list' ? (
              <LayoutGrid className="w-4 h-4" />
            ) : (
              <List className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleMassDelete}
            disabled={selectedIds.size === 0}
            className={`p-2.5 rounded-xl ${isDark ? 'bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'} disabled:opacity-30`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      }
      fab={
        <ActionFAB
          onClick={actions.openCreate}
          icon={<Plus className="w-5 h-5" />}
          isDark={isDark}
        />
      }
    >
      {/* Search & Filters */}
      <FilterSearch
        placeholder="Buscar productos..."
        value={filters.searchQuery}
        onChange={actions.setSearchQuery}
        filters={filterOptions}
        selectedFilter="all"
        onFilterChange={() => {}}
        isDark={isDark}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Selection info */}
      {selectedIds.size > 0 && (
        <div
          className={`mt-3 p-3 rounded-xl ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-neutral-100 border border-neutral-200'}`}
        >
          <div className="flex items-center justify-between">
            <p
              className={`text-xs font-medium ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}
            >
              {selectedIds.size} seleccionado(s)
            </p>
            <button
              onClick={actions.clearSelection}
              className={`text-xs ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw
              className={`w-6 h-6 animate-spin ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}
            />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="Sin productos"
            description="No hay productos registrados"
            icon={<Package className="w-8 h-8" />}
          />
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
              onViewDetail={actions.openDetail}
              selectedIds={selectedIds}
              isDark={isDark}
            />

            <ProductSection
              title="Merma"
              icon={ArrowDownRight}
              products={lossProducts}
              isExpanded={expandedSections.loss}
              onToggle={() => toggleSection('loss')}
              onViewDetail={actions.openDetail}
              selectedIds={selectedIds}
              isDark={isDark}
            />

            <ProductSection
              title="Sin Info"
              icon={Minus}
              products={noInfoProducts}
              isExpanded={expandedSections.noInfo}
              onToggle={() => toggleSection('noInfo')}
              onViewDetail={actions.openDetail}
              selectedIds={selectedIds}
              isDark={isDark}
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
          { label: 'Borrar', icon: Trash2, onClick: handleMassDelete, variant: 'danger' },
        ]}
      />

      {/* Product Form Modal */}
      <ProductForm
        isOpen={ui.isCreateModalOpen || ui.isEditModalOpen}
        onClose={() => actions.openEdit(null)}
        initialData={ui.editingProduct}
        onSaveSuccess={msg => toast.success(msg)}
      />

      {/* Import Tools Modal */}
      <ImportTools
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={count => toast.success(`${count} productos importados`)}
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
    </ModulePage>
  );
};
