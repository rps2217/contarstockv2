
import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster } from '../services/massiveSync';
import { MassiveHUD } from './massive/MassiveHUD';
import { MassiveHeader } from './massive/MassiveHeader';
import { MassiveItemRow } from './massive/MassiveItemRow';
import { ScannerFooter } from './scanner/ScannerFooter';
import { VirtualList } from './common/VirtualList';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';
import { NumericKeypad } from './NumericKeypad';

export const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    const { state, actions } = useMassiveScanner(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

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

    const rowData = React.useMemo(() => ({ 
        onSelect: actions.selectItem, 
        activeBarcode: state.lastScannedItem?.barcode 
    }), [actions.selectItem, state.lastScannedItem?.barcode]);

    // GATILLO TÁCTICO: Funciones de manejo
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
                onOpenTools={() => {}}
                onLock={() => setIsScreenLocked(true)}
            />

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
                onTriggerStart={startTrigger}
                onTriggerEnd={endTrigger}
            />

            {/* El componente CameraScanner SOLO existe mientras isTriggerActive es true */}
            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner 
                        onScan={(code) => actions.registerScan(code)} 
                        onClose={endTrigger} 
                        isTriggered={true} 
                    />
                </div>
            )}

            {showKeypad && (
                <NumericKeypad 
                    isOpen={true} onClose={() => setShowKeypad(false)} title="SKU MANUAL" 
                    onInput={(v) => actions.registerScan(v)} onDelete={() => {}} 
                    onConfirm={() => setShowKeypad(false)} 
                />
            )}

            <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />
        </div>
    );
};

export default MassiveBlindView;
