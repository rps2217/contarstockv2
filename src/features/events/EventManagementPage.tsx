import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/mainAppStore';
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
import { useNavigate, useLocation } from 'react-router-dom';
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
import { AnimatePresence } from 'motion/react';
import { Zap, ChevronUp, ChevronDown } from 'lucide-react';

// Services
import { dynamicSyncService } from '../../services/dynamicSync';
import { dynamicDataService } from '../../services/dynamicDataService';

import { useEventUI } from './hooks/useEventUI';

const EventManagementPage: React.FC = () => {
  const { ui, actions: uiActions, db } = useEventUI();
  const { state, actions } = db;
  const navigate = useNavigate();

  const handleSelectItemFromPriority = (id: string) => {
    actions.setSearchQuery('');
    uiActions.handleClearFilters();
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

  const pendingRef = useRef<HTMLDivElement>(null);
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
        actions.setPendingOperations(p => p + 1);
        await actions.deleteEvent(item.id);
        toast.success('Registro eliminado correctamente');
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar registro');
      } finally {
        actions.setPendingOperations(p => Math.max(0, p - 1));
      }
    }
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans selection:bg-blue-500/30 transition-colors duration-500 ${
      ui.theme === 'dark' ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* HEADER */}
      <EventHeader 
        totalCount={state.totalCount}
        pendingOperations={state.pendingOperations}
        isSyncing={ui.isSyncing}
        theme={ui.theme}
        onNavigateExpiry={() => navigate('/expiry')}
        onToggleTheme={uiActions.toggleTheme}
        onOpenSettings={() => uiActions.setIsSettingsDrawerOpen(true)}
      >
        <EventSearchBar 
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          onOpenFilters={() => uiActions.setIsFilterDrawerOpen(true)}
          onOpenAdd={() => {
            uiActions.setEditingItem(null);
            uiActions.setIsCreateModalOpen(true);
          }}
          onClearFilters={uiActions.handleClearFilters}
          activeFiltersCount={ui.activeFiltersCount}
          theme={ui.theme}
        />
      </EventHeader>

      {/* DUAL PANELS */}
      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden gap-4 p-4 md:p-6 ${
        ui.theme === 'dark' ? 'bg-black' : 'bg-slate-50'
      }`}>
        {/* PENDING PANEL */}
        {(ui.expandedPanel === 'dual' || ui.expandedPanel === 'pending') && (
          <EventListPanel
            title="Pendientes"
            count={state.pendingCount}
            theme={ui.theme}
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
            isCompact={state.preferences.compactView}
            selectedIds={state.selectedIds}
            onToggleSelect={actions.handleToggleSelect}
            emptyIcon={<AlertCircle className="w-10 h-10 mb-4" />}
            emptyText="Sin pendientes"
            scrollRef={pendingRef}
          />
        )}

        {/* ADJUSTED PANEL */}
        {(ui.expandedPanel === 'dual' || ui.expandedPanel === 'adjusted') && (
          <EventListPanel
            title="Ajustados"
            count={state.adjustedCount}
            theme={ui.theme}
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
        isOpen={ui.isFilterDrawerOpen}
        onClose={() => uiActions.setIsFilterDrawerOpen(false)}
        eventTypes={state.eventTypes}
        selectedEvents={state.selectedEvents}
        onToggleEvent={uiActions.handleToggleEvent}
        onClearFilters={uiActions.handleClearFilters}
        activeFiltersCount={ui.activeFiltersCount}
        theme={ui.theme}
      />

      <EventBulkActions 
        selectedCount={state.selectedIds.size}
        totalVisibleCount={state.filteredCount}
        onClearSelection={actions.clearSelection}
        onSelectAllVisible={actions.handleSelectAll}
        onBulkRemove={uiActions.handleBulkRemove}
        onBulkPrintLabels={uiActions.handleBulkPrintLabels}
        onBulkPrintSelected={uiActions.handleBulkPrintSelected}
        onBulkSendEmail={uiActions.handleBulkSendEmail}
        onBulkSearchDocument={uiActions.handleBulkSearchDocument}
        onOpenBulkEdit={() => uiActions.setIsBulkEditModalOpen(true)}
        theme={ui.theme}
      />

      <BulkEditModal
        isOpen={ui.isBulkEditModalOpen}
        onClose={() => uiActions.setIsBulkEditModalOpen(false)}
        onApply={uiActions.handleBulkEdit}
        theme={ui.theme}
        selectedCount={state.selectedIds.size}
      />

      <EventSettingsDrawer 
        isOpen={ui.isSettingsDrawerOpen}
        onClose={() => uiActions.setIsSettingsDrawerOpen(false)}
        preferences={state.preferences}
        onUpdatePreferences={actions.togglePreference}
        onClearLocalData={actions.clearLocalData}
        theme={ui.theme}
      />

      <CreateEventModal 
        isOpen={ui.isCreateModalOpen}
        onClose={() => {
          uiActions.setIsCreateModalOpen(false);
          uiActions.setEditingItem(null);
        }}
        onSubmit={uiActions.handleCreateOrUpdate}
        editingItem={ui.editingItem}
        theme={ui.theme}
      />
    </div>
  );
};

export default EventManagementPage;

// Forced GitHub sync
