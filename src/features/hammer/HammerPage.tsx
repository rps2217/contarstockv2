
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHammerLogic } from './hooks/useHammerLogic';
import { useLocationManager } from '../../shared/hooks/useLocationManager';
import { migrateMassiveToMaster, importManifestFromCloud } from '../../services/massiveSync';
import { MassiveToolsSheet } from './components/MassiveToolsSheet';
import { BarcodeLabelModal } from '../../shared/components/ui/BarcodeLabelModal';
import { LocationSelectorModal } from '../../shared/components/ui/LocationSelectorModal';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { SoundFX } from '../../services/audio';
import { HammerCameraView } from './components/HammerCameraView';

import { useAppStore } from '../../store/mainAppStore';

export const HammerPage: React.FC = () => {
 const navigate = useNavigate();
 const { batchId = 'CORE' } = useParams();
 const { state, actions } = useHammerLogic(batchId);
 const { settings, updateSetting } = useAppStore();
 const locManager = useLocationManager(`hammer_loc_${batchId}`);

 const [isToolsOpen, setIsToolsOpen] = useState(false);
 const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
 const [isMigrating, setIsMigrating] = useState(false);
 const [isDownloading, setIsDownloading] = useState(false);

 // ESCUCHA DE HARDWARE (HID LASER)
 useHIDScanner({
 onScan: actions.registerScan,
 isEnabled: !isMigrating && !isToolsOpen,
 maxLatency: 40 // Más estricto para ráfagas industriales
 });

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

 const handleDownloadStock = async () => {
 setIsDownloading(true);
 try {
 await importManifestFromCloud(batchId);
 SoundFX.play('success');
 setIsToolsOpen(false);
 } catch (err: any) {
 SoundFX.play('error');
 alert(`Error: ${err.message}`);
 } finally {
 setIsDownloading(false);
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
 optimisticQty={state.optimisticQty}
 feedback={state.feedback}
 items={state.items}
 isVoiceEnabled={settings.ttsEnabled}
 onSync={actions.syncToCloud}
 isSyncing={state.isSyncing}
 />

 <MassiveToolsSheet 
 isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)}
 batchId={batchId} hasActiveItem={!!state.activeBarcode}
 location={locManager.location} onChangeLocation={locManager.openModal}
 onShowLabel={() => setIsLabelModalOpen(true)} onReset={() => actions.removeItem('ALL')}
 onImport={handleDownloadStock}
 onSync={actions.syncToCloud}
 isSyncing={state.isSyncing}
 onPrintSummary={() => {}}
 isVoiceEnabled={settings.ttsEnabled}
 onToggleVoice={() => updateSetting('ttsEnabled', !settings.ttsEnabled)}
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
 </div>
 );
};

export default HammerPage;

