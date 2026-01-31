
import React, { useState, memo, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Save, Upload, Camera, Target, Barcode, X, RotateCcw, Download, Printer } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster, importManifestFromCloud } from '../services/massiveSync';
import { SoundFX } from '../services/audio';
import { VirtualList } from './common/VirtualList';
import { printBarcode } from '../services/printerService';
import { thermalPrinter } from '../services/thermalPrinterService';
import { IndustrialButton } from './common/IndustrialButton';
import { Modal } from './common/Modal';
import { useAppStore } from '../store/useAppStore';

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
    const { items, lastScannedItem, feedback, registerScan, selectItem, removeItemCompletely, resetBatch } = useMassiveScanner(batchId || 'CORE');
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    
    // Fix: Added handleCloudImport to download manifest from Google Sheets
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

    // Fix: Added handleFinalize to migrate session data to permanent storage
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
                <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white/5 rounded-xl active:bg-blue-600"><ChevronLeft className="w-5 h-5" /></button>
                <div className="flex gap-2">
                    {thermalPrinter.isConnected() && (
                         <button disabled={!lastScannedItem || isPrinting} onClick={async () => { setIsPrinting(true); await thermalPrinter.printLabel(lastScannedItem!.barcode, lastScannedItem!.name, lastScannedItem!.totalQuantity); setIsPrinting(false); }} className={`w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 ${isPrinting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}`}><Printer className="w-4 h-4 text-white" /></button>
                    )}
                    <button onClick={() => { if(confirm("¿Borrar todo?")) resetBatch(); }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-rose-600"><RotateCcw className="w-4 h-4 text-white/60" /></button>
                    <button onClick={handleCloudImport} className="w-10 h-10 flex items-center justify-center bg-indigo-600/20 rounded-xl border border-indigo-500/20"><Download className="w-4 h-4 text-indigo-400" /></button>
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating} className="w-14 h-10 bg-blue-600 rounded-xl active:scale-95 flex items-center justify-center shadow-lg shadow-blue-900/20"><Save className="w-5 h-5" /></button>
                </div>
            </header>

            {/* HUD CON REFINAMIENTO TÉCNICO */}
            <div className={`h-[42vh] relative flex flex-col overflow-hidden border-b-4 border-black shrink-0 transition-colors duration-300 ${getHudColor}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent opacity-50"></div>
                <div className="w-full h-full flex items-stretch relative z-10">
                    {lastScannedItem ? (
                        <>
                            <button onPointerDown={(e) => { e.preventDefault(); handleDecrement(lastScannedItem); }} className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-r border-white/5">
                                <Minus className="w-12 h-12 text-white/40 active:text-white" />
                            </button>
                            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                                <div className="mb-4">
                                    <span className="text-white/40 font-mono text-[10px] font-black tracking-[0.3em] block mb-1 uppercase">{lastScannedItem.barcode}</span>
                                    <h2 className="text-white font-black text-sm md:text-base uppercase tracking-tight line-clamp-2 px-4 leading-tight">{lastScannedItem.name}</h2>
                                </div>
                                <div className="relative">
                                    <div className="text-[12.5rem] md:text-[15rem] font-black tabular-nums leading-none tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                        {lastScannedItem.totalQuantity}
                                    </div>
                                    {lastScannedItem.expectedQty !== undefined && (
                                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                                            Meta: {lastScannedItem.expectedQty}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onPointerDown={(e) => { e.preventDefault(); registerScan(lastScannedItem.barcode, 1); }} className="w-1/4 bg-black/10 active:bg-black/30 flex items-center justify-center border-l border-white/5">
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

            <div className="flex-1 min-h-0 bg-black">
                <VirtualList items={items} itemHeight={88} renderRow={MassiveItemRow} rowData={rowData} className="bg-black/20" />
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
                         <CameraScanner onScan={registerScan} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes flash-quick { 0% { opacity: 1; } 100% { opacity: 0; } }
                .animate-flash-quick { animation: flash-quick 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
            `}</style>
        </div>
    );
};

export default MassiveBlindView;
