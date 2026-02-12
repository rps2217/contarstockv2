
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCountingLogic } from './hooks/useCountingLogic';
import { ScannerHero } from '../../components/scanner/ScannerHero';
import { ScannerHistoryList } from '../../components/scanner/ScannerHistoryList';
import { ScannerHeader } from '../../components/scanner/ScannerHeader';
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { ScannerToolsSheet } from '../../components/scanner/ScannerToolsSheet';
import { CameraScanner } from '../../components/CameraScanner';
import { NumericKeypad } from '../../components/NumericKeypad';
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay';
import { ExpirationModal } from '../../components/ExpirationModal';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useHIDScanner } from '../../hooks/useHIDScanner';

export const CountingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { state, actions, sessionData } = useCountingLogic(id, () => navigate('/reports'));
    const { isLocked, unlock, lock } = useAutoLock(3000);

    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isLabelOpen, setIsLabelOpen] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);

    // ESCUCHA DE HARDWARE
    useHIDScanner({
        onScan: (barcode) => actions.handleExternalScan(barcode, state.multiplier),
        isEnabled: !isLocked && state.status !== 'expiring' && !showKeypad,
    });

    const startTrigger = useCallback(() => {
        if (isLocked || state.status === 'expiring') return;
        setIsTriggerActive(true);
        if (navigator.vibrate) navigator.vibrate(30);
    }, [isLocked, state.status]);

    const handleManualConfirm = (val: string) => {
        actions.handleExternalScan(val, state.multiplier);
        setShowKeypad(false);
    };

    if (state.isLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Iniciando Motor...</p>
            </div>
        );
    }

    if (!sessionData.session) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center text-white">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-6" />
                <h2 className="text-xl font-black mb-2 uppercase tracking-tight">Sesión Inválida</h2>
                <button onClick={() => navigate('/reports')} className="bg-slate-800 px-8 py-4 rounded-2xl font-black uppercase text-xs">Salir</button>
            </div>
        );
    }

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

            <div className="h-[38vh] shrink-0 border-b-4 border-black bg-slate-900 relative">
                <ScannerHero 
                    lastScan={state.activeBarcode ? { barcode: state.activeBarcode } as any : undefined} 
                    activeProduct={state.activeProduct || undefined} 
                    accumulatedQty={state.optimisticActiveQty} 
                    feedback={state.feedback as any} 
                    onRegisterPending={() => {}} 
                    expectedItem={sessionData.session.expectedItems?.find(i => i.barcode === state.activeBarcode)} 
                    onDecrement={() => actions.handleExternalScan(state.activeBarcode!, -1)} 
                    onIncrement={() => actions.handleExternalScan(state.activeBarcode!, 1)} 
                />
            </div>

            <ScannerHistoryList 
                items={sessionData.history} 
                activeBarcode={state.activeBarcode} 
                optimisticQty={state.optimisticActiveQty} 
                onSelect={actions.selectItem} 
            />

            <ScannerFooter 
                multiplier={state.multiplier}
                unitsPerBox={state.activeProduct?.unitsPerBox}
                isTriggerActive={isTriggerActive}
                onMultiplierChange={actions.setMultiplier}
                onOpenManual={() => setShowKeypad(true)}
                onTriggerStart={startTrigger}
                onTriggerEnd={() => setIsTriggerActive(false)}
            />

            <ScannerToolsSheet 
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                hasActiveItem={!!state.activeBarcode}
                location={state.currentLocation}
                label={sessionData.session.logisticsLabel}
                onChangeLocation={() => {}}
                onShowLabel={() => setIsLabelOpen(true)}
                onReset={actions.resetSession}
                onPrintSummary={() => {}}
            />

            <NumericKeypad 
                isOpen={showKeypad}
                title="EAN / SKU MANUAL"
                onConfirm={handleManualConfirm}
                onClose={() => setShowKeypad(false)}
            />

            {state.status === 'expiring' && state.activeBarcode && (
                <ExpirationModal productName={state.activeProduct?.name || state.activeBarcode} onComplete={actions.handlePharmaComplete} />
            )}

            <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
        </div>
    );
};
