
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCountingLogic } from './hooks/useCountingLogic';
import { ScannerHero } from '../../components/scanner/ScannerHero';
import { ScannerHistoryList } from '../../components/scanner/ScannerHistoryList';
import { ScannerHeader } from '../../components/scanner/ScannerHeader';
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { CameraScanner } from '../../components/CameraScanner';
import { NumericKeypad } from '../../components/NumericKeypad';
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay';
import { ExpirationModal } from '../../components/ExpirationModal';
import { Loader2, AlertCircle } from 'lucide-react';

export const CountingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { state, actions, sessionData } = useCountingLogic(id, () => navigate('/reports'));

    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);

    // --- LÓGICA DE AUTO-BLOQUEO POR INACTIVIDAD ---
    const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const AUTO_LOCK_DELAY = 5000;

    const resetAutoLockTimer = useCallback(() => {
        if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
        if (isScreenLocked) return;

        autoLockTimerRef.current = setTimeout(() => {
            setIsScreenLocked(true);
            if (navigator.vibrate) navigator.vibrate(15);
        }, AUTO_LOCK_DELAY);
    }, [isScreenLocked]);

    useEffect(() => {
        resetAutoLockTimer();
        return () => { if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current); };
    }, [state.activeBarcode, sessionData.history.length, resetAutoLockTimer]);

    const handleInteraction = () => resetAutoLockTimer();

    const startTrigger = useCallback(() => {
        if (isScreenLocked || state.status === 'expiring') return;
        setIsTriggerActive(true);
        if (navigator.vibrate) navigator.vibrate(30);
    }, [isScreenLocked, state.status]);

    const endTrigger = useCallback(() => {
        setIsTriggerActive(false);
    }, []);

    if (state.isLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Iniciando Motor...</p>
            </div>
        );
    }

    if (!sessionData.session) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center text-white">
                <div className="bg-rose-900/20 p-6 rounded-full mb-6 border border-rose-500/30">
                    <AlertCircle className="w-12 h-12 text-rose-500" />
                </div>
                <h2 className="text-xl font-black mb-2 uppercase tracking-tight">Sesión Inválida</h2>
                <button onClick={() => navigate('/reports')} className="bg-slate-800 px-8 py-4 rounded-2xl font-black uppercase text-xs">Salir</button>
            </div>
        );
    }

    return (
        <div 
            className="fixed inset-0 z-[100] flex flex-col bg-black text-white font-mono overflow-hidden select-none"
            onPointerDown={handleInteraction}
            onKeyDown={handleInteraction}
        >
            <ScannerHeader 
                erpOrder={sessionData.session.erpOrder}
                location={state.currentLocation}
                onLocationClick={() => {}} 
                onPause={() => navigate('/reports')}
                onUndo={actions.undoLastScan}
                onLock={() => setIsScreenLocked(true)}
                canUndo={true}
            />

            <div className="h-[38vh] shrink-0 border-b-4 border-black bg-slate-900 relative">
                <ScannerHero 
                    lastScan={state.activeBarcode ? { barcode: state.activeBarcode } as any : undefined} 
                    activeProduct={state.activeProduct || undefined} 
                    accumulatedQty={state.optimisticActiveQty} 
                    feedback={state.feedback} 
                    onRegisterPending={() => {}} 
                    expectedItem={sessionData.session.expectedItems?.find(i => i.barcode === state.activeBarcode)} 
                    onDecrement={() => { actions.handleExternalScan(state.activeBarcode!, -1); handleInteraction(); }} 
                    onIncrement={() => { actions.handleExternalScan(state.activeBarcode!, 1); handleInteraction(); }} 
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
                onOpenManual={() => actions.setStatus('manual')}
                onTriggerStart={startTrigger}
                onTriggerEnd={endTrigger}
            />

            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner 
                        onScan={(code) => { actions.handleExternalScan(code, state.multiplier); setIsTriggerActive(false); handleInteraction(); }} 
                        onClose={endTrigger} 
                        isTriggered={true} 
                    />
                </div>
            )}
            
            {state.status === 'expiring' && state.activeBarcode && (
                <ExpirationModal 
                    productName={state.activeProduct?.name || state.activeBarcode} 
                    onComplete={(m, y, b) => { actions.handlePharmaComplete(m, y, b); handleInteraction(); }} 
                />
            )}

            {state.status === 'manual' && (
                <NumericKeypad 
                    isOpen={true} 
                    title="EAN / SKU MANUAL" 
                    onClose={() => actions.setStatus('idle')} 
                    onInput={(c) => { actions.handleExternalScan(c, state.multiplier); handleInteraction(); }} 
                    onDelete={() => {}} 
                    onConfirm={() => actions.setStatus('idle')} 
                />
            )}

            <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => { setIsScreenLocked(false); resetAutoLockTimer(); }} />
        </div>
    );
};

export default CountingPage;
