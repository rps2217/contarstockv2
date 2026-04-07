import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAppStore } from '@/store/mainAppStore';
import { useEventDatabase } from './useEventDatabase';
import { dynamicSyncService } from '../../../services/dynamicSync';

import { useTaskStore } from '@/store/useTaskStore';

export const useEventUI = () => {
  const { settings } = useAppStore();
  const { addTask, updateTask } = useTaskStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedPanel, setExpandedPanel] = useState<'pending' | 'adjusted' | 'dual'>('dual');
  
  const { state, actions } = useEventDatabase();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile redirect
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const preventAutoRedirect = location.state?.preventAutoRedirect;

    if (isMobile && !preventAutoRedirect) {
      navigate('/events/capture');
    }
  }, [navigate, location.state]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        navigate('/expiry');
        toast.info('Navegando a Control de Vencimientos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleBulkEdit = async (data: { destino: string; traspaso: string; observaciones: string }) => {
    const selectedIds = Array.from(state.selectedIds);
    if (selectedIds.length === 0) return;

    const taskId = `bulk-edit-${Date.now()}`;
    addTask({
      id: taskId,
      name: `Actualizando ${selectedIds.length} registros`,
      progress: 0,
      status: 'running'
    });

    try {
      const updates: any = {};
      if (data.destino) updates.destino = data.destino;
      if (data.traspaso) updates.traspaso = data.traspaso;
      if (data.observaciones) updates.observaciones = data.observaciones;
      
      if (Object.keys(updates).length > 0) {
        // Simular progreso si es una operación larga, o simplemente actualizar al final
        await actions.updateEventBulkFieldsMany(selectedIds, updates);
      }

      updateTask(taskId, { status: 'completed', progress: 100 });
      toast.success(`${selectedIds.length} registros actualizados`);
      actions.clearSelection();
    } catch (error) {
      updateTask(taskId, { status: 'error', error: 'Error al actualizar registros' });
      toast.error('Error al actualizar registros masivamente');
    }
  };

  const handleBulkSearchDocument = () => {
    const selectedIds = Array.from(state.selectedIds);
    if (selectedIds.length === 0) return;

    const item = state.processedEvents.find(e => e.id === selectedIds[0]);
    
    if (item && item.barcode && item.nguia) {
      const query = `${item.barcode} ${item.nguia}`;
      const url = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
      window.open(url, '_blank');
    } else {
      toast.error('No se pudo obtener SKU o Guía para la búsqueda');
    }
  };

  const handleCreateOrUpdate = async (data: any | any[]) => {
    const items = Array.isArray(data) ? data : [data];
    
    if (editingItem) {
      await actions.updateEvent(editingItem.id, items[0]);
    } else {
      for (const item of items) {
        const isDuplicate = state.processedEvents.some(
          (event) => event.barcode === item.barcode && event.frc === item.frc
        );
        if (isDuplicate) {
          toast.error(`Ya existe un evento para ${item.productName} con el mismo FRC`);
          continue;
        }
        await actions.createEvent(item);
      }
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const tableName = settings?.appSheetConfig?.eventsTableName || 'EVENTOS';
      const result = await dynamicSyncService.pullSync(tableName);
      toast.success(`Sincronización completada. ${result.added} añadidos, ${result.updated} actualizados.`);
    } catch (error: any) {
      toast.error(error.message || 'Error al sincronizar con la nube');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearFilters = () => {
    actions.setSelectedEvents([]);
    actions.setSearchQuery('');
    actions.setDateRange({ start: null, end: null });
  };

  const handleToggleEvent = (event: string) => {
    const next = state.selectedEvents.includes(event)
      ? state.selectedEvents.filter(e => e !== event)
      : [...state.selectedEvents, event];
    actions.setSelectedEvents(next);
  };

  const handleUpdateStatus = async (id: string, isAdjusted: boolean) => {
    try {
      await actions.updateEventStatus(id, isAdjusted);
      toast.success(isAdjusted ? 'Evento marcado como ajustado' : 'Evento revertido a pendiente');
    } catch (error: any) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleBulkRemove = async () => {
    const selectedItems = state.processedEvents.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;

    const confirm = window.confirm(`¿RETIRAR ${selectedItems.length} REGISTROS? ESTA ACCIÓN ES IRREVERSIBLE.`);
    if (!confirm) return;

    const taskId = `bulk-remove-${Date.now()}`;
    addTask({
      id: taskId,
      name: `Eliminando ${selectedItems.length} registros`,
      progress: 0,
      status: 'running'
    });

    let successCount = 0;
    const failedItems: string[] = [];

    actions.setPendingOperations(p => p + selectedItems.length);
    
    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        try {
          await actions.deleteEvent(item.id);
          successCount++;
        } catch (e) {
          failedItems.push(item.barcode || 'Desconocido');
        }
        updateTask(taskId, { progress: Math.round(((i + 1) / selectedItems.length) * 100) });
      }

      updateTask(taskId, { status: 'completed', progress: 100 });
      if (successCount > 0) toast.success(`${successCount} registros eliminados`);
      if (failedItems.length > 0) toast.error(`Error al eliminar: ${failedItems.join(', ')}`);
    } catch (error) {
      updateTask(taskId, { status: 'error', error: 'Error crítico en operación masiva' });
    } finally {
      actions.setPendingOperations(p => Math.max(0, p - selectedItems.length));
      actions.clearSelection();
    }
  };

  const handleBulkPrintLabels = () => {
    const selectedItems = state.processedEvents.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;
    
    import('../../expiry/utils/expiryUtils').then(utils => {
      utils.handlePrintLabels(selectedItems);
      toast.success(`Generando etiquetas para ${selectedItems.length} productos`);
    });
  };

  const handleBulkPrintSelected = () => {
    const selectedItems = state.processedEvents.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;
    
    import('../../expiry/utils/expiryUtils').then(utils => {
      utils.handlePrintSelectedEvents(selectedItems);
      toast.success(`Generando reporte para ${selectedItems.length} productos`);
    });
  };

  const handleBulkSendEmail = () => {
    const selectedItems = state.processedEvents.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length > 0) {
      setIsEmailModalOpen(true);
    } else {
      toast.error('No hay ítems seleccionados para enviar por correo');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    toast.info(`Modo ${theme === 'dark' ? 'Claro' : 'Oscuro'} activado`);
  };

  const handleFrcClick = (frc: string) => {
    actions.setSearchQuery(frc);
    toast.info(`Filtrando por FRC: ${frc}`);
  };

  const handleEventClick = (event: string) => {
    actions.setSelectedEvents([event]);
    toast.info(`Filtrando por evento: ${event}`);
  };

  const handleDestinoClick = (destino: string) => {
    actions.setSearchQuery(destino);
    toast.info(`Filtrando por destino: ${destino}`);
  };

  const getGroupedItems = useCallback((events: any[]) => {
    const groups: { [key: string]: any[] } = {};
    events.forEach(event => {
      const date = format(event.timestamp, 'dd/MM/yyyy');
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });

    const flattened: any[] = [];
    const sortedDates = Object.keys(groups).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA).getTime();
      const dateB = new Date(yearB, monthB - 1, dayB).getTime();
      return dateB - dateA;
    });

    sortedDates.forEach(date => {
      flattened.push({ type: 'header', date });
      groups[date].forEach(item => {
        flattened.push({ type: 'item', data: item });
      });
    });
    return flattened;
  }, []);

  const pendingGrouped = useMemo(() => getGroupedItems(state.pendingEvents), [state.pendingEvents, getGroupedItems]);
  const adjustedGrouped = useMemo(() => getGroupedItems(state.adjustedEvents), [state.adjustedEvents, getGroupedItems]);

  return {
    ui: {
      theme,
      isFilterDrawerOpen,
      isSettingsDrawerOpen,
      isSyncing,
      isCreateModalOpen,
      isBulkEditModalOpen,
      isEmailModalOpen,
      editingItem,
      expandedPanel,
      activeFiltersCount: state.selectedEvents.length + (state.dateRange.start || state.dateRange.end ? 1 : 0),
      pendingGrouped,
      adjustedGrouped,
      dateRange: state.dateRange
    },
    actions: {
      setTheme,
      setIsFilterDrawerOpen,
      setIsSettingsDrawerOpen,
      setIsCreateModalOpen,
      setIsBulkEditModalOpen,
      setIsEmailModalOpen,
      setEditingItem,
      setExpandedPanel,
      setDateRange: actions.setDateRange,
      toggleTheme,
      handleBulkEdit,
      handleBulkSearchDocument,
      handleCreateOrUpdate,
      handleSync,
      handleClearFilters,
      handleToggleEvent,
      handleUpdateStatus,
      handleBulkRemove,
      handleBulkPrintLabels,
      handleBulkPrintSelected,
      handleBulkSendEmail,
      handleFrcClick,
      handleEventClick,
      handleDestinoClick
    },
    db: {
      state,
      actions
    }
  };
};
