import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export interface BaseEntity {
  id?: string | number;
  [key: string]: unknown;
}

export interface DbState {
  selectedIds: Set<string>;
  allItems: BaseEntity[];
}

export interface DbActions {
  setSelectedIds: (ids: Set<string>) => void;
}

export interface ManagementUIOptions<T extends BaseEntity = BaseEntity> {
  featureName: string;
  capturePath: string;
  dbState: DbState;
  dbActions: DbActions;
  onPrintSelected?: (items: T[]) => void;
  onPrintLabels?: (items: T[]) => void;
}

export const useManagementUI = <T extends BaseEntity = BaseEntity>({
  featureName,
  capturePath,
  dbState,
  dbActions,
  onPrintSelected,
  onPrintLabels
}: ManagementUIOptions<T>) => {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDesktopAddModalOpen, setIsDesktopAddModalOpen] = useState(false);
  const [initialBarcode, setInitialBarcode] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenAdd = useCallback((barcode: string = '') => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (isMobile) {
      navigate(capturePath);
    } else {
      setInitialBarcode(barcode);
      setIsDesktopAddModalOpen(true);
    }
  }, [navigate, capturePath]);

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
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

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const preventRedirect = (location.state as { preventAutoRedirect?: boolean } | null)?.preventAutoRedirect;
    
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

  const handleSelectAllVisible = (items: T[]) => {
    const newSelected = new Set(dbState.selectedIds);
    items.forEach(item => {
      if (item.id) newSelected.add(String(item.id));
    });
    dbActions.setSelectedIds(newSelected);
  };

  const confirmBulkRemove = (onConfirm: (ids: Set<string>) => void) => {
    const count = dbState.selectedIds.size;
    if (count === 0) return;
    
    const confirmed = window.confirm(`¿ESTÁS SEGURO DE RETIRAR ${count} ÍTEMS SELECCIONADOS? ESTA ACCIÓN NO SE PUEDE DESHACER.`);
    if (confirmed) {
      onConfirm(dbState.selectedIds);
    }
  };

  const confirmRemoveItem = (item: T, onConfirm: (item: T) => void) => {
    const productName = (item as Record<string, unknown>).productName as string | undefined;
    const confirmed = window.confirm(`¿RETIRAR ${productName || 'ESTE ÍTEM'}? ESTA ACCIÓN ES IRREVERSIBLE.`);
    if (confirmed) {
      onConfirm(item);
    }
  };

  const handlePrintSelectedAction = () => {
    const selectedItems = dbState.allItems.filter((item) => dbState.selectedIds.has(String(item.id)));
    if (selectedItems.length > 0 && onPrintSelected) {
      onPrintSelected(selectedItems as T[]);
    } else if (selectedItems.length === 0) {
      toast.error('No hay ítems seleccionados para imprimir');
    }
  };

  const handlePrintLabelsAction = () => {
    const selectedItems = dbState.allItems.filter((item) => dbState.selectedIds.has(String(item.id)));
    if (selectedItems.length > 0 && onPrintLabels) {
      onPrintLabels(selectedItems as T[]);
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
