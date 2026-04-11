import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface ManagementUIOptions {
  featureName: string;
  capturePath: string;
  dbState: any;
  dbActions: any;
  onPrintSelected?: (items: any[]) => void;
  onPrintLabels?: (items: any[]) => void;
}

export const useManagementUI = ({
  featureName,
  capturePath,
  dbState,
  dbActions,
  onPrintSelected,
  onPrintLabels
}: ManagementUIOptions) => {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDesktopAddModalOpen, setIsDesktopAddModalOpen] = useState(false);
  const [initialBarcode, setInitialBarcode] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenAdd = useCallback((barcode: any = '') => {
    const finalBarcode = typeof barcode === 'string' ? barcode : '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (isMobile) {
      navigate(capturePath);
    } else {
      setInitialBarcode(finalBarcode);
      setIsDesktopAddModalOpen(true);
    }
  }, [navigate, capturePath]);

  // Global scanner listener (HID)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if a modal is open or user is typing in an input
      if (isDesktopAddModalOpen || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }

      if (e.key.length === 1 && /[0-9]/.test(e.key)) {
        buffer += e.key;
        lastKeyTime = currentTime;
      }

      if (e.key === 'Enter' && buffer.length >= 6) {
        handleOpenAdd(buffer);
        buffer = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktopAddModalOpen, handleOpenAdd]);

  // Mobile auto-redirect
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const preventRedirect = (location.state as any)?.preventAutoRedirect;
    
    if (isMobile && !preventRedirect) {
      navigate(capturePath, { replace: true });
    }
  }, [navigate, location, capturePath]);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(dbState.selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    dbActions.setSelectedIds(newSelected);
  };

  const handleSelectAllVisible = (items: any[]) => {
    const newSelected = new Set(dbState.selectedIds);
    items.forEach(item => newSelected.add(item.id));
    dbActions.setSelectedIds(newSelected);
  };

  const confirmBulkRemove = (onConfirm: (ids: Set<string>) => void) => {
    const count = dbState.selectedIds.size;
    if (count === 0) return;
    
    const confirm = window.confirm(`¿ESTÁS SEGURO DE RETIRAR ${count} ÍTEMS SELECCIONADOS? ESTA ACCIÓN NO SE PUEDE DESHACER.`);
    if (confirm) {
      onConfirm(dbState.selectedIds);
    }
  };

  const confirmRemoveItem = (item: any, onConfirm: (item: any) => void) => {
    const confirm = window.confirm(`¿RETIRAR ${item.productName || 'ESTE ÍTEM'}? ESTA ACCIÓN ES IRREVERSIBLE.`);
    if (confirm) {
      onConfirm(item);
    }
  };

  const handlePrintSelectedAction = () => {
    const selectedItems = dbState.allItems.filter((item: any) => dbState.selectedIds.has(item.id));
    if (selectedItems.length > 0 && onPrintSelected) {
      onPrintSelected(selectedItems);
    } else if (selectedItems.length === 0) {
      toast.error('No hay ítems seleccionados para imprimir');
    }
  };

  const handlePrintLabelsAction = () => {
    const selectedItems = dbState.allItems.filter((item: any) => dbState.selectedIds.has(item.id));
    if (selectedItems.length > 0 && onPrintLabels) {
      onPrintLabels(selectedItems);
    } else if (selectedItems.length === 0) {
      toast.error('No hay ítems seleccionados para imprimir etiquetas');
    }
  };

  return {
    ui: {
      isFilterDrawerOpen,
      isSettingsDrawerOpen,
      isEmailModalOpen,
      isDesktopAddModalOpen,
      initialBarcode,
      viewMode,
    },
    actions: {
      setIsFilterDrawerOpen,
      setIsSettingsDrawerOpen,
      setIsEmailModalOpen,
      setIsDesktopAddModalOpen,
      setInitialBarcode,
      setViewMode,
      handleOpenAdd,
      handleToggleSelect,
      handleSelectAllVisible,
      confirmBulkRemove,
      confirmRemoveItem,
      handlePrintSelectedAction,
      handlePrintLabelsAction,
    }
  };
};
