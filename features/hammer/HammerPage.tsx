
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { useLocationManager } from '../hooks/useLocationManager';
import { migrateMassiveToMaster, importManifestFromCloud } from '../services/massiveSync';
import { MassiveHUD } from '../components/massive/MassiveHUD';
import { MassiveHeader } from '../components/massive/MassiveHeader';
import { MassiveItemRow } from '../components/massive/MassiveItemRow';
import { MassiveToolsSheet } from '../components/massive/MassiveToolsSheet';
import { LocationTrigger } from '../components/common/LocationTrigger';
import { LocationSelectorModal } from '../components/common/LocationSelectorModal';
import { ScannerFooter } from '../components/scanner/ScannerFooter';
import { VirtualList } from '../components/common/VirtualList';
import { ScreenLockOverlay } from '../components/common/ScreenLockOverlay';
import { NumericKeypad } from '../components/NumericKeypad';
import { CameraScanner } from '../components/CameraScanner';
import { SoundFX } from '../services/audio';

/**
 * MÓDULO MARTILLO (Hammer Mode)
 * UI de auditoría masiva optimizada para PDAs industriales.
 */
export const HammerPage: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { state, actions } = useMassiveScanner(batchId);
    const locManager = useLocationManager(`massive_loc_${batchId}`);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        actions.setCurrentLocation(locManager.location);
    }, [locManager.location, actions]);

    const handleFinalize = async () => {
        if (!state.items.length || !confirm("¿Cerrar auditoría?")) return;
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
            alert(`✅ Stock cargado: ${count} productos listos para auditoría.`);
            setIsToolsOpen(false);
        } catch (err: any) {
            SoundFX.play('error');
            alert(`Error: ${err.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleManualConfirm = (sku: string) => {
        actions.registerScan(sku);
        setShowKeypad(false);
    };

    const rowData = React.useMemo(() => ({ 
        onSelect: actions.selectItem, 
        activeBarcode: state.lastScannedItem?.barcode 
    }), [actions.selectItem, state.lastScannedItem?.barcode]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col font-mono bg-black select-none overflow-hidden text-white">
            
            <MassiveHeader 
                isMigrating={isMigrating}
                hasItems={state.items.length > 0}
                onBack={() => navigate('/dashboard')}
                onFinalize={handleFinalize}
                onOpenTools={() => setIsToolsOpen(true)}
                onLock={() => setIsScreenLocked(true)}
            />

            <div className="px-4 py-2 bg-slate-900/50 border-b border-white/5">
                <LocationTrigger location={locManager.location} onClick={locManager.openModal} />
            </div>

            <MassiveHUD 
                item={state.lastScannedItem as any} 
                feedback={state.feedback} 
                onDecrement={(i) => i.totalQuantity <= 1 ? actions.removeItem(i.barcode) : actions.registerScan(i.barcode, -1)} 
                onIncrement={(code) => actions.registerScan(code)} 
            />

            <div className="flex-1 min-h-0 bg-black flex flex-col">
                <VirtualList 
                    items={state.items} 
                    itemHeight={82} 
                    renderRow={MassiveItemRow} 
                    rowData={rowData} 
                    className="bg-black/20" 
                />
            </div>

            <ScannerFooter 
                multiplier={state.multiplier}
                unitsPerBox={state.activeProduct?.unitsPerBox}
                isTriggerActive={isTriggerActive}
                onMultiplierChange={actions.setMultiplier}
                onOpenManual={() => setShowKeypad(true)}
                onTriggerStart={() => !isScreenLocked && setIsTriggerActive(true)}
                onTriggerEnd={() => setIsTriggerActive(false)}
            />

            <MassiveToolsSheet 
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                batchId={batchId}
                hasActiveItem={!!state.lastScannedItem}
                location={locManager.location}
                onChangeLocation={locManager.openModal}
                onShowLabel={() => {}}
                onReset={() => actions.removeItem('ALL')}
                onImport={handleDownloadStock}
                onPrintSummary={() => {}}
            />

            <LocationSelectorModal 
                isOpen={locManager.isModalOpen}
                onClose={locManager.closeModal}
                currentLocation={locManager.location}
                onSelect={locManager.setLocation}
            />

            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner 
                        onScan={(code) => actions.registerScan(code)} 
                        onClose={() => setIsTriggerActive(false)} 
                        isTriggered={true} 
                    />
                </div>
            )}

            <NumericKeypad 
                isOpen={showKeypad} 
                onClose={() => setShowKeypad(false)} 
                title="SKU MANUAL" 
                onConfirm={handleManualConfirm} 
            />

            <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />
        </div>
    );
};

// EXPORTACIÓN POR DEFECTO REQUERIDA PARA React.lazy
export default HammerPage;
