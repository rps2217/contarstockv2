
import React, { useState, memo, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { Camera, Save, Download, RotateCcw, Barcode, MapPin, ChevronLeft, Printer, FileText } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster, importManifestFromCloud } from '../services/massiveSync';
import { SoundFX } from '../services/audio';
import { VirtualList } from './common/VirtualList';
import { printBarcode } from '../services/printerService';
import { thermalPrinter } from '../services/thermalPrinterService';
import { IndustrialButton } from './common/IndustrialButton';
import { Modal } from './common/Modal';
import { getRowStyles } from '../services/uiLogic';
import { MassiveHUD } from './massive/MassiveHUD';

// --- ROW COMPONENT (Memoized & DRY) ---
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

// --- MAIN VIEW ---
const MassiveBlindView: React.FC = () => {
    const navigate = useNavigate();
    const { batchId = 'CORE' } = useParams();
    
    // State Logic Hook
    const { 
        items, lastScannedItem, feedback, multiplier, setMultiplier, 
        currentLocation, setCurrentLocation, registerScan, selectItem, 
        removeItemCompletely, resetBatch 
    } = useMassiveScanner(batchId);
    
    // UI Local State
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isChangingLocation, setIsChangingLocation] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);

    // --- HANDLERS ---
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

    const rowData = useMemo(() => ({ onSelect: selectItem, activeBarcode: lastScannedItem?.barcode }), [selectItem, lastScannedItem?.barcode]);

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-black select-none overflow-hidden text-white">
            {/* HEADER */}
            <header className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900/80 shrink-0 z-50">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white/5 rounded-xl active:bg-blue-600"><ChevronLeft className="w-5 h-5" /></button>
                    <button 
                        onClick={() => setIsChangingLocation(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group"
                    >
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[9px] font-black uppercase truncate max-w-[80px]">{currentLocation}</span>
                    </button>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        disabled={!lastScannedItem}
                        onClick={() => { SoundFX.play('success'); setShowLabelModal(true); }}
                        className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-blue-600 disabled:opacity-20 transition-all"
                    >
                        <Barcode className={`w-5 h-5 ${lastScannedItem ? 'text-blue-400' : 'text-white/20'}`} />
                    </button>
                    <button onClick={() => { if(confirm("¿Borrar todo?")) resetBatch(); }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-rose-600"><RotateCcw className="w-4 h-4 text-white/60" /></button>
                    <button onClick={handleCloudImport} className="w-10 h-10 flex items-center justify-center bg-indigo-600/20 rounded-xl border border-indigo-500/20"><Download className="w-4 h-4 text-indigo-400" /></button>
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-14 h-10 bg-blue-600 rounded-xl active:scale-95 flex items-center justify-center shadow-lg shadow-blue-900/20"><Save className="w-5 h-5" /></button>
                </div>
            </header>

            {/* HUD (HEAD UP DISPLAY) */}
            <MassiveHUD 
                item={lastScannedItem} 
                feedback={feedback} 
                onDecrement={handleDecrement} 
                onIncrement={(code) => registerScan(code)} 
            />

            {/* LIST AREA */}
            <div className="flex-1 min-h-0 bg-black flex flex-col">
                <div className="shrink-0 p-3 bg-slate-900/50 border-b border-white/5 grid grid-cols-4 gap-2">
                    {[1, 5, 10, 20].map(val => (
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

            {/* FOOTER TRIGGER */}
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

            {/* MODALES */}
            <Modal isOpen={showLabelModal} onClose={() => setShowLabelModal(false)} title="Generador de Etiqueta" variant="center" className="max-w-md w-[95vw]">
                <div className="p-4 text-center flex flex-col items-center">
                    <div className="w-full bg-white text-black p-4 py-8 rounded-[1.5rem] border-[4px] border-slate-900 mb-6 shadow-2xl relative flex flex-col items-center justify-center overflow-hidden">
                        <div className="text-[8px] font-black uppercase tracking-[0.4em] mb-4 text-slate-300">LOGICOUNT SYSTEM v4.5</div>
                        <div className="text-sm font-bold uppercase leading-tight mb-4 px-2 w-full break-words max-h-12 overflow-hidden text-center">{lastScannedItem?.name}</div>
                        <div className="w-full bg-white py-4 flex items-center justify-center overflow-hidden min-h-[140px] border-y border-slate-100 mb-4">
                            <div className="barcode-font text-[100px] leading-none select-none tracking-tight whitespace-nowrap px-6 border-x-8 border-transparent scale-[1.0] transform-gpu">{lastScannedItem?.barcode}</div>
                        </div>
                        <div className="text-3xl font-black tracking-[0.35em] font-mono text-center">{lastScannedItem?.barcode}</div>
                        <div className="mt-6 text-[9px] font-black text-slate-300 uppercase tracking-widest border-t border-slate-50 pt-2 w-full">Registro Interno: {lastScannedItem?.totalQuantity} U.</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 w-full px-2">
                        <IndustrialButton onClick={handleThermalPrint} isLoading={isPrinting} variant="primary" icon={Printer} fullWidth>Impresión Térmica</IndustrialButton>
                        <div className="grid grid-cols-2 gap-2">
                             <IndustrialButton onClick={() => lastScannedItem && printBarcode(lastScannedItem.barcode, lastScannedItem.name, `STOCK_AUDIT: ${lastScannedItem.totalQuantity}`)} variant="black" icon={FileText} fullWidth className="h-12 text-[10px]">PDF A4</IndustrialButton>
                            <button onClick={() => setShowLabelModal(false)} className="bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-[0.1em] rounded-2xl active:bg-slate-200">Cerrar</button>
                        </div>
                    </div>
                </div>
                <style>{`.barcode-font { font-size: min(25vw, 100px); display: inline-block; width: auto; max-width: 100%; }`}</style>
            </Modal>

            {isChangingLocation && (
                <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-slate-900 border-2 border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <MapPin className="text-blue-500 w-6 h-6" />
                            <h3 className="text-xl font-black uppercase tracking-tight">Establecer Ubicación</h3>
                        </div>
                        <input autoFocus className="w-full h-16 bg-black border-4 border-white/5 rounded-2xl text-center font-black text-2xl uppercase tracking-widest outline-none focus:border-blue-500 transition-all text-white" placeholder="PASILLO A..." defaultValue={currentLocation} onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentLocation((e.target as HTMLInputElement).value.toUpperCase()); setIsChangingLocation(false); } }} />
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setIsChangingLocation(false)} className="flex-1 py-4 bg-white/5 text-white/40 font-black uppercase text-xs rounded-xl">Cerrar</button>
                            <button onClick={() => { const val = (document.querySelector('input[placeholder="PASILLO A..."]') as HTMLInputElement).value; setCurrentLocation(val.toUpperCase()); setIsChangingLocation(false); }} className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-xl shadow-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MassiveBlindView;
