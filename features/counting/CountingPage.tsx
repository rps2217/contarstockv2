
import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useCountingLogic } from './hooks/useCountingLogic';
import { CountingCameraView } from './components/CountingCameraView';
import { ScannerToolsSheet } from './components/ScannerToolsSheet';
import { ScreenLockOverlay } from '../../shared/components/ui/ScreenLockOverlay';
import { ExpirationModal } from '../expiry/components/ExpirationModal';
import { Loader2 } from 'lucide-react';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { LocationSelectorModal } from '../../shared/components/ui/LocationSelectorModal';

export const CountingPage: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const { state, actions, sessionData } = useCountingLogic(id, () => navigate('/reports'));
 const { isLocked, unlock, lock } = useAutoLock(4000);

 const [isToolsOpen, setIsToolsOpen] = useState(false);
 const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

 useHIDScanner({
 onScan: (barcode) => !isLocked && state.status !== 'expiring' && actions.handleExternalScan(barcode, state.multiplier),
 isEnabled: !isToolsOpen,
 });

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
 onOpenTools={() => setIsToolsOpen(true)}
 onLock={lock}
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
 />

 <ScannerToolsSheet 
 isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)}
 hasActiveItem={!!state.activeBarcode} location={state.currentLocation}
 label={sessionData.session.logisticsLabel} onChangeLocation={() => setIsLocationModalOpen(true)}
 onChangeLabel={() => {}} onShowLabel={() => {}}
 onReset={async () => { if(confirm("¿Vaciar bulto?")) actions.undoLastScan(); }} onPrintSummary={() => {}}
 />

 <LocationSelectorModal 
 isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)}
 currentLocation={state.currentLocation} onSelect={(loc) => { actions.setCurrentLocation(loc); setIsLocationModalOpen(false); }}
 />

 {state.status === 'expiring' && state.activeBarcode && (
 <ExpirationModal 
 productName={state.activeProduct?.name || state.activeBarcode} 
 onComplete={actions.handlePharmaComplete} 
 />
 )}
 
 <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
 </div>
 );
};

export default CountingPage;
