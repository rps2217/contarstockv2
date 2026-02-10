
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHammerLogic } from './hooks/useHammerLogic';
import { migrateMassiveToMaster, importManifestFromCloud } from '../../services/massiveSync';
import { MassiveHUD } from '../../components/massive/MassiveHUD';
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

    // --- MOTOR DE BLOQUEO ROBUSTO (Listeners Globales) ---
    const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const AUTO_LOCK_MS = 6000; // 6 segundos de gracia

    const resetLockTimer = useCallback(() => {
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        if (isScreenLocked) return;

        lockTimerRef.current = setTimeout(() => {
            setIsScreenLocked(true);
            if (navigator.vibrate) navigator.vibrate(10);
        }, AUTO_LOCK_MS);
    }, [isScreenLocked]);

    useEffect(() => {
        // Escuchar actividad en toda la ventana (clave para PDAs)
        const events = ['mousedown', 'keydown', 'touchstart', 'pointerdown'];
        events.forEach(e => window.addEventListener(e, resetLockTimer));
        
        resetLockTimer();
        
        return () => {
            if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
            events.forEach(e => window.removeEventListener(e, resetLockTimer));
        };
    }, [resetLockTimer]);

    const handleFinalize = async () => {
        if (!state.items.length) return;
        if (!confirm("¿Cerrar auditoría y consolidar datos en el historial principal?")) return;
        
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

    const startTrigger = useCallback(() => {
        if (isScreenLocked) return;
        setIsTriggerActive(true);
        if (navigator.vibrate) navigator.vibrate(30);
    }, [isScreenLocked]);

    const endTrigger = useCallback(() => {
        setIsTriggerActive(false);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col font-mono bg-black select-none overflow-hidden text-white">
            <MassiveHeader 
                isMigrating={isMigrating}
                hasItems={state.items.length > 0}
                onBack={() => navigate('/dashboard')}
                onFinalize={handleFinalize}
                onOpenTools={() => {
                    console.log("Abriendo Herramientas..."); // Debug para traza
                    setIsToolsOpen(true);
                }}
                onLock={() => setIsScreenLocked(true)}
            />

            <MassiveHUD 
                item={state.lastScannedItem as any} 
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
                        onScan={(code) => {
                            actions.registerScan(code);
                            setIsTriggerActive(false);
                        }} 
                        onClose={endTrigger} 
                        isTriggered={true} 
                    />
                </div>
            )}

            {/* Menú de Acciones (3 puntos) */}
            <MassiveToolsSheet 
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                hasActiveItem={!!state.lastScannedItem}
                location={state.currentLocation}
                onChangeLocation={() => {}} 
                onShowLabel={() => setIsLabelModalOpen(true)}
                onReset={() => { 
                    if(confirm("¿Vaciar todo el lote actual? Esta acción no se puede deshacer.")) {
                        actions.removeItem('ALL'); 
                        setIsToolsOpen(false);
                    }
                }}
                onImport={async () => {
                    try { 
                        await importManifestFromCloud(batchId); 
                        SoundFX.play('success');
                        setIsToolsOpen(false);
                    }
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
                    isOpen={true} 
                    onClose={() => setShowKeypad(false)} 
                    title="INGRESO MANUAL" 
                    onInput={(v) => actions.registerScan(v)} 
                    onDelete={() => {}} 
                    onConfirm={() => setShowKeypad(false)} 
                />
            )}

            <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />
        </div>
    );
};

export default HammerPage;
