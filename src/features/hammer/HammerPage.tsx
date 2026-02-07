
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHammerLogic } from './hooks/useHammerLogic';
import { migrateMassiveToMaster } from '../../services/massiveSync';
import { HammerHUD } from './components/HammerHUD';
import { HammerHeader } from './components/HammerHeader';
import { HammerList } from './components/HammerList';
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { CameraScanner } from '../../components/CameraScanner';
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay';
import { NumericKeypad } from '../../components/NumericKeypad';

export const HammerPage: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { state, actions } = useHammerLogic(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    // --- LÓGICA DE AUTO-BLOQUEO POR INACTIVIDAD ---
    const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const AUTO_LOCK_DELAY = 5000; // 5 segundos sin acción bloquean la pantalla

    const resetAutoLockTimer = useCallback(() => {
        if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
        if (isScreenLocked) return;

        autoLockTimerRef.current = setTimeout(() => {
            setIsScreenLocked(true);
            if (navigator.vibrate) navigator.vibrate(15);
        }, AUTO_LOCK_DELAY);
    }, [isScreenLocked]);

    // Resetear timer en cada interacción o cambio de estado de datos
    useEffect(() => {
        resetAutoLockTimer();
        return () => { if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current); };
    }, [state.lastScannedItem, state.items.length, resetAutoLockTimer]);

    const handleInteraction = () => resetAutoLockTimer();

    const handleFinalize = async () => {
        if (!state.items.length || !confirm("¿Cerrar auditoría y consolidar datos?")) return;
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId);
            navigate('/reports?type=hammer');
        } catch (err) {
            setIsMigrating(false);
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
            <HammerHeader 
                title={batchId}
                isMigrating={isMigrating}
                hasItems={state.items.length > 0}
                onBack={() => navigate('/dashboard')}
                onFinalize={handleFinalize}
                onLock={() => setIsScreenLocked(true)}
            />

            <HammerHUD 
                item={state.lastScannedItem} 
                feedback={state.feedback} 
                onDecrement={(i) => actions.modifyQuantity(i.barcode, -1)} 
                onIncrement={(code) => actions.registerScan(code)} 
            />

            <div className="flex-1 min-h-0 bg-black/90 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-transparent pointer-events-none z-10 h-6"/>
                <HammerList 
                    items={state.items} 
                    activeBarcode={state.lastScannedItem?.barcode}
                    onSelect={actions.selectItem}
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

            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner 
                        onScan={(code) => { actions.registerScan(code); handleInteraction(); }} 
                        onClose={endTrigger} 
                        isTriggered={true} 
                    />
                </div>
            )}

            {showKeypad && (
                <NumericKeypad 
                    isOpen={true} 
                    onClose={() => setShowKeypad(false)} 
                    title="INGRESO MANUAL" 
                    onInput={(v) => { actions.registerScan(v); handleInteraction(); }} 
                    onDelete={() => {}} 
                    onConfirm={() => setShowKeypad(false)} 
                />
            )}

            <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => { setIsScreenLocked(false); resetAutoLockTimer(); }} />
        </div>
    );
};

export default HammerPage;
