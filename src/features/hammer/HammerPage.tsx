
import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHammerLogic } from './hooks/useHammerLogic';
import { migrateMassiveToMaster } from '../../services/massiveSync'; // Asumiendo que moverás los servicios después
import { HammerHUD } from './components/HammerHUD';
import { HammerHeader } from './components/HammerHeader';
import { HammerList } from './components/HammerList';
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { CameraScanner } from '../../components/CameraScanner'; // Legacy path, mover a shared/components en el futuro
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay'; // Legacy path
import { NumericKeypad } from '../../components/NumericKeypad'; // Legacy path

export const HammerPage: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    
    // Separación de Lógica de Negocio (Custom Hook)
    const { state, actions } = useHammerLogic(batchId);
    
    // Estado de UI Local (Presentational State)
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    // Manejador de Transición de Negocio
    const handleFinalize = async () => {
        if (!state.items.length || !confirm("¿Cerrar auditoría y consolidar datos?")) return;
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId);
            navigate('/reports?type=hammer');
        } catch (err) {
            setIsMigrating(false);
            // Aquí iría un toast de error
        }
    };

    // Protocolo de Gatillo Táctico (Latch-free)
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

            {/* Capa de Hardware (Cámara) */}
            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner 
                        onScan={(code) => actions.registerScan(code)} 
                        onClose={endTrigger} 
                        isTriggered={true} 
                    />
                </div>
            )}

            {/* Modales Auxiliares */}
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
