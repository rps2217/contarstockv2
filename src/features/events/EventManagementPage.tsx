import React, { useRef, useEffect } from 'react';
import { useAppStore } from '@/store/mainAppStore';
import { 
  AlertCircle,
  RefreshCw,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';

// Hooks
import { useEventUI } from './hooks/useEventUI';

// Components
import { EventHeader } from './components/EventHeader';
import { EventListPanel } from './components/EventListPanel';
import { EventOverlays } from './components/EventOverlays';
import { ManagementSearchBar } from '../../shared/components/core/ManagementSearchBar';

export const EventManagementPage: React.FC = () => {
  const { settings } = useAppStore();
  const { ui, actions: uiActions, db } = useEventUI();
  const { state, actions } = db;
  const navigate = useNavigate();

  const pendingRef = useRef<HTMLDivElement>(null);
  const destinedRef = useRef<HTMLDivElement>(null);
  const adjustedRef = useRef<HTMLDivElement>(null);
  
  const pendingVirtualizer = useVirtualizer({
    count: ui.pendingGrouped.length,
    getScrollElement: () => pendingRef.current,
    estimateSize: (index) => {
      if (ui.pendingGrouped[index].type === 'header') return 60;
      const baseHeight = state.preferences.compactView ? 100 : 160;
      return ui.expandedPanel === 'pending' ? baseHeight * 1.2 : baseHeight;
    },
    overscan: 5,
  });

  const destinedVirtualizer = useVirtualizer({
    count: ui.destinedGrouped?.length || 0,
    getScrollElement: () => destinedRef.current,
    estimateSize: (index) => {
      if (ui.destinedGrouped[index].type === 'header') return 60;
      const baseHeight = state.preferences.compactView ? 100 : 160;
      return ui.expandedPanel === 'destined' ? baseHeight * 1.2 : baseHeight;
    },
    overscan: 5,
  });

  const adjustedVirtualizer = useVirtualizer({
    count: ui.adjustedGrouped.length,
    getScrollElement: () => adjustedRef.current,
    estimateSize: (index) => {
      if (ui.adjustedGrouped[index].type === 'header') return 60;
      const baseHeight = state.preferences.compactView ? 100 : 160;
      return ui.expandedPanel === 'adjusted' ? baseHeight * 1.2 : baseHeight;
    },
    overscan: 5,
  });

  // Re-mapping confirmRemoveItem to use single item delete
  const handleSingleRemove = async (item: any) => {
    const confirm = window.confirm(`¿RETIRAR ${item.productName}? ESTA ACCIÓN ES IRREVERSIBLE.`);
    if (confirm) {
      try {
        actions.setPendingOperations((p: number) => p + 1);
        await actions.deleteEvent(item.id);
        toast.success('Registro eliminado correctamente');
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar registro');
      } finally {
        actions.setPendingOperations((p: number) => Math.max(0, p - 1));
      }
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans selection:bg-brand-warning/30 transition-colors duration-500 ${
      settings.theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-stone-200/50 text-slate-900'
    }`}>
      {/* HEADER */}
      <EventHeader 
        totalCount={state.totalCount}
        pendingOperations={state.pendingOperations}
        isSyncing={ui.isSyncing}
        theme={settings.theme}
        onNavigateExpiry={() => navigate('/expiry')}
        onToggleTheme={() => {}} // No longer needed
        onOpenSettings={() => uiActions.setIsSettingsDrawerOpen(true)}
      >
        <div className="flex flex-col gap-3">
          <ManagementSearchBar 
            searchQuery={state.searchQuery}
            setSearchQuery={actions.setSearchQuery}
            onOpenFilters={() => uiActions.setIsFilterDrawerOpen(true)}
            onOpenAdd={() => {
              uiActions.setEditingItem(null);
              uiActions.setIsCreateModalOpen(true);
            }}
            onClearFilters={uiActions.handleClearFilters}
            activeFiltersCount={ui.activeFiltersCount}
            placeholder="BUSCAR POR NOMBRE, SKU, EVENTO, FRC O ERP..."
            accentColor="blue"
            theme={settings.theme}
          />

          {/* MOBILE PREMIUM NAV SWITCHER TAB BAR */}
          <div className={`md:hidden flex items-center p-1 rounded-2xl border transition-all ${
            settings.theme === 'dark' 
              ? 'bg-slate-950/40 border-white/5' 
              : 'bg-white border-stone-200 shadow-sm'
          }`}>
            <button
              onClick={() => uiActions.setExpandedPanel('dual')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                ui.expandedPanel === 'dual' 
                  ? settings.theme === 'dark' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'bg-blue-500 text-white shadow-sm' 
                  : settings.theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => uiActions.setExpandedPanel('pending')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                ui.expandedPanel === 'pending' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : settings.theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ${ui.expandedPanel === 'pending' ? 'ring-2 ring-white/35 animate-ping' : ''}`} />
              Pend ({state.pendingCount})
            </button>
            <button
              onClick={() => uiActions.setExpandedPanel('destined')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                ui.expandedPanel === 'destined' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : settings.theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 ${ui.expandedPanel === 'destined' ? 'ring-2 ring-white/35 animate-ping' : ''}`} />
              Dest ({state.destinedCount || 0})
            </button>
            <button
              onClick={() => uiActions.setExpandedPanel('adjusted')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                ui.expandedPanel === 'adjusted' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : settings.theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ${ui.expandedPanel === 'adjusted' ? 'ring-2 ring-white/35 animate-ping' : ''}`} />
              Ajust ({state.adjustedCount})
            </button>
          </div>
        </div>
      </EventHeader>

      {/* DUAL PANELS */}
      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden gap-4 p-4 md:p-6 transition-colors ${
        settings.theme === 'dark' ? 'bg-brand-dark' : 'bg-stone-100/80'
      }`}>
        {/* PENDING PANEL */}
        {(ui.expandedPanel === 'dual' || ui.expandedPanel === 'pending') && (
          <EventListPanel
            title="Pendientes"
            count={state.pendingCount}
            theme={settings.theme}
            virtualizer={pendingVirtualizer}
            groupedItems={ui.pendingGrouped}
            onTogglePanel={() => uiActions.setExpandedPanel(ui.expandedPanel === 'pending' ? 'dual' : 'pending')}
            isExpanded={ui.expandedPanel === 'pending'}
            icon={<AlertCircle className="w-4 h-4 text-white" />}
            headerColor="bg-blue-600"
            onUpdateStatus={uiActions.handleUpdateStatus}
            onRemove={handleSingleRemove}
            onEdit={(item) => {
              uiActions.setEditingItem(item);
              uiActions.setIsCreateModalOpen(true);
            }}
            onFrcClick={uiActions.handleFrcClick}
            onEventClick={uiActions.handleEventClick}
            onDestinoClick={uiActions.handleDestinoClick}
            isCompact={state.preferences.compactView}
            selectedIds={state.selectedIds}
            onToggleSelect={actions.handleToggleSelect}
            emptyIcon={<AlertCircle className="w-10 h-10 mb-4" />}
            emptyText="Sin pendientes"
            scrollRef={pendingRef}
          />
        )}

        {/* DESTINED PANEL */}
        {(ui.expandedPanel === 'dual' || ui.expandedPanel === 'destined') && (
          <EventListPanel
            title="Destinados"
            count={state.destinedCount || 0}
            theme={settings.theme}
            virtualizer={destinedVirtualizer}
            groupedItems={ui.destinedGrouped || []}
            onTogglePanel={() => uiActions.setExpandedPanel(ui.expandedPanel === 'destined' ? 'dual' : 'destined')}
            isExpanded={ui.expandedPanel === 'destined'}
            icon={<Truck className="w-4 h-4 text-white" />}
            headerColor="bg-indigo-600"
            onUpdateStatus={uiActions.handleUpdateStatus}
            onRemove={handleSingleRemove}
            onEdit={(item) => {
              uiActions.setEditingItem(item);
              uiActions.setIsCreateModalOpen(true);
            }}
            onFrcClick={uiActions.handleFrcClick}
            onEventClick={uiActions.handleEventClick}
            onDestinoClick={uiActions.handleDestinoClick}
            isCompact={state.preferences.compactView}
            selectedIds={state.selectedIds}
            onToggleSelect={actions.handleToggleSelect}
            emptyIcon={<Truck className="w-10 h-10 mb-4" />}
            emptyText="Sin destinos"
            scrollRef={destinedRef}
          />
        )}

        {/* ADJUSTED PANEL */}
        {(ui.expandedPanel === 'dual' || ui.expandedPanel === 'adjusted') && (
          <EventListPanel
            title="Ajustados"
            count={state.adjustedCount}
            theme={settings.theme}
            virtualizer={adjustedVirtualizer}
            groupedItems={ui.adjustedGrouped}
            onTogglePanel={() => uiActions.setExpandedPanel(ui.expandedPanel === 'adjusted' ? 'dual' : 'adjusted')}
            isExpanded={ui.expandedPanel === 'adjusted'}
            icon={<RefreshCw className="w-4 h-4 text-white" />}
            headerColor="bg-emerald-600"
            onUpdateStatus={uiActions.handleUpdateStatus}
            onRemove={handleSingleRemove}
            onEdit={(item) => {
              uiActions.setEditingItem(item);
              uiActions.setIsCreateModalOpen(true);
            }}
            onFrcClick={uiActions.handleFrcClick}
            onEventClick={uiActions.handleEventClick}
            onDestinoClick={uiActions.handleDestinoClick}
            isCompact={state.preferences.compactView}
            selectedIds={state.selectedIds}
            onToggleSelect={actions.handleToggleSelect}
            emptyIcon={<RefreshCw className="w-10 h-10 mb-4" />}
            emptyText="Sin ajustados"
            scrollRef={adjustedRef}
          />
        )}
      </div>

      {/* DRAWERS & MODALS DECOUPLED OVERLAYS */}
      <EventOverlays 
        ui={ui}
        uiActions={uiActions}
        state={state}
        actions={actions}
        settings={settings}
      />
    </div>
  );
};

export default EventManagementPage;
