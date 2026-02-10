
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHammerLogic } from './hooks/useHammerLogic';
import { migrateMassiveToMaster, importManifestFromCloud } from '../../services/massiveSync';
import { HammerHUD } from './components/HammerHUD';
import { MassiveHeader } from '../../components/massive/MassiveHeader';
import { MassiveItemRow } from '../../components/massive/MassiveItemRow';
import { MassiveToolsSheet } from '../../components/massive/MassiveToolsSheet';
import { MassiveLabelModal } from '../../components/massive/MassiveLabelModal';
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { CameraScanner } from '../../components/CameraScanner';
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { VirtualList } from '../../components/common/VirtualList';
import { SoundFX } from '../../services/audio';

export const HammerPage: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { state, actions } = useHammerLogic(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    // --- LÓGICA DE AUTO-BLOQUEO (Inactividad Industrial) ---
    const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const AUTO_LOCK_MS = 5000; 

    const resetLockTimer = useCallback(() => {
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        if (isScreenLocked) return;

        lockTimerRef.current = setTimeout(() => {
            setIsScreenLocked(true);
        }, AUTO_LOCK_MS);
    }, [isScreenLocked]);

    useEffect(() => {
        resetLockTimer();
        return () => { if (lockTimerRef.current) clearTimeout(lockTimerRef.current); };
    }, [state.items.length, state.lastScannedItem, resetLockTimer]);

    const handleInteraction = () => resetLockTimer();

    const handleFinalize = async () => {
        if (!state.items.length || !confirm("¿Cerrar auditoría y consolidar datos?")) return;
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId);
            navigate('/reports?type=hammer');
        } catch (err) {
            setIsMigrating(false);
            SoundFX.play('error');
        }
    };

    const startTrigger = useCallback(() => {
        if (isScreenLocked) return;
        setIsTriggerActive(true);
        if (navigator.vibrate) navigator.vibrate(30);
    }, [isScreenLocked]);

    const endTrigger = useCallback(() => {
        setIsTriggerActive(false);
    }, []);

    return (
        <div 
            className="fixed inset-0 z-[100] flex flex-col font-mono bg-black select-none overflow-hidden text-white"
            onPointerDown={handleInteraction}
            onKeyDown={handleInteraction}
        >
            <MassiveHeader 
                isMigrating={isMigrating}
                hasItems={state.items.length > 0}
                onBack={() => navigate('/dashboard')}
                onFinalize={handleFinalize}
                onOpenTools={() => setIsToolsOpen(true)}
                onLock={() => setIsScreenLocked(true)}
            />

            <HammerHUD 
                item={state.lastScannedItem} 
                feedback={state.feedback} 
                onDecrement={(i) => actions.modifyQuantity(i.barcode, -1)} 
                onIncrement={(code) => actions.registerScan(code)} 
            />

            <div className="flex-1 min-h-0 bg-black/90 relative">
                <VirtualList 
                    items={state.items} 
                    itemHeight={82} 
                    renderRow={MassiveItemRow} 
                    rowData={{ onSelect: actions.selectItem, activeBarcode: state.lastScannedItem?.barcode }} 
                    className="bg-black/20" 
                />
            </div>

            <ScannerFooter 
                multiplier={state.multiplier}
                unitsPerBox={state.activeProduct?.unitsPerBox}
                isTriggerActive={isTriggerActive}
                onMultiplierChange={actions.setMultiplier}
                onOpenManual={() => setShowKeypad(true)}
                onTriggerStart={startTrigger}
                onTriggerEnd={endTrigger}
            />

            {/* Hardware Layer */}
            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner 
                        onScan={(code) => actions.registerScan(code)} 
                        onClose={endTrigger} 
                        isTriggered={true} 
                    />
                </div>
            )}

            {/* Utils Sheets */}
            <MassiveToolsSheet 
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                hasActiveItem={!!state.lastScannedItem}
                location={state.currentLocation}
                onChangeLocation={() => {}} // Se implementará modal de loc
                onShowLabel={() => setIsLabelModalOpen(true)}
                onReset={() => { if(confirm("¿Vaciar todo el lote?")) actions.removeItem('ALL'); }}
                onImport={async () => {
                    try { await importManifestFromCloud(batchId); SoundFX.play('success'); }
                    catch(e: any) { alert(e.message); }
                }}
                onPrintSummary={() => {}}
            />

            <MassiveLabelModal 
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                item={state.lastScannedItem || null}
                isPrinting={false}
                onPrintThermal={() => {}}
                onPrintPDF={() => {}}
            />

            {showKeypad && (
                <NumericKeypad 
                    isOpen={true} onClose={() => setShowKeypad(false)} title="INGRESO MANUAL" 
                    onInput={(v) => actions.registerScan(v)} onDelete={() => {}} 
                    onConfirm={() => setShowKeypad(false)} 
                />
            )}

            <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />
        </div>
    );
};

export default HammerPage;
