
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useCountingLogic } from './hooks/useCountingLogic';
import { CountingCameraView } from './components/CountingCameraView';
import { ScannerToolsSheet } from './components/ScannerToolsSheet';
import { ScreenLockOverlay } from '../../shared/components/ui/ScreenLockOverlay';
import { ExpirationModal } from '../expiry/components/ExpirationModal';
import { Loader2 } from 'lucide-react';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { useSyncStore } from '../../store/useSyncStore';
import { LocationSelectorModal } from '../../shared/components/ui/LocationSelectorModal';
import * as sessionService from '../../services/sessionService';
import * as syncManager from '../../services/syncManager';

export const CountingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSyncing } = useSyncStore();
  const { state, actions, sessionData } = useCountingLogic(id, () => navigate('/reports'));
  const { isLocked, unlock, lock } = useAutoLock(4000, sessionData.session?.isAutoLockEnabled ?? true);

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

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
      console.error("Manual sync failed", e);
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
 
 <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
 </div>
 );
};

export default CountingPage;

// Forced GitHub sync
