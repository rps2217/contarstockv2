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
import { EventSearchBar } from './components/EventSearchBar';
import { EventItemCard } from './components/EventItemCard';
import { EventBulkActions } from './components/EventBulkActions';
import { EventFilterDrawer } from './components/EventFilterDrawer';
import { CreateEventModal } from './components/CreateEventModal';
import { EventSettingsDrawer } from './components/EventSettingsDrawer';

// Services
import { importExpirationsFromCloud } from '../../services/syncManager';
import { removeExpirationFromCloud } from '../../services/expirySync';

const EventManagementPage: React.FC = () => {
  const { settings, updateSetting } = useAppStore();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [expandedPanel, setExpandedPanel] = useState<'pending' | 'adjusted' | 'dual'>('dual');
  
  const { state, actions } = useEventDatabase();
  const navigate = useNavigate();

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

  const handleCreateOrUpdate = async (data: any) => {
    if (editingItem) {
      await actions.updateEvent(editingItem.id, data);
    } else {
      await actions.createEvent(data);
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
    let errorCount = 0;

    for (const item of selectedItems) {
      if (!item.claveUnica) {
        errorCount++;
        continue;
      }
      try {
        actions.setPendingOperations(p => p + 1);
        await removeExpirationFromCloud(item.claveUnica);
        successCount++;
      } catch (e) {
        errorCount++;
      } finally {
        actions.setPendingOperations(p => Math.max(0, p - 1));
      }
    }

    if (successCount > 0) toast.success(`${successCount} registros eliminados`);
    if (errorCount > 0) toast.error(`${errorCount} errores al eliminar`);
    
    actions.clearSelection();
  };

  const handleBulkUpdateStatus = async (isAdjusted: boolean) => {
    const selectedIds = Array.from(state.selectedIds);
    if (selectedIds.length === 0) return;

    try {
      for (const id of selectedIds) {
        await actions.updateEventStatus(id, isAdjusted);
      }
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
      for (const id of selectedIds) {
        await actions.updateEventDestino(id, destino);
      }
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
    
    import('../expiry/utils/expiryUtils').then(utils => {
      utils.handlePrintLabels(selectedItems);
      toast.success(`Generando etiquetas para ${selectedItems.length} productos`);
    });
  };

  const handleBulkSendEmail = () => {
    const selectedItems = state.processedEvents.filter(item => state.selectedIds.has(item.id));
    if (selectedItems.length === 0) return;
    
    import('../expiry/utils/expiryUtils').then(utils => {
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
    estimateSize: (index) => pendingGrouped[index].type === 'header' ? 40 : (state.preferences.compactView ? 80 : 120),
    overscan: 5,
  });

  const adjustedVirtualizer = useVirtualizer({
    count: adjustedGrouped.length,
    getScrollElement: () => adjustedRef.current,
    estimateSize: (index) => adjustedGrouped[index].type === 'header' ? 40 : (state.preferences.compactView ? 80 : 120),
    overscan: 5,
  });

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans selection:bg-blue-500/30 transition-colors duration-500 ${
      theme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* HEADER */}
      <div className={`p-4 md:p-6 pb-4 backdrop-blur-xl border-b shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-white/80 border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg transition-colors shrink-0 ${
              theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 shadow-blue-500/5' : 'bg-blue-50 border-blue-200 shadow-blue-500/10'
            }`}>
              <AlertCircle className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Control de Eventos</h1>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                {state.totalCount} Registros Totales
              </p>
            </div>
          </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {state.pendingOperations > 0 && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest animate-pulse ${
                theme === 'dark' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Guardando ({state.pendingOperations})
              </div>
            )}
            <button
              onClick={() => {
                setEditingItem(null);
                setIsCreateModalOpen(true);
              }}
              className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all border shadow-lg active:scale-95 ${
                theme === 'dark' 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20' 
                  : 'bg-blue-600 border-blue-500 text-white shadow-blue-500/20'
              }`}
            >
              <Plus className="w-4 h-4" />
              Nuevo Evento
            </button>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex-1 md:flex-none px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                theme === 'dark' 
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 shadow-sm'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>

            <button
              onClick={() => navigate('/expiry')}
              className={`flex-1 md:flex-none px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border ${
                theme === 'dark' 
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-500' 
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-600 shadow-sm'
              }`}
              title="Ir a Control de Vencimientos (Alt+V)"
            >
              <Calendar className="w-4 h-4" />
              Vencimientos
            </button>

            <button
              onClick={toggleTheme}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shrink-0 ${
                theme === 'dark' 
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-amber-500' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-500 shadow-sm'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsSettingsDrawerOpen(true)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shrink-0 ${
                theme === 'dark' 
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-indigo-400' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-500 shadow-sm'
              }`}
              title="Preferencias de Vista"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* EVENT TYPES DISPLAY */}
        <div className="flex flex-wrap gap-2">
          {state.eventTypes.map(type => (
            <button
              key={type}
              onClick={() => handleToggleEvent(type)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                state.selectedEvents.includes(type)
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : theme === 'dark'
                    ? 'bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <EventSearchBar 
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          onOpenFilters={() => setIsFilterDrawerOpen(true)}
          onClearFilters={handleClearFilters}
          activeFiltersCount={activeFiltersCount}
          theme={theme}
        />
      </div>

      {/* DUAL PANELS */}
      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden gap-4 p-4 md:p-6 ${
        theme === 'dark' ? 'bg-black' : 'bg-slate-50'
      }`}>
        {/* PENDING PANEL */}
        {(expandedPanel === 'dual' || expandedPanel === 'pending') && (
          <motion.div 
            layout
            className={`flex-1 flex flex-col overflow-hidden rounded-[2.5rem] border-4 border-black transition-all relative ${
              theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'
            }`}
          >
            <div className="bg-blue-600 p-4 flex items-center justify-between border-b-4 border-black">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tighter italic leading-none">Pendientes</h3>
                  <p className="text-[8px] font-bold text-blue-200 uppercase tracking-widest mt-1">{state.pendingCount} Registros</p>
                </div>
              </div>
              <button 
                onClick={() => setExpandedPanel(expandedPanel === 'pending' ? 'dual' : 'pending')}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                {expandedPanel === 'pending' ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
              </button>
            </div>

            <div ref={pendingRef} className="flex-1 overflow-y-auto p-4 no-scrollbar">
              <div
                style={{
                  height: `${pendingVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {pendingVirtualizer.getVirtualItems().map((virtualRow) => {
                  const entry = pendingGrouped[virtualRow.index];
                  
                  if (entry.type === 'header') {
                    return (
                      <div
                        key={`header-${entry.date}`}
                        ref={pendingVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          padding: '8px 0',
                        }}
                      >
                        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg ${
                          theme === 'dark' 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-blue-600 border-blue-500 text-white'
                        }`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em] italic">{entry.date}</span>
                        </div>
                      </div>
                    );
                  }

                  const item = entry.data;
                  return (
                    <div
                      key={item.id}
                      ref={pendingVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                        paddingBottom: '12px',
                      }}
                    >
                      <EventItemCard 
                        item={item}
                        isSelected={state.selectedIds.has(item.id)}
                        onToggleSelect={actions.handleToggleSelect}
                        onUpdateStatus={handleUpdateStatus}
                        onRemove={confirmRemoveItem}
                        onEdit={(item) => {
                          setEditingItem(item);
                          setIsCreateModalOpen(true);
                        }}
                        onFrcClick={handleFrcClick}
                        onEventClick={handleEventClick}
                        theme={theme}
                        isCompact={state.preferences.compactView}
                      />
                    </div>
                  );
                })}
              </div>
              {state.pendingEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                  <AlertCircle className="w-10 h-10 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Sin pendientes</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ADJUSTED PANEL */}
        {(expandedPanel === 'dual' || expandedPanel === 'adjusted') && (
          <motion.div 
            layout
            className={`flex-1 flex flex-col overflow-hidden rounded-[2.5rem] border-4 border-black transition-all relative ${
              theme === 'dark' ? 'bg-emerald-900/20' : 'bg-white'
            }`}
          >
            <div className="bg-emerald-600 p-4 flex items-center justify-between border-b-4 border-black">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <RefreshCw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tighter italic leading-none">Ajustados</h3>
                  <p className="text-[8px] font-bold text-emerald-200 uppercase tracking-widest mt-1">{state.adjustedCount} Registros</p>
                </div>
              </div>
              <button 
                onClick={() => setExpandedPanel(expandedPanel === 'adjusted' ? 'dual' : 'adjusted')}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                {expandedPanel === 'adjusted' ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
              </button>
            </div>

            <div ref={adjustedRef} className="flex-1 overflow-y-auto p-4 no-scrollbar">
              <div
                style={{
                  height: `${adjustedVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {adjustedVirtualizer.getVirtualItems().map((virtualRow) => {
                  const entry = adjustedGrouped[virtualRow.index];

                  if (entry.type === 'header') {
                    return (
                      <div
                        key={`header-adj-${entry.date}`}
                        ref={adjustedVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          padding: '8px 0',
                        }}
                      >
                        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg ${
                          theme === 'dark' 
                            ? 'bg-emerald-600 border-emerald-500 text-white' 
                            : 'bg-emerald-600 border-emerald-500 text-white'
                        }`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs font-black uppercase tracking-[0.2em] italic">{entry.date}</span>
                        </div>
                      </div>
                    );
                  }

                  const item = entry.data;
                  return (
                    <div
                      key={item.id}
                      ref={adjustedVirtualizer.measureElement}
                      data-index={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                        paddingBottom: '12px',
                      }}
                    >
                      <EventItemCard 
                        item={item}
                        isSelected={state.selectedIds.has(item.id)}
                        onToggleSelect={actions.handleToggleSelect}
                        onUpdateStatus={handleUpdateStatus}
                        onRemove={confirmRemoveItem}
                        onEdit={(item) => {
                          setEditingItem(item);
                          setIsCreateModalOpen(true);
                        }}
                        onFrcClick={handleFrcClick}
                        onEventClick={handleEventClick}
                        theme={theme}
                        isCompact={state.preferences.compactView}
                      />
                    </div>
                  );
                })}
              </div>
              {state.adjustedEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                  <RefreshCw className="w-10 h-10 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Sin ajustados</p>
                </div>
              )}
            </div>
          </motion.div>
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
        onBulkSendEmail={handleBulkSendEmail}
        onBulkUpdateDestino={handleBulkUpdateDestino}
        theme={theme}
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
