import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useEventDatabase } from './useEventDatabase';
import { genericSyncEngine } from '../../../services/cloud/GenericSyncEngine';
import { useTaskStore } from '@/stores';
import { useBulkActions, BulkAction, BulkEditConfig } from '@/hooks/useBulkActions';
import { Trash2, Edit3, Download, Search, Printer } from 'lucide-react';

// Destinos disponibles
const DESTINOS = [
  { value: 'BOD. 37', label: 'BOD. 37' },
  { value: 'BOD. 80', label: 'BOD. 80' },
  { value: 'BOD. 95', label: 'BOD. 95' },
  { value: 'BOD. 98', label: 'BOD. 98' },
  { value: 'BOD. 106', label: 'BOD. 106' },
  { value: 'BOD. 121', label: 'BOD. 121' },
];

// Acciones masivas configurables
export const EVENT_BULK_ACTIONS: BulkAction[] = [
  {
    id: 'edit',
    label: 'Editar',
    icon: Edit3,
    variant: 'primary',
    onClick: () => {} // Se ejecuta desde el modal
  },
  {
    id: 'search',
    label: 'Buscar',
    icon: Search,
    variant: 'default',
    onClick: (items) => {
      const item = items[0];
      if (item?.barcode && item?.nguia) {
        const query = `${item.barcode} ${item.nguia}`;
        window.open(`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`, '_blank');
      } else {
        toast.error('No se pudo obtener SKU o Guía para la búsqueda');
      }
    }
  },
  {
    id: 'print',
    label: 'Imprimir',
    icon: Printer,
    variant: 'default',
    onClick: (items) => {
      import('../../expiry/utils/expiryUtils').then(utils => {
        utils.handlePrintSelectedEvents(items);
        toast.success(`Generando etiquetas para ${items.length} productos`);
      });
    }
  },
  {
    id: 'export',
    label: 'Exportar',
    icon: Download,
    variant: 'default',
    onClick: (items) => {
      const csv = [
        'Barcode,Producto,FRC,Destino,Traspaso,Estado',
        ...items.map(i => `${i.barcode || ''},${i.productName || ''},${i.frc || ''},${i.destino || ''},${i.traspaso || ''},${i.isAdjusted ? 'Ajustado' : 'Pendiente'}`)
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventos_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${items.length} registros exportados`);
    }
  },
  {
    id: 'delete',
    label: 'Eliminar',
    icon: Trash2,
    variant: 'danger',
    requiresConfirmation: true,
    confirmMessage: '¿Eliminar los elementos seleccionados? Esta acción es irreversible.',
    onClick: () => {} // Se ejecuta desde el hook
  }
];

// Configuración de edición masiva
export const EVENT_BULK_EDIT_CONFIG: BulkEditConfig = {
  title: 'Edición Masiva',
  description: 'Actualizar destino y traspaso de los eventos seleccionados.',
  fields: [
    {
      key: 'destino',
      label: 'Destino',
      type: 'select',
      options: DESTINOS
    },
    {
      key: 'traspaso',
      label: 'N° Traspaso',
      type: 'text'
    },
    {
      key: 'observaciones',
      label: 'Observaciones',
      type: 'textarea'
    }
  ],
  onApply: async (ids, values, items) => {
    // Esta función se reemplaza en el hook
    return Promise.resolve();
  }
};

export const useEventUI = () => {
  const { addTask, updateTask } = useTaskStore();
  
  // Flat structure from useEventDatabase
  const db = useEventDatabase();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedPanel, setExpandedPanel] = useState<'pending' | 'destined' | 'adjusted' | 'dual'>('dual');

  // Sistema global de acciones masivas
  const bulk = useBulkActions({
    module: 'events',
    getItemId: (item: any) => item.id,
    actions: EVENT_BULK_ACTIONS.map(action => {
      // Wrapped actions con acceso a db
      if (action.id === 'delete') {
        return {
          ...action,
          onClick: async (items: any[]) => {
            const taskId = `bulk-delete-${Date.now()}`;
            addTask({
              id: taskId,
              name: `Eliminando ${items.length} registros`,
              progress: 0,
              status: 'running'
            });
            
            let success = 0;
            for (let i = 0; i < items.length; i++) {
              try {
                await db.actions.deleteEvent(items[i].id);
                success++;
              } catch (e) {
                console.error('Error deleting:', e);
              }
              updateTask(taskId, { progress: Math.round(((i + 1) / items.length) * 100) });
            }
            
            updateTask(taskId, { status: 'completed', progress: 100 });
            toast.success(`${success} registros eliminados`);
          }
        };
      }
      if (action.id === 'edit') {
        return {
          ...action,
          onClick: () => bulk.openBulkEditModal()
        };
      }
      return action;
    }),
    bulkEdit: {
      ...EVENT_BULK_EDIT_CONFIG,
      onApply: async (ids, values, items) => {
        const taskId = `bulk-edit-${Date.now()}`;
        addTask({
          id: taskId,
          name: `Actualizando ${ids.length} registros`,
          progress: 0,
          status: 'running'
        });

        try {
          const updates: any = {};
          if (values.destino) updates.destino = values.destino;
          if (values.traspaso) updates.traspaso = values.traspaso;
          if (values.observaciones) updates.observaciones = values.observaciones;
          
          if (Object.keys(updates).length > 0) {
            await db.actions.updateEventBulkFieldsMany(ids, updates);
          }

          updateTask(taskId, { status: 'completed', progress: 100 });
          toast.success(`${ids.length} registros actualizados`);
        } catch (error) {
          updateTask(taskId, { status: 'error', error: 'Error al actualizar registros' });
          toast.error('Error al actualizar registros masivamente');
          throw error;
        }
      }
    }
  });

  const handleBulkEdit = async (data: { destino: string; traspaso: string; observaciones: string }) => {
    // Delegado al sistema de useBulkActions
    bulk.openBulkEditModal();
  };

  const handleBulkSearchDocument = () => {
    // Delegado al sistema de useBulkActions
    bulk.executeBulkAction('search', db.processedEvents);
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
    // Delegado al sistema de useBulkActions
    bulk.executeBulkAction('delete', db.processedEvents);
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
      isBulkEditModalOpen: bulk.isBulkEditModalOpen,
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
      // Bulk actions
      bulkActions: bulk,
      selectedIds: bulk.selectedIds,
      selectedCount: bulk.selectedCount,
    },
    actions: {
      setIsCreateModalOpen,
      setIsBulkEditModalOpen: bulk.closeBulkEditModal,
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
      handleDestinoClick,
      // Bulk actions
      executeBulkAction: bulk.executeBulkAction,
      clearSelection: bulk.clearSelection,
      toggleSelection: bulk.toggleSelection,
    },
    db,
    bulk // Exponer bulk completo para uso directo
  };
};
