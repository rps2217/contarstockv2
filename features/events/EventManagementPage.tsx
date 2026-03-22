import React, { useState, useRef } from 'react';
import { 
  ChevronRight, 
  AlertCircle,
  RefreshCw,
  Sun,
  Moon,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';

// Hooks
import { useEventDatabase } from './hooks/useEventDatabase';

// Components
import { EventSearchBar } from './components/EventSearchBar';
import { EventItemCard } from './components/EventItemCard';
import { EventBulkActions } from './components/EventBulkActions';
import { EventFilterDrawer } from './components/EventFilterDrawer';

// Services
import { importExpirationsFromCloud } from '../../services/syncManager';
import { removeExpirationFromCloud } from '../../services/expirySync';

const EventManagementPage: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { state, actions } = useEventDatabase();

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
      await removeExpirationFromCloud(item.claveUnica);
      toast.success('Registro eliminado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar registro');
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
        await removeExpirationFromCloud(item.claveUnica);
        successCount++;
      } catch (e) {
        errorCount++;
      }
    }

    if (successCount > 0) toast.success(`${successCount} registros eliminados`);
    if (errorCount > 0) toast.error(`${errorCount} errores al eliminar`);
    
    actions.clearSelection();
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

  const parentRef = useRef<HTMLDivElement>(null);
  const visibleItems = state.processedEvents.slice(0, state.displayLimit);
  
  const rowVirtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => state.preferences.compactView ? 80 : 120,
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
              onClick={toggleTheme}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shrink-0 ${
                theme === 'dark' 
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-amber-500' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-500 shadow-sm'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
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

      {/* MAIN LIST */}
      <div ref={parentRef} className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = visibleItems[virtualRow.index];
            return (
              <div
                key={item.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '12px', // space-y-3 equivalent
                }}
              >
                <EventItemCard 
                  item={item}
                  isSelected={state.selectedIds.has(item.id)}
                  onToggleSelect={actions.handleToggleSelect}
                  theme={theme}
                  isCompact={state.preferences.compactView}
                />
              </div>
            );
          })}
        </div>

        {state.processedEvents.length > state.displayLimit && (
          <div className="flex justify-center py-8">
            <button
              onClick={() => actions.setDisplayLimit(prev => prev + 50)}
              className={`border px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 group ${
                theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
              }`}
            >
              <ChevronRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform rotate-90" />
              Cargar más registros
              <span className="text-slate-500">({state.processedEvents.length - state.displayLimit} restantes)</span>
            </button>
          </div>
        )}

        {state.processedEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border ${
              theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}>
              <AlertCircle className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`} />
            </div>
            <h3 className={`text-xl font-black uppercase tracking-tighter italic mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              No hay eventos
            </h3>
            <p className={`text-sm font-bold max-w-md ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {state.searchQuery || activeFiltersCount > 0 
                ? 'No se encontraron registros que coincidan con los filtros actuales.'
                : 'No hay registros de eventos en la base de datos local. Intenta sincronizar con la nube.'}
            </p>
            {(state.searchQuery || activeFiltersCount > 0) && (
              <button
                onClick={handleClearFilters}
                className={`mt-6 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  theme === 'dark' 
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
                }`}
              >
                Limpiar Filtros
              </button>
            )}
          </div>
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
        onClearSelection={actions.clearSelection}
        onBulkRemove={handleBulkRemove}
        theme={theme}
      />
    </div>
  );
};

export default EventManagementPage;
