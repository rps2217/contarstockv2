import React from 'react';
import { Product } from '../../../types';
import { ProductForm } from './ProductForm';
import { ImportTools } from './ImportTools';
import { BarcodeLabelModal } from '../../../shared/components/ui/BarcodeLabelModal';

interface InventoryModalsProps {
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  isImportOpen: boolean;
  setIsImportOpen: (open: boolean) => void;
  editingProduct: Product | null;
  onSaveSuccess: (msg: string) => void;
  onImportComplete: (count: number) => void;
  printingProduct: Product | null;
  isLabelModalOpen: boolean;
  setIsLabelModalOpen: (open: boolean) => void;
  isPrinting: boolean;
  onPrintThermal: () => void;
  onPrintPDF: () => void;
}

export const InventoryModals: React.FC<InventoryModalsProps> = ({
  isFormOpen,
  setIsFormOpen,
  isImportOpen,
  setIsImportOpen,
  editingProduct,
  onSaveSuccess,
  onImportComplete,
  printingProduct,
  isLabelModalOpen,
  setIsLabelModalOpen,
  isPrinting,
  onPrintThermal,
  onPrintPDF
}) => {
  return (
    <>
      <ProductForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        initialData={editingProduct} 
        onSaveSuccess={onSaveSuccess} 
      />
      <ImportTools 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImportComplete={onImportComplete} 
      />
      
      {printingProduct && (
        <BarcodeLabelModal 
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          barcode={printingProduct.barcode}
          productName={printingProduct.name}
          quantity={1}
          isPrinting={isPrinting}
          onPrintThermal={onPrintThermal}
          onPrintPDF={onPrintPDF}
        />
      )}
    </>
  );
};
