import React, { useState, memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { Camera, MapPin, Keyboard } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster, importManifestFromCloud } from '../services/massiveSync';
import { SoundFX } from '../services/audio';
import { VirtualList } from './common/VirtualList';
import { printBarcode } from '../services/printerService';
import { thermalPrinter } from '../services/thermalPrinterService';
import { getRowStyles } from '../services/uiLogic';
import { NumericKeypad } from './NumericKeypad';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';

// Subcomponentes Atómicos
import { MassiveHUD } from './massive/MassiveHUD';
import { MassiveHeader } from './massive/MassiveHeader';
import { MassiveLabelModal } from './massive/MassiveLabelModal';
import { MassiveToolsSheet } from './massive/MassiveToolsSheet';

const MassiveItemRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { onSelect, activeBarcode } = data;
    const isActive = activeBarcode === item.barcode;
    const className = getRowStyles(item.totalQuantity, item.expectedQty, isActive);

    return (
        <div className="px-3 py-1 h-full">
            <button onClick={() => onSelect(item.barcode)} className={className}>
                <div className="flex-1 min-w-0 pr-4">
                    <span className="text-[9px] font-black font-mono tracking-widest block mb-1 opacity-50">
                        {item.barcode}
                    </span>
                    <h3 className="font-black text-[13px] uppercase truncate leading-none">
                        {item.name}
                    </h3>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black tabular-nums leading-none">{item.totalQuantity}</div>
                    {item.expectedQty !== undefined && (
                        <div className="text-[8px] font-black uppercase opacity-60 mt-1">OBJ: {item.expectedQty}</div>
                    )}
                </div>
            </button>
        </div>
    );
});

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
    
    // Estados para Teclado Numérico Manual
    const [showKeypad, setShowKeypad] = useState(false);
    const [manualCode, setManualCode] = useState('');

    // --- LÓGICA DE AUTO-BLOQUEO (4 Segundos) ---
    // Fix: Replace NodeJS.Timeout with ReturnType<typeof setTimeout> for browser compatibility
    const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const AUTO_LOCK_DELAY = 4000;

    const resetAutoLockTimer = useCallback(() => {
        if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
        if (isScreenLocked) return;

        autoLockTimerRef.current = setTimeout(() => {
            setIsScreenLocked(true);
            if (navigator.vibrate) navigator.vibrate(10);
        }, AUTO_LOCK_DELAY);
    }, [isScreenLocked]);

    // Resetear timer en interacciones clave
    useEffect(() => {
        resetAutoLockTimer();
        return () => { if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current); };
    }, [lastScannedItem, multiplier, resetAutoLockTimer]);

    const handleInteraction = () => resetAutoLockTimer();

    const handleCloudImport = async () => {
        setIsImporting(true);
        try {
            const count = await importManifestFromCloud(batchId);
            SoundFX.play('success');
            alert(`✓ Descargados ${count} items del maestro STOCK.`);
        } catch (err: any) {
            SoundFX.play('error');
            alert(`Error: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    const handleFinalize = async () => {
        if (!items.length || !confirm("¿Finalizar auditoría y archivar en historial?")) return;
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId);
            SoundFX.play('success');
            navigate('/reports?type=hammer');
        } catch (err: any) {
            SoundFX.play('error');
            alert(`Fallo al migrar: ${err.message}`);
        } finally {
            setIsMigrating(false);
        }
    };

    const handleDecrement = useCallback((item: ConsolidatedBlindItem) => {
        if (item.totalQuantity <= 1) {
            if (confirm(`¿Eliminar SKU ${item.barcode}?`)) removeItemCompletely(item.barcode);
        } else {
            registerScan(item.barcode, -1);
        }
    }, [registerScan, removeItemCompletely]);

    const handleThermalPrint = async () => {
        if (!lastScannedItem || isPrinting) return;
        setIsPrinting(true);
        try {
            await thermalPrinter.printLabel(lastScannedItem.barcode, lastScannedItem.name, lastScannedItem.totalQuantity);
            SoundFX.play('success');
        } catch (e) {
            SoundFX.play('error');
            alert("Error de conexión con impresora.");
        } finally {
            setIsPrinting(false);
        }
    };

    const handleOpenKeypad = () => {
        setManualCode('');
        setShowKeypad(true);
    };

    const handleKeypadConfirm = () => {
        if (manualCode.length > 0) {
            registerScan(manualCode);
        }
        setShowKeypad(false);
    };

    const rowData = useMemo(() => ({ onSelect: selectItem, activeBarcode: lastScannedItem?.barcode }), [selectItem, lastScannedItem?.barcode]);

    // Valores rápidos para el grid
    const quickValues = [5, 10, 20];

    return (
        <div 
            className="h-screen w-full flex flex-col font-mono bg-black select-none overflow-hidden text-white"
            onPointerDown={handleInteraction}
            onKeyDown={handleInteraction}
        >
            
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
                onDecrement={handleDecrement} 
                onIncrement={(code) => registerScan(code)} 
            />

            <div className="flex-1 min-h-0 bg-black flex flex-col">
                <div className="shrink-0 p-3 bg-slate-900/50 border-b border-white/5 grid grid-cols-4 gap-2">
                    <button
                        onClick={handleOpenKeypad}
                        className="h-11 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all border-2 bg-slate-800 border-slate-700 text-white shadow-lg active:scale-95 hover:bg-slate-700"
                    >
                        <Keyboard className="w-4 h-4" />
                        <span>MANUAL</span>
                    </button>

                    {quickValues.map(val => (
                        <button
                            key={val}
                            onClick={() => { setMultiplier(val); if(navigator.vibrate) navigator.vibrate(10); }}
                            className={`h-11 rounded-xl font-black text-xs flex items-center justify-center transition-all border-2 ${multiplier === val ? 'bg-amber-500 border-amber-600 text-black shadow-lg scale-105' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                        >
                            +{val}
                        </button>
                    ))}
                </div>
                <div className="flex-1 min-h-0">
                    <VirtualList items={items} itemHeight={88} renderRow={MassiveItemRow} rowData={rowData} className="bg-black/20" />
                </div>
            </div>

            <div className="h-24 md:h-28 shrink-0 bg-slate-900 border-t border-white/5 flex items-center px-4 z-40 pb-safe">
                <button 
                    onPointerDown={(e) => { e.preventDefault(); if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} 
                    onPointerUp={() => setIsTriggerActive(false)}
                    onPointerLeave={() => setIsTriggerActive(false)}
                    className={`flex-1 h-14 md:h-16 rounded-2xl flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.98] border-b-4 ${isTriggerActive ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0' : 'bg-white text-black border-slate-300 shadow-xl'}`}
                >
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isTriggerActive ? 'LENS_OPEN' : 'GATILLO_OPTICO'}</span>
                </button>
            </div>

            {isTriggerActive && (
                <div className="fixed inset-0 z-[100]">
                     <CameraScanner onScan={(code) => { registerScan(code); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
                </div>
            )}

            <NumericKeypad 
                isOpen={showKeypad}
                onClose={() => setShowKeypad(false)}
                title="Ingresar Código Manual"
                value={manualCode}
                onInput={(v) => setManualCode(prev => prev + v)}
                onDelete={() => setManualCode(prev => prev.slice(0, -1))}
                onConfirm={handleKeypadConfirm}
            />

            <MassiveLabelModal 
                isOpen={showLabelModal} 
                onClose={() => setShowLabelModal(false)}
                item={lastScannedItem}
                isPrinting={isPrinting}
                onPrintThermal={handleThermalPrint}
                onPrintPDF={() => lastScannedItem && printBarcode(lastScannedItem.barcode, lastScannedItem.name, `STOCK_AUDIT: ${lastScannedItem.totalQuantity}`)}
            />

            <MassiveToolsSheet 
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
                hasActiveItem={!!lastScannedItem}
                location={currentLocation}
                onChangeLocation={() => setIsChangingLocation(true)}
                onShowLabel={() => { SoundFX.play('success'); setShowLabelModal(true); }}
                onReset={() => { if(confirm("¿Borrar todo?")) resetBatch(); }}
                onImport={handleCloudImport}
            />

            {/* Modal Ubicación */}
            {isChangingLocation && (
                <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-slate-900 border-2 border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <MapPin className="text-blue-500 w-6 h-6" />
                            <h3 className="text-xl font-black uppercase tracking-tight text-white">Establecer Ubicación</h3>
                        </div>
                        <input 
                            autoFocus 
                            className="w-full h-16 bg-black border-4 border-white/5 rounded-2xl text-center font-black text-2xl uppercase tracking-widest outline-none focus:border-blue-500 transition-all text-white" 
                            placeholder="PASILLO A..." 
                            defaultValue={currentLocation} 
                            onKeyDown={(e) => { 
                                if (e.key === 'Enter') { 
                                    setCurrentLocation((e.target as HTMLInputElement).value.toUpperCase()); 
                                    setIsChangingLocation(false); 
                                } 
                            }} 
                        />
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setIsChangingLocation(false)} className="flex-1 py-4 bg-white/5 text-white/40 font-black uppercase text-xs rounded-xl">Cerrar</button>
                            <button onClick={() => { const val = (document.querySelector('input[placeholder="PASILLO A..."]') as HTMLInputElement).value; setCurrentLocation(val.toUpperCase()); setIsChangingLocation(false); }} className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-xl shadow-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => { setIsScreenLocked(false); resetAutoLockTimer(); }} />
        </div>
    );
};

export default MassiveBlindView;
