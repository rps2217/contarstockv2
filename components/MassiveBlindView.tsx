
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner } from '../hooks/useMassiveScanner';
import { Camera, Keyboard } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster, importManifestFromCloud } from '../services/massiveSync';
import { SoundFX } from '../services/audio';
import { VirtualList } from './common/VirtualList';
import { printBarcode } from '../services/printerService';
import { thermalPrinter } from '../services/thermalPrinterService';
import { NumericKeypad } from './NumericKeypad';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';

// Subcomponentes Atómicos
import { MassiveHUD } from './massive/MassiveHUD';
import { MassiveHeader } from './massive/MassiveHeader';
import { MassiveItemRow } from './massive/MassiveItemRow';
import { BarcodeLabelModal } from './common/BarcodeLabelModal';
import { MassiveToolsSheet } from './massive/MassiveToolsSheet';
import { LocationSelectorModal } from './common/LocationSelectorModal';

const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    
    const { 
        items, lastScannedItem, feedback, multiplier, setMultiplier, 
        currentLocation, setCurrentLocation, registerScan, selectItem, 
        removeItemCompletely, resetBatch 
    } = useMassiveScanner(batchId);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isChangingLocation, setIsChangingLocation] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [isScreenLocked, setIsScreenLocked] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    
    const [showKeypad, setShowKeypad] = useState(false);
    const [manualCode, setManualCode] = useState('');

    const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const AUTO_LOCK_DELAY = 5000;

    const resetAutoLockTimer = useCallback(() => {
        if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
        if (isScreenLocked) return;
        autoLockTimerRef.current = setTimeout(() => setIsScreenLocked(true), AUTO_LOCK_DELAY);
    }, [isScreenLocked]);

    useEffect(() => {
        resetAutoLockTimer();
        return () => { if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current); };
    }, [lastScannedItem, multiplier, resetAutoLockTimer]);

    const handleCloudImport = async () => {
        setIsImporting(true);
        try {
            const count = await importManifestFromCloud(batchId);
            SoundFX.play('success');
            alert(`✓ Sincronizados ${count} registros de stock.`);
        } catch (err: any) {
            SoundFX.play('error');
            alert(err.message);
        } finally {
            setIsImporting(false);
        }
    };

    const handlePrintSummary = async () => {
        if (!items.length) return;
        if (!thermalPrinter.isConnected()) {
            alert("Impresora no vinculada.");
            return;
        }

        setIsPrinting(true);
        try {
            const reportData = items.map(i => ({
                barcode: i.barcode,
                productName: i.name,
                totalQuantity: i.totalQuantity,
                expectedQuantity: i.expectedQty || 0
            }));

            await thermalPrinter.printSummaryReport(
                `MARTILLO-${batchId.substring(0,6)}`,
                currentLocation,
                reportData
            );
            SoundFX.play('success');
        } catch (e) {
            alert("Fallo al imprimir.");
            SoundFX.play('error');
        } finally {
            setIsPrinting(false);
        }
    };

    const handleFinalize = async () => {
        if (!items.length || !confirm("¿Cerrar auditoría y guardar en historial?")) return;
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId);
            SoundFX.play('success');
            navigate('/reports?type=hammer');
        } catch (err: any) {
            SoundFX.play('error');
            alert(err.message);
        } finally {
            setIsMigrating(false);
        }
    };

    const handleThermalPrint = async () => {
        if (!lastScannedItem || isPrinting) return;
        setIsPrinting(true);
        try {
            await thermalPrinter.printLabel(lastScannedItem.barcode, lastScannedItem.name, lastScannedItem.totalQuantity);
            SoundFX.play('success');
        } catch (e) {
            SoundFX.play('error');
        } finally {
            setIsPrinting(false);
        }
    };

    const rowData = useMemo(() => ({ 
        onSelect: selectItem, 
        activeBarcode: lastScannedItem?.barcode 
    }), [selectItem, lastScannedItem?.barcode]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col font-mono bg-black select-none overflow-hidden text-white" onPointerDown={resetAutoLockTimer}>
            
            <MassiveHeader 
                isMigrating={isMigrating}
                hasItems={items.length > 0}
                onBack={() => navigate('/dashboard')}
                onFinalize={handleFinalize}
                onOpenTools={() => setIsToolsOpen(true)}
                onLock={() => setIsScreenLocked(true)}
            />

            <MassiveHUD 
                item={lastScannedItem} 
                feedback={feedback} 
                onDecrement={(i) => i.totalQuantity <= 1 ? removeItemCompletely(i.barcode) : registerScan(i.barcode, -1)} 
                onIncrement={(code) => registerScan(code)} 
            />

            <div className="flex-1 min-h-0 bg-black flex flex-col overflow-hidden">
                <div className="shrink-0 p-3 bg-slate-900/50 border-b border-white/5 grid grid-cols-4 gap-2">
                    <button onClick={() => { setManualCode(''); setShowKeypad(true); }} className="h-11 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 border-2 bg-slate-800 border-slate-700 text-white shadow-lg active:scale-95">
                        <Keyboard className="w-4 h-4" /> <span>MANUAL</span>
                    </button>
                    {[5, 10, 20].map(val => (
                        <button key={val} onClick={() => setMultiplier(val)} className={`h-11 rounded-xl font-black text-xs transition-all border-2 ${multiplier === val ? 'bg-amber-500 border-amber-600 text-black shadow-lg scale-105' : 'bg-white/5 border-white/10 text-white/40'}`}>
                            +{val}
                        </button>
                    ))}
                </div>
                <div className="flex-1 min-h-0">
                    <VirtualList items={items} itemHeight={82} renderRow={MassiveItemRow} rowData={rowData} className="bg-black/20" />
                </div>
            </div>

            {/* BOTÓN GATILLO - Posicionado con padding seguro */}
            <div className="shrink-0 bg-slate-900 border-t border-white/5 flex items-center px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-40">
                <button 
                    onPointerDown={(e) => { e.preventDefault(); setIsTriggerActive(true); }} 
                    onPointerUp={() => setIsTriggerActive(false)}
                    className={`flex-1 h-14 md:h-16 rounded-2xl flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.98] border-b-4 ${isTriggerActive ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0 shadow-inner' : 'bg-white text-black border-slate-300 shadow-xl'}`}
                >
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isTriggerActive ? 'LENS_OPEN' : 'GATILLO_OPTICO'}</span>
                </button>
            </div>

            {isTriggerActive && <div className="fixed inset-0 z-[200]"><CameraScanner onScan={(code) => { registerScan(code); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} /></div>}

            <NumericKeypad 
                isOpen={showKeypad} onClose={() => setShowKeypad(false)} title="ENTRADA MANUAL" value={manualCode} 
                onInput={(v) => setManualCode(p => p + v)} onDelete={() => setManualCode(p => p.slice(0, -1))} 
                onConfirm={() => { if (manualCode) registerScan(manualCode); setShowKeypad(false); }} 
            />

            <BarcodeLabelModal 
                isOpen={showLabelModal} onClose={() => setShowLabelModal(false)}
                barcode={lastScannedItem?.barcode || ""} productName={lastScannedItem?.name} quantity={lastScannedItem?.totalQuantity}
                meta={`AUDIT: ${batchId}`} isPrinting={isPrinting} onPrintThermal={handleThermalPrint}
                onPrintPDF={() => lastScannedItem && printBarcode(lastScannedItem.barcode, lastScannedItem.name, `AUDIT_ID: ${batchId}`)}
            />

            <LocationSelectorModal 
                isOpen={isChangingLocation}
                onClose={() => setIsChangingLocation(false)}
                currentLocation={currentLocation}
                onSelect={(name) => setCurrentLocation(name)}
            />

            <MassiveToolsSheet 
                isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)} hasActiveItem={!!lastScannedItem}
                location={currentLocation} onChangeLocation={() => setIsChangingLocation(true)}
                onShowLabel={() => setShowLabelModal(true)} onReset={() => { if(confirm("¿Resetear?")) resetBatch(); }} 
                onImport={handleCloudImport} onPrintSummary={handlePrintSummary}
            />

            <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />
        </div>
    );
};

export default MassiveBlindView;
