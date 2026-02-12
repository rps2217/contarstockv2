
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHammerLogic } from './hooks/useHammerLogic';
import { useLocationManager } from '../../shared/hooks/useLocationManager';
import { migrateMassiveToMaster } from '../../services/massiveSync';
import { MassiveHUD } from '../../components/massive/MassiveHUD';
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
import { SoundFX } from '../../services/audio';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useHIDScanner } from '../../hooks/useHIDScanner';

export const HammerPage: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    
    const { state, actions } = useHammerLogic(batchId);
    const locManager = useLocationManager(`hammer_loc_${batchId}`);
    const { isLocked, unlock, lock } = useAutoLock(3000);

    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    // ESCUCHA INMEDIATA DE HARDWARE (Láser Físico)
    useHIDScanner({
        onScan: (barcode) => actions.registerScan(barcode),
        isEnabled: !isLocked && !isMigrating && !showKeypad && !isToolsOpen,
        maxLatency: 50
    });

    useEffect(() => {
        actions.setCurrentLocation(locManager.location);
    }, [locManager.location, actions]);

    const handleFinalize = async () => {
        if (!state.items.length) return;
        if (!confirm("¿Cerrar auditoría y consolidar registros?")) return;
        
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId);
            SoundFX.play('success');
            navigate('/reports?type=hammer');
        } catch (err) {
            setIsMigrating(false);
            SoundFX.play('error');
        }
    };

    const handleKeypadConfirm = (value: string) => {
        actions.registerScan(value);
        setShowKeypad(false);
    };

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

            <div className="px-4 py-2 bg-slate-900/50 border-b border-white/5">
                <LocationTrigger location={locManager.location} onClick={locManager.openModal} />
            </div>

            <MassiveHUD 
                item={state.lastScannedItem as any} 
                feedback={state.feedback} 
                onDecrement={(i) => actions.modifyQuantity(i.barcode, -1)} 
                onIncrement={(code) => actions.registerScan(code)} 
            />

            <div className="flex-1 min-h-0 bg-black/90 relative border-t border-white/5">
                <VirtualList 
                    items={state.items} 
                    itemHeight={82} 
                    renderRow={MassiveItemRow} 
                    rowData={{ onSelect: actions.selectItem, activeBarcode: state.lastScannedItem?.barcode }} 
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
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                batchId={batchId}
                hasActiveItem={!!state.lastScannedItem}
                location={locManager.location}
                onChangeLocation={locManager.openModal}
                onShowLabel={() => setIsLabelModalOpen(true)}
                onReset={() => actions.removeItem('ALL')}
                onPrintSummary={() => {}}
            />

            <LocationSelectorModal 
                isOpen={locManager.isModalOpen}
                onClose={locManager.closeModal}
                currentLocation={locManager.location}
                onSelect={locManager.setLocation}
            />

            {state.lastScannedItem && (
                <BarcodeLabelModal 
                    isOpen={isLabelModalOpen}
                    onClose={() => setIsLabelModalOpen(false)}
                    barcode={state.lastScannedItem.barcode}
                    productName={state.lastScannedItem.name}
                    quantity={state.lastScannedItem.totalQuantity}
                />
            )}

            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner 
                        onScan={(code) => { actions.registerScan(code); setIsTriggerActive(false); }} 
                        onClose={() => setIsTriggerActive(false)} 
                        isTriggered={true} 
                    />
                </div>
            )}

            <NumericKeypad 
                isOpen={showKeypad}
                title="SKU MANUAL"
                onClose={() => setShowKeypad(false)}
                onConfirm={handleKeypadConfirm}
            />

            <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
        </div>
    );
};

export default HammerPage;
