import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useEventDatabase } from './useEventDatabase';
import { genericSyncEngine } from '../../../services/cloud/GenericSyncEngine';
import { useTaskStore } from '@/stores';

export const useEventUI = () => {
  const { addTask, updateTask } = useTaskStore();
  
  // Flat structure from useEventDatabase
  const db = useEventDatabase();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedPanel, setExpandedPanel] = useState<'pending' | 'destined' | 'adjusted' | 'dual'>('dual');

  const handleBulkEdit = async (data: { destino: string; traspaso: string; observaciones: string }) => {
    const selectedIds = Array.from(db.selectedIds);
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
        await db.actions.updateEventBulkFieldsMany(selectedIds, updates);
      }

      updateTask(taskId, { status: 'completed', progress: 100 });
      toast.success(`${selectedIds.length} registros actualizados`);
      db.actions.clearSelection();
    } catch (error) {
      updateTask(taskId, { status: 'error', error: 'Error al actualizar registros' });
      toast.error('Error al actualizar registros masivamente');
    }
  };

  const handleBulkSearchDocument = () => {
    const selectedIds = Array.from(db.selectedIds);
    if (selectedIds.length === 0) return;

    const item = db.processedEvents.find(e => e.id === selectedIds[0]);
    
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
      await db.actions.updateEvent(editingItem.id, items[0]);
    } else {
      for (const item of items) {
        const isDuplicate = db.processedEvents.some(
          (event) => event.barcode === item.barcode && event.frc === item.frc
        );
        if (isDuplicate) {
          toast.error(`Ya existe un evento para ${item.productName} con el mismo FRC`);
          continue;
        }
        await db.actions.createEvent(item);
      }
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const result = await genericSyncEngine.pullRemoteChanges('events');
      toast.success(`Sincronización completada. ${result.added} añadidos, ${result.updated} actualizados.`);
    } catch (error: any) {
      toast.error(error.message || 'Error al sincronizar con la nube');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearFilters = () => {
    db.actions.setSelectedEvents([]);
    db.actions.setSearchQuery('');
    db.actions.setDateRange({ start: null, end: null });
  };

  const handleToggleEvent = (event: string) => {
    const next = db.selectedEvents.includes(event)
      ? db.selectedEvents.filter(e => e !== event)
      : [...db.selectedEvents, event];
    db.actions.setSelectedEvents(next);
  };

  const handleUpdateStatus = async (id: string, isAdjusted: boolean) => {
    try {
      await db.actions.updateEventStatus(id, isAdjusted);
      toast.success(isAdjusted ? 'Evento marcado como ajustado' : 'Evento revertido a pendiente');
    } catch (error: any) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleBulkRemove = async () => {
    const selectedItems = db.processedEvents.filter(item => db.selectedIds.has(item.id));
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

    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        try {
          await db.actions.deleteEvent(item.id);
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
      db.actions.clearSelection();
    }
  };

  const handleBulkPrintLabels = () => {
    const selectedItems = db.processedEvents.filter(item => db.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;
    
    import('../../expiry/utils/expiryUtils').then(utils => {
      utils.handlePrintLabels(selectedItems);
      toast.success(`Generando etiquetas para ${selectedItems.length} productos`);
    });
  };

  const handleBulkPrintSelected = () => {
    const selectedItems = db.processedEvents.filter(item => db.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;
    
    import('../../expiry/utils/expiryUtils').then(utils => {
      utils.handlePrintSelectedEvents(selectedItems);
      toast.success(`Generando reporte para ${selectedItems.length} productos`);
    });
  };

  const handleFrcClick = (frc: string) => {
    db.actions.setSearchQuery(frc);
    toast.info(`Filtrando por FRC: ${frc}`);
  };

  const handleEventClick = (event: string) => {
    db.actions.setSelectedEvents([event]);
    toast.info(`Filtrando por evento: ${event}`);
  };

  const handleDestinoClick = (destino: string) => {
    db.actions.setSearchQuery(destino);
    toast.info(`Filtrando por destino: ${destino}`);
  };

  const getGroupedItems = useCallback((events: any[]) => {
    const groups: { [key: string]: any[] } = {};
    events.forEach(event => {
      let dateObj: Date;
      try {
        if (!event.timestamp) {
          dateObj = new Date();
        } else if (typeof event.timestamp === 'number') {
          dateObj = new Date(event.timestamp);
        } else {
          dateObj = new Date(event.timestamp);
        }

        if (isNaN(dateObj.getTime())) {
          dateObj = new Date();
        }
      } catch (e) {
        dateObj = new Date();
      }

      const date = format(dateObj, 'dd/MM/yyyy');
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

  const pendingGrouped = useMemo(() => getGroupedItems(db.pendingEvents), [db.pendingEvents, getGroupedItems]);
  const destinedGrouped = useMemo(() => getGroupedItems(db.destinedEvents), [db.destinedEvents, getGroupedItems]);
  const adjustedGrouped = useMemo(() => getGroupedItems(db.adjustedEvents), [db.adjustedEvents, getGroupedItems]);

  return {
    ui: {
      isSyncing,
      isCreateModalOpen,
      isBulkEditModalOpen,
      editingItem,
      expandedPanel,
      activeFiltersCount: db.selectedEvents.length + (db.dateRange.start || db.dateRange.end ? 1 : 0),
      pendingGrouped,
      destinedGrouped,
      adjustedGrouped,
      dateRange: db.dateRange,
      // From useManagementUI
      isSettingsDrawerOpen: false,
      isFilterDrawerOpen: false,
    },
    actions: {
      setIsCreateModalOpen,
      setIsBulkEditModalOpen,
      setEditingItem,
      setExpandedPanel,
      setDateRange: db.actions.setDateRange,
      setIsSettingsDrawerOpen: (open?: boolean) => { /* TODO: Implement */ },
      setIsFilterDrawerOpen: (open?: boolean | ((prev: boolean) => boolean)) => { /* TODO: Implement */ },
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
      handleFrcClick,
      handleEventClick,
      handleDestinoClick
    },
    db
  };
};
