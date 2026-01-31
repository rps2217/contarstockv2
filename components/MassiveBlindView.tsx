
import React, { useState, memo, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Save, Upload, Camera, Target, Barcode, X, RotateCcw, Download, Printer, MapPin, FileText } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster, importManifestFromCloud } from '../services/massiveSync';
import { SoundFX } from '../services/audio';
import { VirtualList } from './common/VirtualList';
import { printBarcode } from '../services/printerService';
import { thermalPrinter } from '../services/thermalPrinterService';
import { IndustrialButton } from './common/IndustrialButton';
import { Modal } from './common/Modal';

const MassiveItemRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { onSelect, activeBarcode } = data;
    
    const isActive = activeBarcode === item.barcode;
    const hasTarget = item.expectedQty !== undefined;
    
    let statusClasses = 'bg-slate-900/40 border-white/5'; 
    if (hasTarget) {
        const count = item.totalQuantity;
        const target = item.expectedQty || 0;
        if (count === target) statusClasses = 'bg-emerald-600 border-emerald-400'; 
        else if (count < target) statusClasses = 'bg-rose-700 border-rose-500'; 
        else statusClasses = 'bg-amber-600 border-amber-400'; 
    }

    return (
        <div className="px-3 py-1 h-full">
            <button 
                onClick={() => onSelect(item.barcode)}
                className={`w-full h-full border-2 p-4 rounded-2xl flex items-center justify-between transition-all text-left active:scale-[0.98] ${statusClasses} ${isActive ? 'ring-4 ring-white shadow-2xl scale-[1.02] z-10' : ''}`}
            >
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
                    {hasTarget && <div className="text-[8px] font-black uppercase opacity-60 mt-1">OBJ: {item.expectedQty}</div>}
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
    } = useMassiveScanner(batchId || 'CORE');
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isChangingLocation, setIsChangingLocation] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);

    const handleCloudImport = async () => {
        if (!batchId) return;
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
        if (!batchId || !items.length) return;
        if (!confirm("¿Finalizar auditoría y archivar en historial?")) return;
        
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
            await thermalPrinter.printLabel(
                lastScannedItem.barcode, 
                lastScannedItem.name, 
                lastScannedItem.totalQuantity
            );
            SoundFX.play('success');
        } catch (e) {
            SoundFX.play('error');
            alert("Error de conexión con impresora.");
        } finally {
            setIsPrinting(false);
        }
    };

    const getHudColor = useMemo(() => {
        if (!lastScannedItem) return 'bg-slate-950';
        if (lastScannedItem.expectedQty === undefined) return 'bg-blue-700'; 
        const count = lastScannedItem.totalQuantity;
        const target = lastScannedItem.expectedQty;
        if (count === target) return 'bg-emerald-600';
        if (count < target) return 'bg-rose-700';
        return 'bg-amber-600'; 
    }, [lastScannedItem]);

    const rowData = useMemo(() => ({ onSelect: selectItem, activeBarcode: lastScannedItem?.barcode }), [selectItem, lastScannedItem?.barcode]);

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-black select-none overflow-hidden text-white">
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
                        title="Imprimir Etiqueta"
                    >
                        <Barcode className={`w-5 h-5 ${lastScannedItem ? 'text-blue-400' : 'text-white/20'}`} />
                    </button>
                    <button onClick={() => { if(confirm("¿Borrar todo?")) resetBatch(); }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-rose-600"><RotateCcw className="w-4 h-4 text-white/60" /></button>
                    <button onClick={handleCloudImport} className="w-10 h-10 flex items-center justify-center bg-indigo-600/20 rounded-xl border border-indigo-500/20"><Download className="w-4 h-4 text-indigo-400" /></button>
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-14 h-10 bg-blue-600 rounded-xl active:scale-95 flex items-center justify-center shadow-lg shadow-blue-900/20"><Save className="w-5 h-5" /></button>
                </div>
            </header>

            <div className={`h-[38vh] relative flex flex-col overflow-hidden border-b-4 border-black shrink-0 transition-colors duration-300 ${getHudColor}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent opacity-50"></div>
                <div className="w-full h-full flex items-stretch relative z-10">
                    {lastScannedItem ? (
                        <>
                            <button onPointerDown={(e) => { e.preventDefault(); handleDecrement(lastScannedItem); }} className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-r border-white/5">
                                <Minus className="w-12 h-12 text-white/40 active:text-white" />
                            </button>
                            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                                <div className="mb-2">
                                    <span className="text-white/40 font-mono text-[9px] font-black tracking-[0.3em] block mb-1 uppercase">{lastScannedItem.barcode}</span>
                                    <h2 className="text-white font-black text-xs md:text-sm uppercase tracking-tight line-clamp-2 px-4 leading-tight">{lastScannedItem.name}</h2>
                                </div>
                                <div className="relative">
                                    <div className="text-[10rem] md:text-[12rem] font-black tabular-nums leading-none tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                        {lastScannedItem.totalQuantity}
                                    </div>
                                    {lastScannedItem.expectedQty !== undefined && (
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/20 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                                            Meta: {lastScannedItem.expectedQty}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onPointerDown={(e) => { e.preventDefault(); registerScan(lastScannedItem.barcode); }} className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-l border-white/5">
                                <Plus className="w-12 h-12 text-white/40 active:text-white" />
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex flex-col items-center justify-center opacity-10">
                            <Target className="w-20 h-20 mb-4 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-[0.8em]">Esperando_Input_Laser</p>
                        </div>
                    )}
                </div>
                {feedback === 'success' && <div className="absolute inset-0 z-50 bg-white/20 pointer-events-none animate-flash-quick"></div>}
            </div>

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
                {isTriggerActive && (
                    <div className="fixed inset-0 z-[100]">
                         <CameraScanner onScan={(code) => { registerScan(code); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
                    </div>
                )}
            </div>

            {/* MODAL DE ETIQUETA E IMPRESIÓN (DISEÑO PROFESIONAL REFORZADO) */}
            <Modal 
                isOpen={showLabelModal} 
                onClose={() => setShowLabelModal(false)} 
                title="Generador de Etiqueta"
                variant="center"
                className="max-w-md"
            >
                <div className="p-6 text-center flex flex-col items-center">
                    {/* VISOR DE ETIQUETA ESCALABLE */}
                    <div className="w-full bg-white text-black p-6 rounded-[2.5rem] border-[6px] border-slate-900 mb-8 shadow-2xl relative overflow-hidden flex flex-col items-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-slate-400">LogiCount Industrial System</div>
                        <div className="text-lg font-black uppercase leading-tight mb-6 px-4 w-full break-words">{lastScannedItem?.name}</div>
                        
                        {/* CÓDIGO DE BARRAS DINÁMICO: Nunca escapa del ancho */}
                        <div className="w-full bg-white py-6 flex items-center justify-center overflow-hidden">
                            <div className="barcode-font text-[18vw] sm:text-[80px] leading-none select-none tracking-tight whitespace-nowrap px-4 border-x-8 border-transparent">
                                {lastScannedItem?.barcode}
                            </div>
                        </div>
                        
                        <div className="text-2xl font-black tracking-[0.3em] font-mono mt-4 border-t-2 border-slate-100 pt-4 w-full">
                            {lastScannedItem?.barcode}
                        </div>
                        
                        <div className="mt-8 pt-4 border-t-4 border-dashed border-slate-200 w-full flex justify-between items-center px-6">
                            <span className="text-[10px] font-black uppercase text-slate-400">Cantidad Registrada:</span>
                            <span className="text-4xl font-black tabular-nums">{lastScannedItem?.totalQuantity}</span>
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
                        <IndustrialButton 
                            onClick={handleThermalPrint} 
                            isLoading={isPrinting}
                            variant="primary" 
                            icon={Printer} 
                            fullWidth
                        >
                            Impresión Térmica
                        </IndustrialButton>
                        
                        <IndustrialButton 
                            onClick={() => lastScannedItem && printBarcode(lastScannedItem.barcode, lastScannedItem.name, `STOCK_AUDIT: ${lastScannedItem.totalQuantity}`)} 
                            variant="black" 
                            icon={FileText} 
                            fullWidth
                        >
                            Exportar PDF / A4
                        </IndustrialButton>
                        
                        <button 
                            onClick={() => setShowLabelModal(false)} 
                            className="mt-4 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] py-2"
                        >
                            Volver al Panel
                        </button>
                    </div>
                </div>
            </Modal>

            {isChangingLocation && (
                <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-slate-900 border-2 border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <MapPin className="text-blue-500 w-6 h-6" />
                            <h3 className="text-xl font-black uppercase tracking-tight">Establecer Ubicación</h3>
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
                            <button onClick={() => {
                                const val = (document.querySelector('input[placeholder="PASILLO A..."]') as HTMLInputElement).value;
                                setCurrentLocation(val.toUpperCase());
                                setIsChangingLocation(false);
                            }} className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-xl shadow-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes flash-quick { 0% { opacity: 1; } 100% { opacity: 0; } }
                .animate-flash-quick { animation: flash-quick 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
            `}</style>
        </div>
    );
};

export default MassiveBlindView;
