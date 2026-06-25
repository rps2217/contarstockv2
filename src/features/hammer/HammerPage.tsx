import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHammerLogic } from './hooks/useHammerLogic';
import { useLocationManager } from '../../shared/hooks/useLocationManager';
import { migrateMassiveToMaster, importManifestFromCloud, importExpectedOrderFromCloud, importLocalExpectedOrderToHammer, migrateHammerManifestToExpectedOrders } from '../../services/massiveSync';
import { MassiveToolsSheet } from './components/MassiveToolsSheet';
import { LoadTheoreticalModal } from './components/LoadTheoreticalModal';
import { BarcodeLabelModal } from '../../shared/components/ui/BarcodeLabelModal';
import { LocationSelectorModal } from '../../shared/components/ui/LocationSelectorModal';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { HammerCameraView } from './components/HammerCameraView';
import { useProductivity } from '../counting/hooks/useProductivity';
import { useTurboMode } from '../counting/hooks/useTurboMode';
import { ProductivityDashboard } from '../counting/components/ProductivityDashboard';
import { TurboModeOverlay } from '../counting/components/TurboModeOverlay';
import { useAppStore } from '@/stores';
import { exportHammerToExcel } from '../../services/export';

export const HammerPage: React.FC = () => {
  const navigate = useNavigate();
  const { batchId = 'CORE' } = useParams();
  const { state, actions } = useHammerLogic(batchId);
  const { settings, updateSetting } = useAppStore();
  const locManager = useLocationManager(`hammer_loc_${batchId}`);

  // Productivity tracking
  const [isProductivityVisible, setIsProductivityVisible] = useState(false);
  const { stats, formattedDuration } = useProductivity(state.items.map(i => ({ barcode: i.barcode, totalQuantity: i.totalQuantity })));

  // Turbo mode
  const turbo = useTurboMode();

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isTheoreticalModalOpen, setIsTheoreticalModalOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Manual mode (sin cámara)
  const [isManualMode, setIsManualMode] = useState(false);

  // Destructure new sync states
  const { pendingWrites, syncError } = state;

  // ESCUCHA DE HARDWARE (HID LASER)
  useHIDScanner({
    onScan: (barcode) => {
      actions.registerScan(barcode);
      if (turbo.isActive) {
        turbo.registerScan(barcode, 1);
      }
    },
    isEnabled: !isMigrating && !isToolsOpen && !isTheoreticalModalOpen,
    maxLatency: 40 // Más estricto para ráfagas industriales
  });

  // Atajos de teclado
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key.toLowerCase() === 'p' && e.altKey) {
        e.preventDefault();
        setIsProductivityVisible(prev => !prev);
      } else if (e.key.toLowerCase() === 't' && e.altKey && e.shiftKey) {
        e.preventDefault();
        turbo.toggle();
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [turbo]);

  useEffect(() => {
    actions.setCurrentLocation(locManager.location);
  }, [locManager.location, actions]);

  const handleFinalize = async () => {
    if (!state.items.length || isMigrating) return;
    if (!confirm("¿Cerrar auditoría y consolidar registros?")) return;
    setIsMigrating(true);
    try {
      await migrateMassiveToMaster(batchId);
      navigate('/reports?type=hammer');
    } catch (err) {
      setIsMigrating(false);
    }
  };

  const handleImportGeneralStock = async () => {
    await importManifestFromCloud(batchId);
  };

  const handleImportExpectedOrder = async (orderId: string) => {
    await importExpectedOrderFromCloud(batchId, orderId);
  };

  const handleImportLocalExpectedOrder = async (orderId: string) => {
    await importLocalExpectedOrderToHammer(batchId, orderId);
  };

  const handleStartTestCounting = async () => {
    if (state.items.length === 0) {
      alert('Primero importa una carga teórica antes de iniciar el conteo de prueba');
      return;
    }
    try {
      const { sessionId } = await migrateHammerManifestToExpectedOrders(batchId);
      navigate(`/counting/${sessionId}`);
    } catch (err) {
      console.error('Error al iniciar conteo de prueba:', err);
      alert('Error al iniciar el conteo de prueba');
    }
  };

  const activeItem = state.items.find(i => i.barcode === state.activeBarcode);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col font-mono bg-black select-none overflow-hidden text-white">
      <HammerCameraView 
        onBack={() => navigate('/dashboard')}
        onScan={actions.registerScan}
        onRemove={actions.removeItem}
        onFinalize={handleFinalize}
        onOpenTools={() => setIsToolsOpen(true)}
        location={locManager.location}
        onChangeLocation={locManager.openModal}
        activeBarcode={state.activeBarcode}
        activeProduct={state.activeProduct}
        feedback={state.feedback}
        items={state.items}
        isVoiceEnabled={settings.ttsEnabled}
        onSync={actions.syncToCloud}
        isSyncing={state.isSyncing}
        autoSyncEnabled={state.autoSyncEnabled}
        pendingWrites={pendingWrites}
        syncError={syncError}
        onRetrySync={actions.syncToCloud}
        stats={{
          itemsPerMinute: stats.itemsPerMinute,
          totalItems: state.items.length,
          lastScanTime: stats.lastScanTime,
          expectedItems: state.items.some(i => i.expectedQty !== undefined) ? state.items.reduce((acc, i) => acc + (i.expectedQty || 0), 0) : undefined
        }}
        formattedDuration={formattedDuration}
        isManualMode={isManualMode}
        onToggleManualMode={() => setIsManualMode(!isManualMode)}
      />

      <MassiveToolsSheet 
        isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)}
        batchId={batchId} hasActiveItem={!!state.activeBarcode}
        location={locManager.location} onChangeLocation={locManager.openModal}
        onShowLabel={() => setIsLabelModalOpen(true)} onReset={() => actions.removeItem('ALL')}
        onImport={() => setIsTheoreticalModalOpen(true)}
        onSync={actions.syncToCloud}
        isSyncing={state.isSyncing}
        onPrintSummary={() => {}}
        isVoiceEnabled={settings.ttsEnabled}
        onToggleVoice={() => updateSetting('ttsEnabled', !settings.ttsEnabled)}
        autoSyncEnabled={state.autoSyncEnabled}
        onToggleAutoSync={actions.toggleAutoSync}
        onDownloadExcel={() => exportHammerToExcel(batchId, state.items)}
        onStartTestCounting={handleStartTestCounting}
        hasManifestItems={state.items.some(i => i.expectedQty !== undefined)}
      />

      <LocationSelectorModal 
        isOpen={locManager.isModalOpen} onClose={locManager.closeModal}
        currentLocation={locManager.location} onSelect={locManager.setLocation}
      />

      {state.activeBarcode && (
        <BarcodeLabelModal 
          isOpen={isLabelModalOpen} onClose={() => setIsLabelModalOpen(false)}
          barcode={state.activeBarcode} productName={state.activeProduct?.name || activeItem?.name}
          quantity={state.optimisticQty ?? 0}
        />
      )}

      <LoadTheoreticalModal
        isOpen={isTheoreticalModalOpen}
        onClose={() => setIsTheoreticalModalOpen(false)}
        onImportGeneralStock={handleImportGeneralStock}
        onImportExpectedOrder={handleImportExpectedOrder}
        onImportLocalExpectedOrder={handleImportLocalExpectedOrder}
      />

      {/* PRODUCTIVITY DASHBOARD */}
      <ProductivityDashboard 
        stats={stats}
        formattedDuration={formattedDuration}
        isVisible={isProductivityVisible}
        onToggle={() => setIsProductivityVisible(prev => !prev)}
      />

      {/* TURBO MODE OVERLAY */}
      <TurboModeOverlay
        isActive={turbo.isActive}
        lastQuantity={turbo.lastQuantity}
        scanCount={turbo.scanCount}
        productName={state.items.find(i => i.barcode === turbo.lastScannedBarcode)?.name}
      />
    </div>
  );
};

export default HammerPage;
