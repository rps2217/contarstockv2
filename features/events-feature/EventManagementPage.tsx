import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { 
  ChevronRight, 
  AlertCircle,
  RefreshCw,
  Sun,
  Moon,
  Settings2,
  Plus,
  Maximize2,
  Minimize2,
  Calendar,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Hooks
import { useEventDatabase } from './hooks/useEventDatabase';

// Components
import { EventHeader } from './components/EventHeader';
import { EventListPanel } from './components/EventListPanel';
import { EventBulkActions } from './components/EventBulkActions';
import { EventFilterDrawer } from './components/EventFilterDrawer';
import { CreateEventModal } from './components/CreateEventModal';
import { BulkEditModal } from './components/BulkEditModal';
import { EventSettingsDrawer } from './components/EventSettingsDrawer';
import { EventSearchBar } from './components/EventSearchBar';
import { EventPriorityPanel } from './components/EventPriorityPanel';
import { AnimatePresence } from 'motion/react';
import { Zap, ChevronUp, ChevronDown } from 'lucide-react';

// Services
import { importExpirationsFromCloud } from '../../services/syncManager';
import { removeExpirationFromCloud } from '../../services/expiry-sync';

const EventManagementPage: React.FC = () => {
  const { settings, updateSetting } = useAppStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isPriorityPanelOpen, setIsPriorityPanelOpen] = useState(false);
  
  const [expandedPanel, setExpandedPanel] = useState<'pending' | 'adjusted' | 'dual'>('dual');
  
  const { state, actions } = useEventDatabase();
  const navigate = useNavigate();

  const handleBulkEdit = async (data: { destino: string; traspaso: string; observaciones: string }) => {
    const selectedIds = Array.from(state.selectedIds);
    if (selectedIds.length === 0) return;

    try {
      const updates: any = {};
      if (data.destino) updates.destino = data.destino;
      if (data.traspaso) updates.traspaso = data.traspaso;
      if (data.observaciones) updates.observaciones = data.observaciones;
      
      if (Object.keys(updates).length > 0) {
        await actions.updateEventBulkFieldsMany(selectedIds, updates);
      }

      toast.success(`${selectedIds.length} registros actualizados`);
      actions.clearSelection();
    } catch (error) {
      toast.error('Error al actualizar registros masivamente');
    }
  };

  const handleBulkSearchDocument = () => {
    const selectedIds = Array.from(state.selectedIds);
    console.log('Selected IDs:', selectedIds);
    if (selectedIds.length === 0) return;

    // Use the first selected item for the search
    const item = state.processedEvents.find(e => e.id === selectedIds[0]);
    console.log('Item found:', item);
    
    if (item && item.barcode && item.nguia) {
      const query = `${item.barcode} ${item.nguia}`;
      console.log('Gmail Search Query:', query);
      const url = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
      console.log('Opening URL:', url);
      const opened = window.open(url, '_blank');
      if (!opened) {
        toast.error('El navegador bloqueó la apertura de la ventana de Gmail. Por favor, permite las ventanas emergentes.');
      }
    } else {
      console.error('Missing barcode or nguia:', item);
      toast.error('No se pudo obtener SKU o Guía para la búsqueda');
    }
  };

  // Atajo de teclado Alt+V para ir a Vencimientos
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

  const handleSelectItemFromPriority = (id: string) => {
    actions.setSearchQuery('');
    handleClearFilters();
    // Small delay to allow filters to clear
    setTimeout(() => {
      const element = document.getElementById(`event-item-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-slate-900');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-slate-900');
        }, 3000);
      }
    }, 100);
  };

  const handleCreateOrUpdate = async (data: any | any[]) => {
    const items = Array.isArray(data) ? data : [data];
    
    if (editingItem) {
      await actions.updateEvent(editingItem.id, items[0]);
    } else {
      for (const item of items) {
        // Check for duplicates
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
      const count = await importExpirationsFromCloud();
      toast.success(`Sincronización completada. ${count} registros procesados.`);
    } catch (error: any) {
      toast.error(error.message || 'Error al sincronizar con la nube');
    } finally {
      setIsSyncing(false);
    }
  };

  const activeFiltersCount = state.selectedEvents.length;

  const handleClearFilters = () => {
    actions.setSelectedEvents([]);
    actions.setSearchQuery('');
  };

  const handleToggleEvent = (event: string) => {
    const next = state.selectedEvents.includes(event)
      ? state.selectedEvents.filter(e => e !== event)
      : [...state.selectedEvents, event];
    actions.setSelectedEvents(next);
  };

  const handleRemoveItem = async (item: any) => {
    if (!item.claveUnica) {
      toast.error('No se puede eliminar: falta clave única');
      return;
    }
    
    try {
      actions.setPendingOperations(p => p + 1);
      await removeExpirationFromCloud(item.claveUnica);
      toast.success('Registro eliminado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar registro');
    } finally {
      actions.setPendingOperations(p => Math.max(0, p - 1));
    }
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

    let successCount = 0;
    const failedItems: string[] = [];

    actions.setPendingOperations(p => p + selectedItems.length);
    
    await Promise.all(selectedItems.map(async (item) => {
      if (!item.claveUnica) {
        failedItems.push(item.barcode || 'Desconocido');
        return;
      }
      try {
        await removeExpirationFromCloud(item.claveUnica);
        successCount++;
      } catch (e) {
        failedItems.push(item.barcode || 'Desconocido');
      }
    }));

    actions.setPendingOperations(p => Math.max(0, p - selectedItems.length));

    if (successCount > 0) toast.success(`${successCount} registros eliminados`);
    if (failedItems.length > 0) toast.error(`Error al eliminar: ${failedItems.join(', ')}`);
    
    actions.clearSelection();
  };

  const handleBulkUpdateStatus = async (isAdjusted: boolean) => {
    const selectedIds = Array.from(state.selectedIds);
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(selectedIds.map(id => actions.updateEventStatus(id, isAdjusted)));
      toast.success(`${selectedIds.length} registros actualizados`);
      actions.clearSelection();
    } catch (error) {
      toast.error('Error al actualizar registros masivamente');
    }
  };
  
  const handleBulkUpdateDestino = async (destino: string) => {
    const selectedIds = Array.from(state.selectedIds);
    if (selectedIds.length === 0) return;

    try {
      actions.setPendingOperations(p => p + selectedIds.length);
      await Promise.all(selectedIds.map(id => actions.updateEventDestino(id, destino)));
      toast.success(`${selectedIds.length} registros actualizados a ${destino}`);
      actions.clearSelection();
    } catch (error) {
      toast.error('Error al actualizar destino masivamente');
    } finally {
      actions.setPendingOperations(p => Math.max(0, p - selectedIds.length));
    }
  };

  const handleBulkPrintLabels = () => {
    const selectedItems = state.processedEvents.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;
    
    import('../expiry-feature/utils/expiryUtils').then(utils => {
      utils.handlePrintLabels(selectedItems);
      toast.success(`Generando etiquetas para ${selectedItems.length} productos`);
    });
  };

  const handleBulkPrintSelected = () => {
    const selectedItems = state.processedEvents.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;
    
    import('../expiry-feature/utils/expiryUtils').then(utils => {
      utils.handlePrintSelectedEvents(selectedItems);
      toast.success(`Generando reporte para ${selectedItems.length} productos`);
    });
  };

  const handleBulkSendEmail = () => {
    const selectedItems = state.processedEvents.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;
    
    import('../expiry-feature/utils/expiryUtils').then(utils => {
      utils.handleSendEmail(selectedItems);
      toast.success(`Generando reporte de correo para ${selectedItems.length} productos`);
    });
  };

  const confirmRemoveItem = (item: any) => {
    const confirm = window.confirm(`¿RETIRAR ${item.productName}? ESTA ACCIÓN ES IRREVERSIBLE.`);
    if (confirm) {
      handleRemoveItem(item);
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
    // Si ya está seleccionado, no hacemos nada o podríamos limpiar otros.
    // El usuario quiere que "se filtre", así que lo pondremos como el único filtro activo
    // para que sea una acción directa y clara.
    actions.setSelectedEvents([event]);
    toast.info(`Filtrando por evento: ${event}`);
  };

  // Grouping Logic
  const getGroupedItems = (events: any[]) => {
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
  };

  const pendingGrouped = getGroupedItems(state.pendingEvents);
  const adjustedGrouped = getGroupedItems(state.adjustedEvents);

  const pendingRef = useRef<HTMLDivElement>(null);
  const adjustedRef = useRef<HTMLDivElement>(null);
  
  const pendingVirtualizer = useVirtualizer({
    count: pendingGrouped.length,
    getScrollElement: () => pendingRef.current,
    estimateSize: (index) => pendingGrouped[index].type === 'header' ? 60 : (state.preferences.compactView ? 100 : 160),
    overscan: 5,
  });

  const adjustedVirtualizer = useVirtualizer({
    count: adjustedGrouped.length,
    getScrollElement: () => adjustedRef.current,
    estimateSize: (index) => adjustedGrouped[index].type === 'header' ? 60 : (state.preferences.compactView ? 100 : 160),
    overscan: 5,
  });

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans selection:bg-blue-500/30 transition-colors duration-500 ${
      theme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* HEADER */}
      <EventHeader 
        totalCount={state.totalCount}
        pendingOperations={state.pendingOperations}
        isSyncing={isSyncing}
        theme={theme}
        onSync={handleSync}
        onNavigateExpiry={() => navigate('/expiry')}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsDrawerOpen(true)}
      >
        <EventSearchBar 
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          onOpenFilters={() => setIsFilterDrawerOpen(true)}
          onOpenAdd={() => {
            setEditingItem(null);
            setIsCreateModalOpen(true);
          }}
          onClearFilters={handleClearFilters}
          activeFiltersCount={activeFiltersCount}
          theme={theme}
        />
      </EventHeader>

      {/* PRIORITY ASSISTANT (BENTO PANEL) */}
      <div className="px-4 md:px-6 mt-4">
        {(state.preferences.showPriorityAssistant ?? true) && (
          <div className="mb-2">
            <button
              onClick={() => setIsPriorityPanelOpen(!isPriorityPanelOpen)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                theme === 'dark' 
                  ? 'bg-slate-900/50 border-white/10 hover:bg-white/5' 
                  : 'bg-white border-slate-200 shadow-sm hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-100 text-blue-600'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 className={`text-sm font-black uppercase tracking-tighter italic leading-none ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>
                    Asistente de Priorización
                  </h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Análisis de volumen y alertas de gestión
                  </p>
                </div>
              </div>
              {isPriorityPanelOpen ? (
                <ChevronUp className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
              )}
            </button>

            <AnimatePresence>
              {isPriorityPanelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    <EventPriorityPanel 
                      stats={state.priorityStats} 
                      theme={theme} 
                      onSelectItem={handleSelectItemFromPriority}
                      onActionClick={(event) => actions.setSelectedEvents([event])}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* DUAL PANELS */}
      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden gap-4 p-4 md:p-6 ${
        theme === 'dark' ? 'bg-black' : 'bg-slate-50'
      }`}>
        {/* PENDING PANEL */}
        {(expandedPanel === 'dual' || expandedPanel === 'pending') && (
          <EventListPanel
            title="Pendientes"
            count={state.pendingCount}
            theme={theme}
            virtualizer={pendingVirtualizer}
            groupedItems={pendingGrouped}
            onTogglePanel={() => setExpandedPanel(expandedPanel === 'pending' ? 'dual' : 'pending')}
            isExpanded={expandedPanel === 'pending'}
            icon={<AlertCircle className="w-4 h-4 text-white" />}
            headerColor="bg-blue-600"
            onUpdateStatus={handleUpdateStatus}
            onRemove={confirmRemoveItem}
            onEdit={(item) => {
              setEditingItem(item);
              setIsCreateModalOpen(true);
            }}
            onFrcClick={handleFrcClick}
            onEventClick={handleEventClick}
            isCompact={state.preferences.compactView}
            selectedIds={state.selectedIds}
            onToggleSelect={actions.handleToggleSelect}
            emptyIcon={<AlertCircle className="w-10 h-10 mb-4" />}
            emptyText="Sin pendientes"
            scrollRef={pendingRef}
          />
        )}

        {/* ADJUSTED PANEL */}
        {(expandedPanel === 'dual' || expandedPanel === 'adjusted') && (
          <EventListPanel
            title="Ajustados"
            count={state.adjustedCount}
            theme={theme}
            virtualizer={adjustedVirtualizer}
            groupedItems={adjustedGrouped}
            onTogglePanel={() => setExpandedPanel(expandedPanel === 'adjusted' ? 'dual' : 'adjusted')}
            isExpanded={expandedPanel === 'adjusted'}
            icon={<RefreshCw className="w-4 h-4 text-white" />}
            headerColor="bg-emerald-600"
            onUpdateStatus={handleUpdateStatus}
            onRemove={confirmRemoveItem}
            onEdit={(item) => {
              setEditingItem(item);
              setIsCreateModalOpen(true);
            }}
            onFrcClick={handleFrcClick}
            onEventClick={handleEventClick}
            isCompact={state.preferences.compactView}
            selectedIds={state.selectedIds}
            onToggleSelect={actions.handleToggleSelect}
            emptyIcon={<RefreshCw className="w-10 h-10 mb-4" />}
            emptyText="Sin ajustados"
            scrollRef={adjustedRef}
          />
        )}
      </div>

      {/* DRAWERS & MODALS */}
      <EventFilterDrawer 
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        eventTypes={state.eventTypes}
        selectedEvents={state.selectedEvents}
        onToggleEvent={handleToggleEvent}
        onClearFilters={handleClearFilters}
        activeFiltersCount={activeFiltersCount}
        theme={theme}
      />

      <EventBulkActions 
        selectedCount={state.selectedIds.size}
        totalVisibleCount={state.filteredCount}
        onClearSelection={actions.clearSelection}
        onSelectAllVisible={actions.handleSelectAll}
        onBulkRemove={handleBulkRemove}
        onBulkPrintLabels={handleBulkPrintLabels}
        onBulkPrintSelected={handleBulkPrintSelected}
        onBulkSendEmail={handleBulkSendEmail}
        onBulkSearchDocument={handleBulkSearchDocument}
        onOpenBulkEdit={() => setIsBulkEditModalOpen(true)}
        theme={theme}
      />

      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => setIsBulkEditModalOpen(false)}
        onApply={handleBulkEdit}
        theme={theme}
        selectedCount={state.selectedIds.size}
      />

      <EventSettingsDrawer 
        isOpen={isSettingsDrawerOpen}
        onClose={() => setIsSettingsDrawerOpen(false)}
        preferences={state.preferences}
        onUpdatePreferences={actions.togglePreference}
        theme={theme}
      />

      <CreateEventModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleCreateOrUpdate}
        editingItem={editingItem}
        theme={theme}
      />
    </div>
  );
};

export default EventManagementPage;
