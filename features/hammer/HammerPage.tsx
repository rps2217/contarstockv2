
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHammerLogic } from './hooks/useHammerLogic';
import { useLocationManager } from '../../shared/hooks/useLocationManager';
import { migrateMassiveToMaster } from '../../services/massiveSync';
import { IndustrialDisplay } from '../../shared/components/ui/IndustrialDisplay';
import { MassiveHeader } from '../../components/massive/MassiveHeader';
import { MassiveItemRow } from '../../components/massive/MassiveItemRow';
import { MassiveToolsSheet } from '../../components/massive/MassiveToolsSheet';
import { BarcodeLabelModal } from '../../shared/components/modals/BarcodeLabelModal';
import { LocationSelectorModal } from '../../components/common/LocationSelectorModal';
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { LocationTrigger } from '../../components/common/LocationTrigger';
import { CameraScanner } from '../../components/CameraScanner';
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { VirtualList } from '../../components/common/VirtualList';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { useAutoLock } from '../../hooks/useAutoLock';

export const HammerPage: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { state, actions } = useHammerLogic(batchId);
    const locManager = useLocationManager(`hammer_loc_${batchId}`);
    
    // Auto-bloqueo industrial por inactividad
    const { isLocked, unlock, lock } = useAutoLock(4000);

    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    // --- INTEGRACIÓN ESCÁNER FÍSICO (PDA / LÁSER) ---
    useHIDScanner({
        onScan: (barcode) => {
            if (!isLocked && !isMigrating) {
                actions.registerScan(barcode);
            }
        },
        isEnabled: !showKeypad && !isToolsOpen,
    });

    useEffect(() => {
        actions.setCurrentLocation(locManager.location);
    }, [locManager.location, actions]);

    const handleFinalize = async () => {
        if (!state.items.length || isMigrating) return;
        if (!confirm("¿Cerrar auditoría y consolidar registros en la nube?")) return;
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId);
            navigate('/reports?type=hammer');
        } catch (err) {
            setIsMigrating(false);
        }
    };

    const activeItem = state.items.find(i => i.barcode === state.activeBarcode);

    const handleManualConfirm = (sku: string) => {
        actions.registerScan(sku);
        setShowKeypad(false);
    };

    const rowData = React.useMemo(() => ({ 
        onSelect: actions.selectItem, 
        activeBarcode: state.activeBarcode 
    }), [actions.selectItem, state.activeBarcode]);

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

            {/* HUD Central Unificado con Feedback de Correlación */}
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
                    rowData={rowData} 
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
                hasActiveItem={!!state.activeBarcode}
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

            {state.activeBarcode && (
                <BarcodeLabelModal 
                    isOpen={isLabelModalOpen}
                    onClose={() => setIsLabelModalOpen(false)}
                    barcode={state.activeBarcode}
                    productName={state.activeProduct?.name || activeItem?.name}
                    quantity={state.optimisticQty ?? 0}
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
                title="EAN / SKU MANUAL"
                onClose={() => setShowKeypad(false)}
                onConfirm={handleManualConfirm}
            />

            <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
        </div>
    );
};

export default HammerPage;
