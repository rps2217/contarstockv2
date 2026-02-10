
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useHammerLogic } from './hooks/useHammerLogic';
import { migrateMassiveToMaster, importManifestFromCloud } from '../../services/massiveSync';
import { MassiveHUD } from '../../components/massive/MassiveHUD';
import { MassiveHeader } from '../../components/massive/MassiveHeader';
import { MassiveItemRow } from '../../components/massive/MassiveItemRow';
import { MassiveToolsSheet } from '../../components/massive/MassiveToolsSheet';
import { MassiveLabelModal } from '../../components/massive/MassiveLabelModal';
import { LocationSelectorModal } from '../../components/common/LocationSelectorModal';
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
    
    // --- ESTADOS DE MODALES Y CARGA ---
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [isLocModalOpen, setIsLocModalOpen] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isCloudLoading, setIsCloudLoading] = useState(false);

    // --- MANEJADORES DE ACCIONES DEL MENÚ ---
    const handleImportTheoreticalStock = async () => {
        setIsCloudLoading(true);
        try {
            const count = await importManifestFromCloud(batchId);
            SoundFX.play('success');
            alert(`Sincronización Exitosa: Se cargaron ${count} metas de stock desde la nube.`);
        } catch (e: any) {
            alert(`Error Cloud: ${e.message}`);
            SoundFX.play('error');
        } finally {
            setIsCloudLoading(false);
            setIsToolsOpen(false);
        }
    };

    const handleResetBatch = async () => {
        if (confirm("¿ELIMINAR TODO EL CONTENIDO DEL LOTE? Esta acción es irreversible y borrará todos los escaneos de esta sesión.")) {
            await actions.removeItem('ALL');
            SoundFX.play('delete');
            setIsToolsOpen(false);
        }
    };

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

    // --- LÓGICA DE GATILLO ---
    const startTrigger = useCallback(() => {
        if (isScreenLocked) return;
        setIsTriggerActive(true);
        if (navigator.vibrate) navigator.vibrate(30);
    }, [isScreenLocked]);

    const endTrigger = useCallback(() => {
        setIsTriggerActive(false);
    }, []);

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

            <MassiveHUD 
                item={state.lastScannedItem as any} 
                feedback={state.feedback} 
                onDecrement={(i) => actions.modifyQuantity(i.barcode, -1)} 
                onIncrement={(code) => actions.registerScan(code)} 
            />

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
                onTriggerStart={startTrigger}
                onTriggerEnd={endTrigger}
            />

            {/* --- CAPA DE MODALES DE ACCIÓN --- */}
            
            <MassiveToolsSheet 
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                hasActiveItem={!!state.lastScannedItem}
                location={state.currentLocation}
                onChangeLocation={() => setIsLocModalOpen(true)}
                onShowLabel={() => setIsLabelModalOpen(true)}
                onReset={handleResetBatch}
                onImport={handleImportTheoreticalStock}
                onPrintSummary={() => alert("Función de reporte PDF en desarrollo")}
            />

            <LocationSelectorModal 
                isOpen={isLocModalOpen}
                onClose={() => setIsLocModalOpen(false)}
                currentLocation={state.currentLocation}
                onSelect={actions.setCurrentLocation}
            />

            <MassiveLabelModal 
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                item={state.lastScannedItem || null}
                isPrinting={false}
                onPrintThermal={() => {}}
                onPrintPDF={() => {}}
            />

            {/* --- HARDWARE / OVERLAYS --- */}
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

            {/* Indicador de carga cloud */}
            {isCloudLoading && (
                <div className="fixed inset-0 z-[500] bg-black/80 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Accediendo a Google Sheets...</p>
                </div>
            )}
        </div>
    );
};

export default HammerPage;
