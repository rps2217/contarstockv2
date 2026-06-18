
import React, { useState } from 'react';
import { Product } from '../../types';
import { CheckCircle2, AlertTriangle, Printer, Trash2 } from 'lucide-react';
import { ProductList } from './components/ProductList';
import { DatabaseHeader } from './components/DatabaseHeader';
import { ProductForm } from './components/ProductForm';
import { ImportTools } from './components/ImportTools';
import { BarcodeLabelModal } from '../../shared/components/ui/BarcodeLabelModal';
import { useProductDatabase } from './hooks/useProductDatabase';
import { thermalPrinter } from '../../services/thermalPrinterService';
import { handlePrintLabels } from '../expiry/utils/expiryUtils';
import { toast } from 'sonner';
import { MassActionsPanel } from '../../shared/components/ui/MassActionsPanel';

export const Database: React.FC = () => {
  const { state, actions } = useProductDatabase();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [printingProduct, setPrintingProduct] = useState<Product | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const usagePercent = state.storageUsage ? Math.min(100, (state.storageUsage.used / state.storageUsage.quota) * 100) : 0;
  const usedMb = state.storageUsage ? (state.storageUsage.used / 1024 / 1024).toFixed(1) : '0';

  const handleOpenCreate = () => { setEditingProduct(null); setIsFormOpen(true); };
  const handleOpenEdit = (product: Product) => { setEditingProduct(product); setIsFormOpen(true); };
  
  const handleOpenPrint = (product: Product) => {
    setPrintingProduct(product);
    setIsLabelModalOpen(true);
  };

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
    } catch (error: any) {
      toast.error(`Error de impresión: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintPDF = () => {
    if (!printingProduct) return;
    handlePrintLabels([{ barcode: printingProduct.barcode, productName: printingProduct.name }]);
  };

  const toggleSelection = (barcode: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(barcode)) newSelected.delete(barcode);
    else newSelected.add(barcode);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === state.products.length && state.products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(state.products.map(p => p.barcode)));
    }
  };

  const handleMassPrint = () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }
    
    const selectedProducts = state.products.filter(p => selectedIds.has(p.barcode));
    const printItems = selectedProducts.map(p => ({
      barcode: p.barcode,
      productName: p.name
    }));
    
    handlePrintLabels(printItems);
    toast.success(`Generando ${printItems.length} etiquetas`);
    setSelectedIds(new Set());
  };

  const handleMassDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedIds.size} productos?`)) return;
    
    try {
      // Usar el servicio directamente para evitar múltiples confirmaciones
      await Promise.all(Array.from(selectedIds).map(barcode => actions.handleDelete(barcode)));
      toast.success('Productos eliminados');
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/50 dark:bg-black pb-24 md:pb-0 relative overflow-hidden">
      <DatabaseHeader 
        usedMb={usedMb}
        usagePercent={usagePercent}
        isDownloading={state.isDownloading}
        isSyncing={state.isSyncing}
        isVectorizing={state.isVectorizing}
        vectorProgress={state.vectorProgress}
        missingVectorsCount={state.missingVectorsCount}
        trainedPercent={state.trainedPercent}
        backedUpPercent={state.backedUpPercent}
        pendingChangesCount={state.pendingChangesCount}
        brainStatus={state.brainStatus}
        searchQuery={state.searchQuery}
        onSearch={actions.setSearchQuery}
        onDownload={actions.handleDownloadFromCloud}
        onSync={actions.handleSyncToCloud}
        onForceSync={actions.handleForceSyncToCloud}
        onVectorize={actions.handleVectorize}
        onInitializeBrain={actions.handleInitializeBrain}
        onImport={() => setIsImportOpen(true)}
        onCreate={handleOpenCreate}
        onSyncProviders={actions.handleSyncProviders}
        policyFilter={state.policyFilter}
        onPolicyFilterChange={actions.setPolicyFilter}
      />


      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-4 py-4">
        <ProductList 
          products={state.products} 
          onEdit={handleOpenEdit} 
          onDelete={actions.handleDelete} 
          onDeleteAll={actions.handleDeleteAll} 
          onPrint={handleOpenPrint}
          selectedIds={selectedIds}
          onSelect={toggleSelection}
          onSelectAll={handleSelectAll}
          hasFilter={!!state.searchQuery} 
        />
      </div>

      <MassActionsPanel 
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        actions={[
          { label: 'Imprimir', icon: Printer, onClick: handleMassPrint, variant: 'warning' },
          { label: 'Borrar', icon: Trash2, onClick: handleMassDelete, variant: 'danger' }
        ]}
      />

      <ProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingProduct}
        onSaveSuccess={(msg) => toast.success(msg)}
      />

      <ImportTools
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={(count) => toast.success(`${count} productos importados`)}
      />

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
    </div>
  );
};

export default Database;

