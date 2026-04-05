import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useExpiryDatabase } from './useExpiryDatabase';
import { handlePrintExpirations, handlePrintLabels } from '../utils/expiryUtils';

export const useExpiryUI = () => {
  const { state, actions } = useExpiryDatabase();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDesktopAddModalOpen, setIsDesktopAddModalOpen] = useState(false);
  const [initialBarcode, setInitialBarcode] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleOpenAdd = (barcode: any = '') => {
    const finalBarcode = typeof barcode === 'string' ? barcode : '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    if (isMobile) {
      navigate('/expiry/capture');
    } else {
      setInitialBarcode(finalBarcode);
      setIsDesktopAddModalOpen(true);
    }
  };

  // GLOBAL SCANNER LISTENER
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
  }, [isDesktopAddModalOpen]);

  // Detect mobile device and redirect
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const preventRedirect = (location.state as any)?.preventAutoRedirect;
    
    if (isMobile && !preventRedirect) {
      navigate('/expiry/capture', { replace: true });
    }
  }, [navigate, location]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'e') {
          e.preventDefault();
          navigate('/events');
          toast.info('Navegando a Control de Eventos');
        } else if (key === 'n') {
          e.preventDefault();
          handleOpenAdd();
        } else if (key === 'f') {
          e.preventDefault();
          setIsFilterDrawerOpen(true);
        } else if (key === 't') {
          e.preventDefault();
          setViewMode(prev => prev === 'grid' ? 'table' : 'grid');
          toast.info(`Vista ${viewMode === 'grid' ? 'Tabla' : 'Cuadrícula'} activada`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, viewMode]);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(state.selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    actions.setSelectedIds(newSelected);
  };

  const handleClearFilters = () => {
    actions.setSearchQuery('');
    actions.setSelectedStatuses([]);
    actions.setSelectedCategories([]);
    actions.setSelectedCanje('all');
    actions.setActionPeriod('all');
    actions.setCustomDateRange({ start: null, end: null });
    toast.info('Filtros restablecidos');
  };

  const confirmBulkRemove = () => {
    const confirm = window.confirm(`¿ESTÁS SEGURO DE RETIRAR ${state.selectedIds.size} ÍTEMS SELECCIONADOS? ESTA ACCIÓN NO SE PUEDE DESHACER.`);
    if (confirm) {
      actions.handleBulkRemove(state.selectedIds);
    }
  };

  const handlePrintSelected = () => {
    const selectedItems = state.allItems.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      handlePrintExpirations(selectedItems);
    } else {
      toast.error('No hay ítems seleccionados para imprimir');
    }
  };

  const handlePrintLabelsBulk = () => {
    const selectedItems = state.allItems.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      handlePrintLabels(selectedItems);
    } else {
      toast.error('No hay ítems seleccionados para imprimir etiquetas');
    }
  };

  const handleSendEmailBulk = () => {
    const selectedItems = state.allItems.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      setIsEmailModalOpen(true);
    } else {
      toast.error('No hay ítems seleccionados para enviar por correo');
    }
  };

  const confirmRemoveItem = (item: any) => {
    const confirm = window.confirm(`¿RETIRAR ${item.productName}? ESTA ACCIÓN ES IRREVERSIBLE.`);
    if (confirm) {
      actions.handleRemoveItem(item);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    toast.info(`Modo ${theme === 'dark' ? 'Claro' : 'Oscuro'} activado`);
  };

  const handleSelectAllVisible = () => {
    const newSelected = new Set(state.selectedIds);
    state.processedScans.forEach(item => newSelected.add(item.id));
    actions.setSelectedIds(newSelected);
  };

  return {
    ui: {
      isFilterDrawerOpen,
      setIsFilterDrawerOpen,
      isSettingsDrawerOpen,
      setIsSettingsDrawerOpen,
      isEmailModalOpen,
      setIsEmailModalOpen,
      isDesktopAddModalOpen,
      setIsDesktopAddModalOpen,
      initialBarcode,
      setInitialBarcode,
      theme,
      setTheme,
      viewMode,
      setViewMode,
      activeFiltersCount: state.selectedStatuses.length + state.selectedCategories.length + (state.selectedCanje !== 'all' ? 1 : 0) + (state.actionPeriod !== 'all' ? 1 : 0) + (state.customDateRange.start || state.customDateRange.end ? 1 : 0)
    },
    actions: {
      handleOpenAdd,
      handleToggleSelect,
      handleClearFilters,
      confirmBulkRemove,
      handlePrintSelected,
      handlePrintLabelsBulk,
      handleSendEmailBulk,
      confirmRemoveItem,
      toggleTheme,
      handleSelectAllVisible
    },
    db: {
      state,
      actions
    }
  };
};
