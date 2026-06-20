import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Trash2, 
  X, 
  CornerDownLeft, 
  Package, 
  Hash, 
  Truck,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Home,
  Search,
  RefreshCw,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from '@/stores';
import { normalizeSku } from '../../services/utils';
import { useEventDatabase } from './hooks/useEventDatabase';
import { useScannerEngine } from '../../hooks/useScannerEngine';
import { useSyncStore } from '@/stores';
import { SmartDock } from '../../components/SmartDock';
import { CameraScanner } from '../../components/CameraScanner';
import { ScannerTargetOverlay } from '../../shared/components/scanner/ScannerTargetOverlay';
import { ModuleHeader } from '../../shared/components/layout/ModuleHeader';
import { CaptureLayout } from '../../shared/components/layout/CaptureLayout';
import { SyncDiagnosticsPanel } from '../sync/components/SyncDiagnosticsPanel';
import { EventItemRow } from './components/EventItemRow';
import { EventCaptureModal } from './components/EventCaptureModal';
import { ProductivityDashboard } from '../counting/components/ProductivityDashboard';
import { useProductivity } from '../counting/hooks/useProductivity';

export const EventCapturePage: React.FC = () => {
  const navigate = useNavigate();
  const db = useEventDatabase();
  const syncStore = useSyncStore();
  const engine = useScannerEngine();

  // Productivity tracking
  const [isProductivityVisible, setIsProductivityVisible] = useState(false);
  const { stats, formattedDuration } = useProductivity(
    db.processedEvents.map(e => ({ 
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

  const handleAddItem = useCallback(async (data: any) => {
    const result = await db.actions.handleAddItem(data);
    if (result) {
      engine.resetScanner();
    }
  }, [db.actions, engine]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Eliminar este registro?')) {
      const itemToDelete = db.processedEvents.find(i => i.id === id);
      if (itemToDelete) {
        await db.actions.handleRemoveItem(itemToDelete);
        
      }
    }
  }, [db.processedEvents, db.actions]);

  const sortedItems = useMemo(() => {
    return [...db.processedEvents]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [db.processedEvents]);

  const header = (
    <ModuleHeader 
      title="Captura Eventos"
      subtitle="Gestión de Diferencias"
      hideTitleOnMobile={true}
      hideBackButtonOnMobile={true}
      onBack={() => navigate('/')}
      actions={
        <div className="hidden md:flex items-center gap-2">
          {/* PRODUCTIVITY BUTTON */}
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

          {/* SYNC STATUS INDICATOR - Desktop */}
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

  const dockItems = [
    {
      id: 'home',
      icon: Home,
      onClick: () => navigate('/'),
    },
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
  ];

  const mobileDock = <SmartDock items={dockItems} variant="contextual" />;

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

  const filters = (
    <div className="flex gap-2">
      <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
        Eventos Recientes
      </div>
    </div>
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

  return (
    <>
      <CaptureLayout
        header={header}
        footer={mobileDock}
        extra={cameraArea}
        filters={filters}
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

      {/* PRODUCTIVITY DASHBOARD */}
      <ProductivityDashboard 
        stats={stats}
        formattedDuration={formattedDuration}
        isVisible={isProductivityVisible}
        onToggle={() => setIsProductivityVisible(prev => !prev)}
      />
    </>
  );
};

export default EventCapturePage;

