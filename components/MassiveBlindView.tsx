import React, { useState, memo, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMassiveScanner, ConsolidatedBlindItem } from '../hooks/useMassiveScanner';
import { ChevronLeft, Plus, Minus, ScanLine, Save, Upload, Camera, Target, Barcode, X, RotateCcw, Download, Printer } from 'lucide-react';
import { CameraScanner } from './CameraScanner';
import { migrateMassiveToMaster, importManifestFromCloud } from '../services/massiveSync';
import { SoundFX } from '../services/audio';
import { VirtualList } from './common/VirtualList';

// --- FILA DE HISTORIAL ---
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
        else if (count < target) statusClasses = 'bg-red-600 border-red-400'; 
        else statusClasses = 'bg-[#ff8c69] border-[#ff7247]'; 
    }

    const activeOverlay = isActive ? 'ring-4 ring-white ring-inset shadow-[0_0_25px_rgba(255,255,255,0.3)] z-10 scale-[1.02]' : '';
    const activeBlue = (isActive && !hasTarget) ? 'bg-blue-600 border-blue-400' : '';

    return (
        <div className="px-3 py-1 h-full">
            <button 
                onClick={() => onSelect(item.barcode)}
                className={`w-full h-full border-2 p-4 rounded-2xl flex items-center justify-between transition-all text-left active:scale-[0.98] ${statusClasses} ${activeBlue} ${activeOverlay}`}
            >
                <div className="flex-1 min-w-0 pr-4">
                    <span className={`text-[10px] font-black font-mono tracking-tight block mb-0.5 ${isActive ? 'text-white' : 'text-white/60'}`}>
                        {item.barcode}
                    </span>
                    <h3 className={`font-black text-[12px] uppercase truncate leading-none ${isActive ? 'text-white' : 'text-white/90'}`}>
                        {item.name}
                    </h3>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right tabular-nums">
                        <div className="text-2xl font-black text-white leading-none">{item.totalQuantity}</div>
                        {hasTarget && (
                            <div className="text-[10px] font-black text-white/50 mt-1 uppercase tracking-tighter">
                                Obj: {item.expectedQty}
                            </div>
                        )}
                    </div>
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
    
    const handleDecrement = useCallback((item: ConsolidatedBlindItem) => {
        if (item.totalQuantity <= 1) {
            if (confirm(`¿Eliminar SKU ${item.barcode}?`)) removeItemCompletely(item.barcode);
        } else {
            registerScan(item.barcode, -1);
        }
    }, [registerScan, removeItemCompletely]);

    // ... (Lógica de impresión y eventos idéntica)
    const handlePrintBarcode = (barcode: string, name: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert("Bloqueador de ventanas detectado."); return; }
        printWindow.document.write(`<html><body><h1>${barcode}</h1></body></html>`); 
        printWindow.document.close();
        printWindow.print();
    };

    const handleCloudImport = async () => {
        if (!navigator.onLine) { alert("Sin conexión"); return; }
        if (!confirm("¿Descargar STOCK?")) return;
        setIsImporting(true);
        try {
            const count = await importManifestFromCloud(batchId || 'CORE');
            SoundFX.play('success');
            alert(`✅ Stock Descargado: ${count} registros.`);
        } catch (e: any) {
            alert(`Error: ${e.message}`);
            SoundFX.play('error');
        } finally {
            setIsImporting(false);
        }
    };

    const handleFinalize = async () => {
        if (!items.length) return;
        setIsMigrating(true);
        try {
            await migrateMassiveToMaster(batchId || 'CORE');
            navigate('/dashboard');
        } catch (e: any) { alert(e.message); }
        finally { setIsMigrating(false); }
    };

    const getHudColor = useMemo(() => {
        if (!lastScannedItem) return 'bg-black';
        if (lastScannedItem.expectedQty === undefined) return 'bg-blue-600'; 
        const count = lastScannedItem.totalQuantity;
        const target = lastScannedItem.expectedQty;
        if (count === target) return 'bg-emerald-600';
        if (count < target) return 'bg-red-600';
        return 'bg-[#ff8c69]'; 
    }, [lastScannedItem]);

    const rowData = useMemo(() => ({
        onSelect: selectItem,
        activeBarcode: lastScannedItem?.barcode
    }), [selectItem, lastScannedItem?.barcode]);

    return (
        <div className="h-screen w-full flex flex-col font-mono bg-black select-none overflow-hidden text-white">
            <header className="h-14 px-4 flex items-center justify-between border-b-2 border-white/5 bg-slate-900/50 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600"><ChevronLeft className="w-6 h-6" /></button>
                    <span className="text-[10px] text-white/40 font-black tracking-widest uppercase truncate max-w-[100px]">{batchId}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { if(confirm("¿Borrar todo?")) resetBatch(); }} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-rose-600"><RotateCcw className="w-4 h-4 text-white/60" /></button>
                    <button disabled={!lastScannedItem} onClick={() => setShowBarcodeModal(true)} className={`w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 ${!lastScannedItem ? 'opacity-20' : 'bg-white/10 active:bg-blue-600'}`}><Barcode className="w-5 h-5 text-white" /></button>
                    <button disabled={isImporting} onClick={handleCloudImport} className={`w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 ${isImporting ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-600/20 active:bg-indigo-600'}`}><Download className="w-4 h-4 text-white" /></button>
                    <button onClick={handleFinalize} disabled={!items.length || isMigrating || isImporting} className="w-14 h-10 bg-blue-600 rounded-xl active:scale-95 flex items-center justify-center shadow-lg"><Save className="w-5 h-5" /></button>
                </div>
            </header>

            <div className={`h-[42vh] relative flex flex-col overflow-hidden border-b-2 border-white/5 shrink-0 transition-colors duration-200 ${getHudColor}`}>
                <div className="w-full h-full flex items-stretch">
                    {lastScannedItem ? (
                        <>
                            <button onPointerDown={(e) => { e.preventDefault(); handleDecrement(lastScannedItem); }} className="w-1/5 bg-black/10 active:bg-black/40 flex items-center justify-center border-r border-white/10">
                                <Minus className="w-12 h-12 text-white/80" />
                            </button>
                            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
                                <div className="mb-4 w-full max-w-xs">
                                    <span className="text-white/60 font-mono text-[11px] font-black tracking-[0.2em] block mb-1">{lastScannedItem.barcode}</span>
                                    <h2 className="text-white font-black text-xs md:text-sm uppercase tracking-tight line-clamp-2 leading-tight">{lastScannedItem.name}</h2>
                                </div>
                                <div className="relative">
                                    <div className="text-[12rem] font-black tabular-nums leading-none text-white drop-shadow-2xl">{lastScannedItem.totalQuantity}</div>
                                    {lastScannedItem.expectedQty !== undefined && (
                                        <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 inline-block">OBJETIVO: {lastScannedItem.expectedQty}</div>
                                    )}
                                </div>
                            </div>
                            <button onPointerDown={(e) => { e.preventDefault(); registerScan(lastScannedItem.barcode, 1); }} className="w-1/5 bg-black/10 active:bg-black/40 flex items-center justify-center border-l border-white/10">
                                <Plus className="w-12 h-12 text-white/80" />
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex flex-col items-center justify-center opacity-10">
                            <Target className="w-24 h-24 mb-6 animate-pulse" />
                            <p className="text-[12px] font-black uppercase tracking-[0.6em]">Ready_For_Laser</p>
                        </div>
                    )}
                </div>
                {/* Visual Feedback Layer: Mapeamos el estado 'success' al flash blanco */}
                {feedback === 'success' && <div className="absolute inset-0 z-[300] bg-white/40 pointer-events-none flash-active"></div>}
            </div>

            <div className="h-24 shrink-0 bg-slate-900 flex items-center px-4 relative z-40 border-b-8 border-black">
                <button 
                    onPointerDown={(e) => { e.preventDefault(); if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} 
                    onPointerUp={() => setIsTriggerActive(false)}
                    onPointerLeave={() => setIsTriggerActive(false)}
                    className={`flex-1 h-16 rounded-3xl flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.98] border-b-8 ${isTriggerActive ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0' : 'bg-white text-black border-slate-300 shadow-xl'}`}
                >
                    {isTriggerActive ? <ScanLine className="w-8 h-8 animate-bounce" /> : <Camera className="w-8 h-8" />}
                    <span className="text-xs font-black uppercase tracking-[0.3em]">{isTriggerActive ? 'LENS_ACTIVE' : 'MANTENER_PARA_ESCANEAR'}</span>
                </button>
                {isTriggerActive && (
                    <div className="fixed inset-0 z-[100] animate-in fade-in duration-75">
                         <CameraScanner onScan={registerScan} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0 bg-black">
                <div className="h-full">
                    <VirtualList 
                        items={items}
                        itemHeight={84}
                        renderRow={MassiveItemRow}
                        rowData={rowData}
                        className="bg-black"
                    />
                </div>
            </div>

            {/* Modal de Barcode (sin cambios) */}
            {showBarcodeModal && lastScannedItem && (
                <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl flex flex-col items-center">
                        <div className="w-full bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-slate-900 font-black uppercase tracking-tight text-sm">Visual_SKU_Beam</h3>
                            <button onClick={() => setShowBarcodeModal(false)} className="p-2 bg-white text-slate-400 rounded-full active:scale-90"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 text-center w-full">
                             <div className="bg-white p-4 py-10 rounded-[2rem] mb-4 flex flex-col items-center border-2 border-slate-50 overflow-hidden">
                                 <div className="barcode-font text-[75px] leading-none text-black mb-6 whitespace-nowrap">{lastScannedItem.barcode}</div>
                                 <div className="font-mono text-xl font-black text-slate-900 tracking-[0.4em] bg-slate-50 px-4 py-1 rounded-lg">{lastScannedItem.barcode}</div>
                             </div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 line-clamp-2">{lastScannedItem.name}</p>
                        </div>
                        <div className="w-full p-6 bg-slate-50 grid grid-cols-2 gap-3">
                            <button onClick={() => handlePrintBarcode(lastScannedItem.barcode, lastScannedItem.name)} className="bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-200">
                                <Printer className="w-4 h-4" /> Imprimir
                            </button>
                            <button onClick={() => setShowBarcodeModal(false)} className="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs active:scale-95 shadow-lg">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MassiveBlindView;