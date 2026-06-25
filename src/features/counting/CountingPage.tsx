
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useCountingLogic } from './hooks/useCountingLogic';
import { useProductivity } from './hooks/useProductivity';
import { useTurboMode } from './hooks/useTurboMode';
import { CountingCameraView } from './components/CountingCameraView';
import { ScannerToolsSheet } from './components/ScannerToolsSheet';
import { ProductivityDashboard } from './components/ProductivityDashboard';
import { TurboModeOverlay } from './components/TurboModeOverlay';
import { ScreenLockOverlay } from '../../shared/components/ui/ScreenLockOverlay';
import { ExpirationModal } from '../expiry/components/ExpirationModal';
import { TestModeExpiryModal } from './components/TestModeExpiryModal';
import { Loader2 } from 'lucide-react';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { useSyncStore } from '@/stores';
import { LocationSelectorModal } from '../../shared/components/ui/LocationSelectorModal';
import { SoundFX } from '../../services/audio';
import { normalizeSku } from '../../services/utils';
import * as sessionService from '../../services/sessionService';
import * as syncManager from '../../services/syncManager';
import { logger } from '../../services/logger';

export const CountingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSyncing } = useSyncStore();
  const { state, actions, sessionData } = useCountingLogic(id, () => navigate('/reports'));
  const { isLocked, unlock, lock } = useAutoLock(4000, sessionData.session?.isAutoLockEnabled ?? true);

  // Productivity tracking
  const [isProductivityVisible, setIsProductivityVisible] = useState(false);
  const { stats, formattedDuration } = useProductivity(sessionData.history);

  // Turbo mode
  const turbo = useTurboMode();

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  
  // Manual mode (sin cámara)
  const [isManualMode, setIsManualMode] = useState(false);
  
  // Expiry modal for test mode - when scanning expected items for the first time
  const [pendingExpiryBarcode, setPendingExpiryBarcode] = useState<string | null>(null);
  
  // Track scanned expected items (for first-time detection in test mode)
  const scannedExpectedItems = useRef<Set<string>>(new Set());
  
  // Check if session is in test mode with expected order
  const isTestMode = !!sessionData.expectedOrder;
  
  // Handle scan in test mode - detect first-time scans from expected order
  const handleScanInTestMode = useCallback((barcode: string) => {
    if (!isTestMode || !sessionData.expectedOrder) return false;
    
    const normBarcode = normalizeSku(barcode);
    
    // Check if this barcode is in the expected order
    const isExpectedItem = sessionData.expectedOrder.items.some(
      item => normalizeSku(item.barcode) === normBarcode
    );
    
    if (isExpectedItem && !scannedExpectedItems.current.has(normBarcode)) {
      // First time scanning this expected item - trigger expiry modal
      scannedExpectedItems.current.add(normBarcode);
      setPendingExpiryBarcode(barcode);
      return true;
    }
    
    return false;
  }, [isTestMode, sessionData.expectedOrder]);
  
  // Override handleExternalScan to detect first-time expected item scans
  const originalHandleScan = actions.handleExternalScan;
  actions.handleExternalScan = useCallback(async (barcode: string, qty?: number) => {
    // Try test mode detection first
    const handledByTestMode = handleScanInTestMode(barcode);
    if (handledByTestMode) return;
    
    // Fall back to normal scan
    originalHandleScan(barcode, qty);
  }, [handleScanInTestMode, originalHandleScan]);

  // Atajos de teclado para agilizar conteo en escritorio o terminales PDA con teclado físico grande
  useEffect(() => {
    if (isLocked || state.status === 'awaiting_pharma' || state.isLoading) return;

    const handleShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === '1') {
        e.preventDefault();
        actions.setMultiplier(1);
        SoundFX.play('increment');
      } else if (e.key === '2') {
        e.preventDefault();
        actions.setMultiplier(6);
        SoundFX.play('increment');
      } else if (e.key === '3') {
        e.preventDefault();
        actions.setMultiplier(12);
        SoundFX.play('increment');
      } else if (e.key === '4') {
        e.preventDefault();
        actions.setMultiplier(24);
        SoundFX.play('increment');
      } else if (e.key.toLowerCase() === 'l' && e.altKey) {
        e.preventDefault();
        lock();
      } else if (e.key.toLowerCase() === 't' && e.altKey) {
        e.preventDefault();
        setIsToolsOpen(prev => !prev);
      } else if (e.key.toLowerCase() === 'p' && e.altKey) {
        e.preventDefault();
        setIsProductivityVisible(prev => !prev);
      } else if (e.key.toLowerCase() === 't' && e.altKey && e.shiftKey) {
        e.preventDefault();
        turbo.toggle();
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [isLocked, state.status, state.isLoading, actions, lock, turbo]);

  // Procesar escaneo inicial si viene de una redirección automática
  useEffect(() => {
    const initialScan = (location.state as any)?.initialScan;
    if (initialScan && !state.isLoading && sessionData.session) {
      actions.handleExternalScan(initialScan, state.multiplier);
      // Limpiar el estado para no re-procesar en re-renders
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, state.isLoading, sessionData.session, actions, navigate, location.pathname, state.multiplier]);

  useHIDScanner({
    onScan: (barcode) => !isLocked && state.status !== 'awaiting_pharma' && actions.handleExternalScan(barcode, state.multiplier),
    isEnabled: !isToolsOpen,
  });

  const handleFinalize = async () => {
    if (sessionData.session) {
      await sessionService.closeSession(sessionData.session.id);
      navigate('/', { state: { message: '¡Orden completada y enviada!' } });
    }
  };

  const handleManualSync = async () => {
    if (!id) return;
    try {
      const groups = await syncManager.getPendingUploadGroups();
      const sessionGroup = groups.find(g => g.sessionIds.includes(id));
      if (sessionGroup) {
        await syncManager.performBatchUpload(sessionGroup);
      }
    } catch (e) {
      logger.error('CountingPage', 'Manual sync failed', String(e));
    }
  };

  if (state.isLoading) {
 return (
 <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white">
 <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
 <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Kernel_Booting...</p>
 </div>
 );
 }

 if (!sessionData.session) return <Navigate to="/reports" />;

 return (
 <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white font-mono overflow-hidden select-none">
 <CountingCameraView 
 onBack={() => navigate('/reports')}
 onScan={(code, qty) => actions.handleExternalScan(code, qty ?? state.multiplier)}
 onFinalize={handleFinalize}
 onOpenTools={() => setIsToolsOpen(true)}
 onLock={lock}
 onSync={handleManualSync}
 isSyncing={isSyncing}
 location={state.currentLocation}
 onChangeLocation={() => setIsLocationModalOpen(true)}
 activeBarcode={state.activeBarcode}
 activeProduct={state.activeProduct}
 optimisticQty={state.optimisticQty}
 feedback={state.feedback}
 items={sessionData.history}
 multiplier={state.multiplier}
 onMultiplierChange={actions.setMultiplier}
 labelPhoto={sessionData.session.labelPhoto}
 potentialMatch={state.potentialMatch}
 onApplyMatch={actions.applyPotentialMatch}
 onDismissMatch={actions.dismissPotentialMatch}
 isManualMode={isManualMode}
 onToggleManualMode={() => setIsManualMode(!isManualMode)}
 expectedOrder={sessionData.expectedOrder}
 scannedBarcodes={scannedExpectedItems.current}
 />

 <ScannerToolsSheet 
 isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)}
 hasActiveItem={!!state.activeBarcode} location={state.currentLocation}
 label={sessionData.session.logisticsLabel} onChangeLocation={() => setIsLocationModalOpen(true)}
 isAutoLockEnabled={sessionData.session.isAutoLockEnabled ?? true}
 onToggleAutoLock={actions.toggleAutoLock}
 onChangeLabel={() => {}} onShowLabel={() => {}}
 onReset={async () => { if(confirm("¿Vaciar bulto?")) actions.undoLastScan(); }} onPrintSummary={() => {}}
 />

 <LocationSelectorModal 
 isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)}
 currentLocation={state.currentLocation} onSelect={(loc) => { actions.setCurrentLocation(loc); setIsLocationModalOpen(false); }}
 />

 {state.status === 'awaiting_pharma' && state.activeBarcode && (
 <ExpirationModal 
 productMap={{ [state.activeBarcode]: state.activeProduct }}
 onComplete={(data) => actions.handlePharmaComplete(data.mm, data.yyyy, data.barcode)} 
 onCancel={actions.cancelPharma}
 />
 )}
 
 {/* Expiry Modal for Test Mode - First scan of expected items */}
 {pendingExpiryBarcode && (() => {
 const expectedItem = sessionData.expectedOrder?.items.find(
 item => normalizeSku(item.barcode) === normalizeSku(pendingExpiryBarcode)
 );
 return (
 <TestModeExpiryModal
 barcode={pendingExpiryBarcode}
 productName={expectedItem?.name || 'Producto'}
 onComplete={async (data) => {
 // Complete the scan with expiry date
 await actions.handleExternalScan(pendingExpiryBarcode, state.multiplier);
 // Store expiry info if needed
 setPendingExpiryBarcode(null);
 }}
 onCancel={() => setPendingExpiryBarcode(null)}
 />
 );
 })()}
 
 <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />

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
   productName={sessionData.history.find(i => i.barcode === turbo.lastScannedBarcode)?.productName}
 />

 </div>
 );
};

export default CountingPage;

