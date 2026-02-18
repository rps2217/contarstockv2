
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHammerLogic } from './hooks/useHammerLogic';
import { useLocationManager } from '../../shared/hooks/useLocationManager';
import { migrateMassiveToMaster, importManifestFromCloud } from '../../services/massiveSync';
import { IndustrialDisplay } from '../../shared/components/ui/IndustrialDisplay';
import { MassiveHeader } from '../../components/massive/MassiveHeader';
import { MassiveItemRow } from '../../components/massive/MassiveItemRow';
import { MassiveToolsSheet } from '../../components/massive/MassiveToolsSheet';
import { BarcodeLabelModal } from '../../shared/components/modals/BarcodeLabelModal';
import { LocationSelectorModal } from '../../components/common/LocationSelectorModal';
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { LocationTrigger } from '../../shared/components/controls/LocationTrigger';
import { CameraScanner } from '../../components/CameraScanner';
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { VirtualList } from '../../components/common/VirtualList';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { useAutoLock } from '../../hooks/useAutoLock';
import { SoundFX } from '../../services/audio';
import { Cpu, Zap } from 'lucide-react';

export const HammerPage: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { state, actions } = useHammerLogic(batchId);
    const locManager = useLocationManager(`hammer_loc_${batchId}`);
    const { isLocked, unlock, lock } = useAutoLock(60000); // 1 minuto en Martillo para evitar molestias

    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // ESCUCHA DE HARDWARE (Configuración optimizada para Martillo)
    useHIDScanner({
        onScan: actions.registerScan,
        isEnabled: !isLocked && !isMigrating && !showKeypad && !isToolsOpen,
        maxLatency: 40, // Más estricto para lectores láser de alta gama
        minChars: 2
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
            const count = await importManifestFromCloud(batchId);
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
            <MassiveHeader 
                isMigrating={isMigrating}
                hasItems={state.items.length > 0}
                onBack={() => navigate('/dashboard')}
                onFinalize={handleFinalize}
                onOpenTools={() => setIsToolsOpen(true)}
                onLock={lock}
            />

            {/* STATUS HUD: HARDWARE LINK */}
            <div className="px-4 py-2 bg-slate-900/50 border-b border-white/5 flex items-center justify-between">
                <LocationTrigger location={locManager.location} onClick={locManager.openModal} variant="compact" />
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                        <Zap className={`w-3 h-3 ${state.feedback === 'success' ? 'text-blue-400 animate-ping' : 'text-blue-800'}`} />
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">HID_READY</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg border border-white/5">
                        <Cpu className="w-3 h-3 text-slate-500" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">BURST_V2</span>
                    </div>
                </div>
            </div>

            <div className="h-[35dvh] shrink-0">
                <IndustrialDisplay 
                    barcode={state.activeBarcode}
                    name={state.activeProduct?.name || activeItem?.name || null}
                    quantity={state.optimisticQty ?? 0}
                    targetQuantity={activeItem?.expectedQty}
                    feedback={state.feedback}
                    onIncrement={() => actions.registerScan(state.activeBarcode!)}
                    onDecrement={() => actions.registerScan(state.activeBarcode!, -1)}
                />
            </div>

            <div className="flex-1 min-h-0 bg-black/90 relative border-t border-white/5">
                <VirtualList 
                    items={state.items} 
                    itemHeight={82} 
                    renderRow={MassiveItemRow} 
                    rowData={{ onSelect: actions.selectItem, activeBarcode: state.activeBarcode }} 
                />
            </div>

            <ScannerFooter 
                multiplier={state.multiplier}
                unitsPerBox={state.activeProduct?.unitsPerBox}
                isTriggerActive={isTriggerActive}
                onMultiplierChange={actions.setMultiplier}
                onOpenManual={() => setShowKeypad(true)}
                onTriggerStart={() => !isLocked && setIsTriggerActive(true)}
                onTriggerEnd={() => setIsTriggerActive(false)}
            />

            <MassiveToolsSheet 
                isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)}
                batchId={batchId} hasActiveItem={!!state.activeBarcode}
                location={locManager.location} onChangeLocation={locManager.openModal}
                onShowLabel={() => setIsLabelModalOpen(true)} onReset={() => actions.removeItem('ALL')}
                onImport={handleDownloadStock}
                onPrintSummary={() => {}}
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

            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner onScan={(code) => { actions.registerScan(code); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
                </div>
            )}

            <NumericKeypad isOpen={showKeypad} title="SKU MANUAL" onClose={() => setShowKeypad(false)} onConfirm={(v) => { actions.registerScan(v); setShowKeypad(false); }} />
            <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
        </div>
    );
};

export default HammerPage;
