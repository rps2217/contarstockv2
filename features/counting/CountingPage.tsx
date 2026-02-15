
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useCountingLogic } from './hooks/useCountingLogic';
import { IndustrialDisplay } from '../../shared/components/ui/IndustrialDisplay';
import { ScannerHistoryList } from '../../components/scanner/ScannerHistoryList';
import { ScannerHeader } from '../../components/scanner/ScannerHeader';
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { ScannerToolsSheet } from '../../components/scanner/ScannerToolsSheet';
import { CameraScanner } from '../../components/CameraScanner';
import { NumericKeypad } from '../../components/NumericKeypad';
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay';
import { ExpirationModal } from '../../components/ExpirationModal';
import { Loader2 } from 'lucide-react';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useHIDScanner } from '../../hooks/useHIDScanner';

export const CountingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { state, actions, sessionData } = useCountingLogic(id, () => navigate('/reports'));
    const { isLocked, unlock, lock } = useAutoLock(4000);

    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);

    // --- CAPTURA DE ESCÁNER PDA (HARDWARE) ---
    useHIDScanner({
        onScan: (barcode) => {
            if (!isLocked && state.status !== 'expiring') {
                actions.handleExternalScan(barcode, state.multiplier);
            }
        },
        isEnabled: !showKeypad && !isToolsOpen,
    });

    const activeItem = sessionData.history.find(i => i.barcode === state.activeBarcode);

    if (state.isLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Iniciando Motor...</p>
            </div>
        );
    }

    if (!sessionData.session) return <Navigate to="/reports" />;

    const handleKeypadConfirm = (value: string) => {
        actions.handleExternalScan(value, state.multiplier);
        setShowKeypad(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white font-mono overflow-hidden select-none">
            <ScannerHeader 
                erpOrder={sessionData.session.erpOrder} 
                location={state.currentLocation}
                onLocationClick={() => {}} 
                onPause={() => navigate('/reports')}
                onUndo={actions.undoLastScan} 
                onLock={lock} 
                canUndo={true}
            />

            <div className="h-[35dvh] shrink-0">
                <IndustrialDisplay 
                    barcode={state.activeBarcode}
                    name={state.activeProduct?.name || activeItem?.productName || null}
                    quantity={state.optimisticQty ?? 0}
                    targetQuantity={activeItem?.expectedQuantity}
                    feedback={state.feedback}
                    onIncrement={() => actions.handleExternalScan(state.activeBarcode!, state.multiplier)}
                    onDecrement={() => actions.handleExternalScan(state.activeBarcode!, -1)}
                />
            </div>

            <ScannerHistoryList 
                items={sessionData.history} 
                activeBarcode={state.activeBarcode} 
                optimisticQty={state.optimisticQty ?? 0} 
                onSelect={actions.selectItem} 
            />

            <ScannerFooter 
                multiplier={state.multiplier} 
                unitsPerBox={state.activeProduct?.unitsPerBox}
                isTriggerActive={isTriggerActive} 
                onMultiplierChange={actions.setMultiplier}
                onOpenManual={() => setShowKeypad(true)}
                onTriggerStart={() => !isLocked && setIsTriggerActive(true)}
                onTriggerEnd={() => setIsTriggerActive(false)}
            />

            <ScannerToolsSheet 
                isOpen={isToolsOpen} 
                onClose={() => setIsToolsOpen(false)}
                hasActiveItem={!!state.activeBarcode} 
                location={state.currentLocation}
                label={sessionData.session.logisticsLabel} 
                onChangeLocation={() => {}}
                onChangeLabel={() => {}} 
                onShowLabel={() => {}}
                onReset={async () => { if(confirm("¿Vaciar bulto?")) actions.undoLastScan(); }} 
                onPrintSummary={() => {}}
            />

            <NumericKeypad 
                isOpen={showKeypad} 
                title="EAN / SKU MANUAL" 
                onClose={() => setShowKeypad(false)} 
                onConfirm={handleKeypadConfirm} 
            />

            {state.status === 'expiring' && state.activeBarcode && (
                <ExpirationModal 
                    productName={state.activeProduct?.name || state.activeBarcode} 
                    onComplete={actions.handlePharmaComplete} 
                />
            )}

            <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />

            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner 
                        onScan={(c) => { actions.handleExternalScan(c, state.multiplier); setIsTriggerActive(false); }} 
                        onClose={() => setIsTriggerActive(false)} 
                        isTriggered={true} 
                    />
                </div>
            )}
        </div>
    );
};
