/**
 * EventsPage - Página unificada de gestión de eventos
 * 
 * Combina EventManagementPage y EventCapturePage en una sola vista
 * con tabs para alternar entre historial y captura.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/stores';
import { useToastStore } from '@/stores';
import { 
  RefreshCw, 
  Plus, 
  Search,
  Home,
  Zap,
  ChevronLeft,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';

// Hooks
import { useEventUI } from './hooks/useEventUI';
import { useEventDatabase } from './hooks/useEventDatabase';
import { useScannerEngine } from '../../hooks/useScannerEngine';
import { useProductivity } from '../counting/hooks/useProductivity';
import { useSyncStore } from '@/stores';

// Components
import { EventHeader } from './components/EventHeader';
import { EventListPanel } from './components/EventListPanel';
import { EventOverlays } from './components/EventOverlays';
import { EventFilterDrawer } from './components/EventFilterDrawer';
import { EventDetailModal } from './components/EventDetailModal';
import { SmartDock } from '../../components/SmartDock';
import { CameraScanner } from '../../components/CameraScanner';
import { ScannerTargetOverlay } from '../../shared/components/scanner/ScannerTargetOverlay';
import { ModuleHeader } from '../../shared/components/layout/ModuleHeader';
import { CaptureLayout } from '../../shared/components/layout/CaptureLayout';
import { SyncDiagnosticsPanel } from '../sync/components/SyncDiagnosticsPanel';
import { EventItemRow } from './components/EventItemRow';
import { EventCaptureModal } from './components/EventCaptureModal';
import { ProductivityDashboard } from '../counting/components/ProductivityDashboard';

type PageMode = 'management' | 'capture';

export const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const syncStore = useSyncStore();

  // Estado de modo (management vs capture)
  const [pageMode, setPageMode] = useState<PageMode>('management');

  // ==================== MANAGEMENT STATE ====================
  const { ui, actions, db } = useEventUI();
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Virtualizers
  const pendingRef = useRef<HTMLDivElement>(null);
  const destinedRef = useRef<HTMLDivElement>(null);
  const adjustedRef = useRef<HTMLDivElement>(null);

  const pendingVirtualizer = useVirtualizer({
    count: (ui.pendingGrouped?.length) || 0,
    getScrollElement: () => pendingRef.current,
    estimateSize: (index) => {
      if (ui.pendingGrouped?.[index]?.type === 'header') return 60;
      const baseHeight = db.preferences.compactView ? 100 : 160;
      return ui.expandedPanel === 'pending' ? baseHeight * 1.2 : baseHeight;
    },
    overscan: 5,
  });

  const destinedVirtualizer = useVirtualizer({
    count: ui.destinedGrouped?.length || 0,
    getScrollElement: () => destinedRef.current,
    estimateSize: (index) => {
      if (ui.destinedGrouped?.[index]?.type === 'header') return 60;
      const baseHeight = db.preferences.compactView ? 100 : 160;
      return ui.expandedPanel === 'destined' ? baseHeight * 1.2 : baseHeight;
    },
    overscan: 5,
  });

  const adjustedVirtualizer = useVirtualizer({
    count: (ui.adjustedGrouped?.length) || 0,
    getScrollElement: () => adjustedRef.current,
    estimateSize: (index) => {
      if (ui.adjustedGrouped?.[index]?.type === 'header') return 60;
      const baseHeight = db.preferences.compactView ? 100 : 160;
      return ui.expandedPanel === 'adjusted' ? baseHeight * 1.2 : baseHeight;
    },
    overscan: 5,
  });

  // ==================== CAPTURE STATE ====================
  const eventDb = useEventDatabase();
  const engine = useScannerEngine();
  
  const [isProductivityVisible, setIsProductivityVisible] = useState(false);
  const { stats, formattedDuration } = useProductivity(
    eventDb.processedEvents.map(e => ({ 
      barcode: e.barcode || `event-${e.id}`, 
      totalQuantity: 1 
    }))
  );

  // Atajos de teclado
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'p' && e.altKey) {
        e.preventDefault();
        setIsProductivityVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, []);

  // ==================== HANDLERS ====================

  const handleSingleRemove = useCallback(async (item: any) => {
    const confirm = window.confirm(`¿RETIRAR ${item.productName}? ESTA ACCIÓN ES IRREVERSIBLE.`);
    if (confirm) {
      try {
        await db.actions.deleteEvent(item.id);
        toast.success('Registro eliminado correctamente');
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar registro');
      }
    }
  }, [db.actions]);

  const handleViewDetail = useCallback((item: any) => {
    setSelectedEvent(item);
    setIsDetailModalOpen(true);
  }, []);

  const handleAddItem = useCallback(async (data: any) => {
    const result = await eventDb.actions.handleAddItem(data);
    if (result) {
      engine.resetScanner();
    }
  }, [eventDb.actions, engine]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Eliminar este registro?')) {
      const itemToDelete = eventDb.processedEvents.find(i => i.id === id);
      if (itemToDelete) {
        await eventDb.actions.handleRemoveItem(itemToDelete);
      }
    }
  }, [eventDb.processedEvents, eventDb.actions]);

  // ==================== RENDER HELPERS ====================

  const sortedItems = useMemo(() => {
    return [...eventDb.processedEvents]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [eventDb.processedEvents]);

  // ==================== CAPTURE MODE COMPONENTS ====================

  const captureHeader = (
    <ModuleHeader 
      title="Captura Eventos"
      subtitle="Gestión de Diferencias"
      hideTitleOnMobile={true}
      hideBackButtonOnMobile={true}
      onBack={() => setPageMode('management')}
      actions={
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setIsProductivityVisible(prev => !prev)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isProductivityVisible 
                ? 'bg-amber-500 text-black' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
            title="Productividad (Alt+P)"
          >
            <Zap className="w-5 h-5" />
          </button>
          <button
            onClick={() => engine.setIsSyncModalOpen(true)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              syncStore.incidents.length > 0 
                ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
            title="Sincronización"
          >
             <RefreshCw className={`w-5 h-5 ${syncStore.isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => engine.setIsSearchActive(!engine.isSearchActive)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              engine.isSearchActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      }
    />
  );

  const mobileDock = (
    <SmartDock 
      items={[
        { id: 'home', icon: Home, onClick: () => setPageMode('management') },
        { 
          id: 'search', 
          icon: Search, 
          onClick: () => engine.setIsSearchActive(!engine.isSearchActive),
          isActive: engine.isSearchActive,
          activeColor: 'text-blue-400',
          activeBg: 'bg-blue-500/20'
        },
        {
          id: 'sync',
          icon: RefreshCw,
          onClick: () => engine.setIsSyncModalOpen(true),
          isActive: syncStore.incidents.length > 0 || syncStore.isSyncing,
          activeColor: syncStore.incidents.length > 0 ? 'text-rose-500' : 'text-blue-400',
          activeBg: syncStore.incidents.length > 0 ? 'bg-rose-500/20' : 'bg-blue-500/20'
        }
      ]} 
      variant="contextual" 
    />
  );

  const cameraArea = (
    <AnimatePresence>
      {engine.capture.isCameraActive && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 260, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-black overflow-hidden border-b-2 border-blue-500/50 shadow-inner relative"
        >
          <CameraScanner 
            onScan={engine.handleScan} 
            onClose={() => engine.capture.setIsCameraActive(false)} 
            inline={true}
            isTriggered={true}
          />
          <ScannerTargetOverlay feedback={engine.feedback} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const modalForm = (
    <EventCaptureModal
      isOpen={engine.isModalOpen}
      onClose={() => engine.setIsModalOpen(false)}
      scannedBarcode={engine.scannedBarcode}
      product={engine.product}
      onAddItem={handleAddItem}
    />
  );

  // ==================== MAIN RENDER ====================

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans selection:bg-brand-warning/30 transition-colors duration-500 ${
      settings.theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-stone-200/50 text-slate-900'
    }`}>
      {/* Page Header con Tabs */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            {pageMode === 'management' ? 'Eventos' : 'Captura'}
          </h1>
          {pageMode === 'management' && (
            <button
              onClick={() => setPageMode('capture')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-xl font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
          )}
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setPageMode('management')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              pageMode === 'management'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          >
            Historial
          </button>
          <button
            onClick={() => setPageMode('capture')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              pageMode === 'capture'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          >
            Captura
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {pageMode === 'management' ? (
            <motion.div
              key="management"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              {/* HEADER */}
              <EventHeader 
                totalCount={db.totalCount}
                pendingOperations={db.pendingOperations || 0}
                isSyncing={ui.isSyncing}
                theme={(settings.theme as 'dark' | 'light' | 'high-contrast') || 'dark'}
                onNavigateExpiry={() => navigate('/expiry')}
                onToggleTheme={() => {}}
                onOpenSettings={() => actions.setIsFilterDrawerOpen(true)}
              />

              {/* FILTERS */}
              <EventOverlays
                ui={ui}
                actions={actions}
                db={db}
                settings={settings}
              />

              {/* PANELS */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <EventListPanel
                  title="En Espera"
                  icon={AlertCircle}
                  grouped={ui.pendingGrouped}
                  virtualizer={pendingVirtualizer}
                  scrollRef={pendingRef}
                  expandedPanel={ui.expandedPanel}
                  onTogglePanel={() => actions.togglePanel('pending')}
                  onViewDetail={handleViewDetail}
                  onRemove={handleSingleRemove}
                />
                
                <EventListPanel
                  title="Destinados"
                  icon={Truck}
                  grouped={ui.destinedGrouped}
                  virtualizer={destinedVirtualizer}
                  scrollRef={destinedRef}
                  expandedPanel={ui.expandedPanel}
                  onTogglePanel={() => actions.togglePanel('destined')}
                  onViewDetail={handleViewDetail}
                  onRemove={handleSingleRemove}
                />
                
                <EventListPanel
                  title="Ajustados"
                  icon={CheckCircle2}
                  grouped={ui.adjustedGrouped}
                  virtualizer={adjustedVirtualizer}
                  scrollRef={adjustedRef}
                  expandedPanel={ui.expandedPanel}
                  onTogglePanel={() => actions.togglePanel('adjusted')}
                  onViewDetail={handleViewDetail}
                  onRemove={handleSingleRemove}
                />
              </div>

              {/* FILTER DRAWER */}
              <EventFilterDrawer
                isOpen={ui.isFilterDrawerOpen}
                onClose={actions.closeFilterDrawer}
                eventTypes={db.eventTypes || []}
                selectedEvents={db.selectedEvents}
                onToggleEvent={actions.handleToggleEvent}
                onClearFilters={actions.clearFilters}
                activeFiltersCount={ui.activeFiltersCount}
                dateRange={ui.dateRange}
                onSetDateRange={actions.setDateRange}
                theme={(settings.theme as 'dark' | 'light' | 'high-contrast') || 'dark'}
              />
            </motion.div>
          ) : (
            <motion.div
              key="capture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <CaptureLayout
                header={captureHeader}
                footer={mobileDock}
                extra={cameraArea}
                filters={
                  <div className="flex gap-2">
                    <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                      Eventos Recientes
                    </div>
                  </div>
                }
                modalForm={modalForm}
                inputValue={engine.isSearchActive ? engine.searchQuery : engine.capture.inputValue}
                onInputChange={engine.isSearchActive ? engine.setSearchQuery : engine.capture.setInputValue}
                onInputSubmit={engine.capture.handleManualSubmit}
                onCameraToggle={() => engine.capture.setIsCameraActive(!engine.capture.isCameraActive)}
                inputPlaceholder={engine.isSearchActive ? "Buscar..." : "Escanear o digitar..."}
                inputRef={engine.capture.inputRef}
                readOnly={engine.isModalOpen}
                list={
                  <div className="space-y-4">
                    {sortedItems.map((item) => (
                      <EventItemRow 
                        key={item.id} 
                        item={item} 
                        onDelete={handleDelete} 
                      />
                    ))}
                  </div>
                }
                emptyState={
                  sortedItems.length === 0 && (
                    <div className="text-center py-12 text-slate-500 font-bold text-sm uppercase tracking-widest">
                      No hay eventos recientes
                    </div>
                  )
                }
              />

              <SyncDiagnosticsPanel 
                isOpen={engine.isSyncModalOpen} 
                onClose={() => engine.setIsSyncModalOpen(false)} 
              />

              <ProductivityDashboard 
                stats={stats}
                formattedDuration={formattedDuration}
                isVisible={isProductivityVisible}
                onToggle={() => setIsProductivityVisible(prev => !prev)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
};

export default EventsPage;
