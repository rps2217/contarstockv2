
import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { List, MapPin, Keyboard, ChevronLeft, Package, Clock, Camera, Trash2, MoreVertical, ShieldCheck, History, Lock, Box } from 'lucide-react';
import { CountingSession, ConsolidatedItem } from '../types';
import { useScanner } from '../hooks/useScanner';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';

import { ScannerHero } from './scanner/ScannerHero';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';
import { ExpirationModal } from './ExpirationModal';
import { VirtualList } from './common/VirtualList';
import { getRowStyles } from '../services/uiLogic';
import { ScannerToolsSheet } from './scanner/ScannerToolsSheet';
import { BarcodeLabelModal } from './common/BarcodeLabelModal';
import { thermalPrinter } from '../services/thermalPrinterService';
import { printBarcode } from '../services/printerService';
import { SoundFX } from '../services/audio';
import { LocationSelectorModal } from './common/LocationSelectorModal';

interface ScannerProps {
  session: CountingSession;
  onCloseSession: () => void;
  onDiscardSession: () => void;
}

const HistoryRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { onSelect, activeBarcode, expectedItems, optimisticQty } = data;
    
    const displayQty = activeBarcode === item.barcode ? optimisticQty : item.totalQuantity;
    const target = expectedItems?.find((ei: any) => ei.barcode === item.barcode)?.expectedQty;
    const isActive = activeBarcode === item.barcode;
    const className = getRowStyles(displayQty, target, isActive);

    return (
        <div className="px-3 py-1 h-full">
            <button onClick={() => onSelect(item.barcode)} className={className}>
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black font-mono tracking-widest opacity-50 uppercase">{item.barcode}</span>
                        {item.mm && <span className="text-[7px] bg-white/10 px-1.5 py-0.5 rounded font-black">EXP: {item.mm}/{item.yyyy}</span>}
                    </div>
                    <h3 className="font-black text-[12px] uppercase truncate leading-none">{item.productName}</h3>
                    <div className="text-[7px] font-bold text-white/30 uppercase mt-1">BULTO: {item.location}</div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black tabular-nums leading-none">{displayQty}</div>
                    {target !== undefined && <div className="text-[7px] font-black uppercase opacity-60 mt-1">META: {target}</div>}
                </div>
            </button>
        </div>
    );
});

export const Scanner: React.FC<ScannerProps> = ({ session, onCloseSession, onDiscardSession }) => {
  const { state, data, actions } = useScanner(session, onCloseSession, onDiscardSession);
  const { settings } = useAppStore(); 
  
  const [isTriggerActive, setIsTriggerActive] = useState(false);
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [isChangingLabel, setIsChangingLabel] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [pendingBarcodeForDate, setPendingBarcodeForDate] = useState<string | null>(null);

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await (navigator as any).wakeLock.request('screen');
            }
        } catch (err) {}
    };
    requestWakeLock();
    return () => { if (wakeLock) wakeLock.release(); };
  }, []);

  const existingBarcodes = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(session.id).toArray();
        return new Set(scans.map(s => s.barcode));
    }, [session.id, data.lastScan]
  );

  const handleInbound = useCallback((barcode: string) => {
      if (isScreenLocked) return;
      if (!settings.batchTrackingEnabled) {
          actions.handleExternalScan(barcode);
          return;
      }
      const alreadyHasDateInHistory = existingBarcodes?.has(barcode);
      const hasDateInMemory = !!state.rememberedDate;
      if (!alreadyHasDateInHistory && !hasDateInMemory) {
          setPendingBarcodeForDate(barcode);
          setShowExpirationModal(true);
      } else {
          actions.handleExternalScan(barcode);
      }
  }, [existingBarcodes, actions, isScreenLocked, state.rememberedDate, settings.batchTrackingEnabled]);

  const handleDecrement = useCallback(() => {
      if (!data.lastScan) return;
      const item = data.lastScan as any;
      if (item.totalQuantity <= 1) {
          if (confirm(`¿Eliminar SKU ${item.barcode} del bulto?`)) {
              actions.handleDeleteProduct(item.barcode);
          }
      } else {
          actions.handleQuantityChange(item.barcode, -1);
      }
  }, [data.lastScan, actions]);

  const handleThermalPrint = async () => {
      if (!data.lastScan || isPrinting) return;
      setIsPrinting(true);
      try {
          await thermalPrinter.printLabel(data.lastScan.barcode, (data.lastScan as any).productName, data.lastScan.totalQuantity);
          SoundFX.play('success');
      } catch (e) {
          SoundFX.play('error');
          alert("Error de conexión con impresora.");
      } finally {
          setIsPrinting(false);
      }
  };

  const handlePrintSummary = async () => {
      if (!data.recentScans || data.recentScans.length === 0) return;
      
      if (!thermalPrinter.isConnected()) {
          alert("Impresora no vinculada.");
          return;
      }

      setIsPrinting(true);
      try {
          // Inyectamos el teórico para el reporte
          const enrichedItems = data.recentScans.map(item => ({
              ...item,
              expectedQuantity: session.expectedItems?.find(ei => ei.barcode === item.barcode)?.expectedQty || 0
          }));

          await thermalPrinter.printSummaryReport(
              session.erpOrder,
              session.logisticsLabel,
              enrichedItems
          );
          SoundFX.play('success');
      } catch (e) {
          SoundFX.play('error');
          alert("Error al imprimir manifiesto.");
      } finally {
          setIsPrinting(false);
      }
  };

  const handleResetSession = async () => {
      if (confirm("¿BORRAR TODO EL CONTENIDO? Esta acción vaciará el bulto pero mantendrá la orden ERP.")) {
          await db.scans.where('sessionId').equals(session.id).delete();
          actions.selectItem(""); 
          SoundFX.play('delete');
      }
  };

  useHIDScanner({
      isEnabled: !showExpirationModal && !isScreenLocked && !state.status.includes('manual'),
      onScan: handleInbound
  });

  const onExpirationComplete = (mm?: number, yyyy?: number, remember: boolean = false) => {
      if (remember && mm && yyyy) {
          actions.setRememberedDate({ mm, yyyy });
      }
      if (pendingBarcodeForDate) {
          actions.handleExternalScan(pendingBarcodeForDate, mm, yyyy);
      }
      setShowExpirationModal(false);
      setPendingBarcodeForDate(null);
  };

  const rowData = useMemo(() => ({ 
      onSelect: actions.selectItem, 
      activeBarcode: state.activeBarcode,
      optimisticQty: state.optimisticActiveQty,
      expectedItems: session.expectedItems
  }), [actions.selectItem, state.activeBarcode, state.optimisticActiveQty, session.expectedItems]);

  const quickValues = [5, 10, 20];
  const currentLabel = useLiveQuery(() => db.sessions.get(session.id).then(s => s?.logisticsLabel), [isChangingLabel], session.logisticsLabel);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white font-mono select-none overflow-hidden">
      <header className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-2xl shrink-0 z-50 relative">
          <div className="flex items-center gap-3">
              <button onClick={() => state.setStatus('confirming')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
                  <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={() => setIsScreenLocked(true)} className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl active:bg-amber-500 active:text-black transition-all">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Lock</span>
              </button>
          </div>
          <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">AUDITORIA ERP</span>
                <span className="text-xs font-black uppercase tracking-widest text-white italic truncate max-w-[120px]">{session.erpOrder}</span>
          </div>
          <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsToolsOpen(true)}
                className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-white/20 transition-all text-white"
              >
                  <MoreVertical className="w-6 h-6" />
              </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
             <div 
                className={`h-full transition-all duration-1000 ease-out ${state.globalStats.progress >= 100 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-blue-500'}`}
                style={{ width: `${state.globalStats.progress}%` }}
             />
          </div>
      </header>

      <div className="h-[38vh] shrink-0 relative">
          <ScannerHero 
                lastScan={data.lastScan as any}
                activeProduct={data.lastScan ? { name: (data.lastScan as any).productName, barcode: (data.lastScan as any).barcode } as any : undefined}
                accumulatedQty={state.optimisticActiveQty}
                feedback={state.feedback}
                onRegisterPending={() => state.setStatus('product_form')}
                expectedItem={session.expectedItems?.find(i => i.barcode === data.lastScan?.barcode)}
                onDecrement={handleDecrement}
                onIncrement={() => data.lastScan && handleInbound(data.lastScan.barcode)}
          />
      </div>

      <div className="flex-1 min-0 bg-black flex flex-col relative border-t-8 border-white/5">
          <div className="shrink-0 p-3 bg-slate-900/50 border-b border-white/5 grid grid-cols-4 gap-2">
                <button onClick={() => state.setStatus('manual')} className="h-11 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 transition-all border-2 bg-slate-800 border-slate-700 text-white shadow-lg active:scale-95">
                    <Keyboard className="w-4 h-4" /> <span>MANUAL</span>
                </button>
                {quickValues.map(val => (
                    <button key={val} onClick={() => { state.setMultiplier(val); if(navigator.vibrate) navigator.vibrate(10); }} className={`h-11 rounded-xl font-black text-xs flex items-center justify-center transition-all border-2 ${state.multiplier === val ? 'bg-amber-500 border-amber-600 text-black shadow-lg scale-105' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                        +{val}
                    </button>
                ))}
          </div>
          <div className="flex-1 min-h-0 relative">
                <VirtualList 
                    items={data.recentScans || []} 
                    itemHeight={78} 
                    renderRow={HistoryRow} 
                    rowData={rowData} 
                    className="bg-black/20" 
                    emptyState={<div className="flex flex-col items-center opacity-20 mt-12"><History className="w-16 h-16 mb-4" /><p className="text-[9px] font-black uppercase tracking-[0.5em]">Esperando Escaneo</p></div>} 
                />
          </div>
      </div>
      <div className="h-24 md:h-28 shrink-0 bg-slate-900 border-t border-white/5 flex items-center px-4 z-40 pb-6">
          <button onPointerDown={(e) => { e.preventDefault(); if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} onPointerUp={() => setIsTriggerActive(false)} onPointerLeave={() => setIsTriggerActive(false)} className={`flex-1 h-14 md:h-16 rounded-2xl flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.98] border-b-4 ${isTriggerActive ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0 shadow-inner' : 'bg-white text-black border-slate-300 shadow-2xl'}`}>
              <Camera className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">{isTriggerActive ? 'LENS_OPEN' : 'GATILLO_OPTICO'}</span>
          </button>
      </div>
      {isTriggerActive && <div className="fixed inset-0 z-[250]"><CameraScanner onScan={(code) => { handleInbound(code); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} /></div>}
      {showExpirationModal && pendingBarcodeForDate && (
          <ExpirationModal 
            productName={pendingBarcodeForDate} 
            onComplete={(mm, yyyy) => {
                onExpirationComplete(mm, yyyy, (window as any)._rememberDateActive);
            }} 
          />
      )}
      {state.status === 'manual' && <NumericKeypad isOpen={true} title="SKU MANUAL" onClose={() => state.setStatus('idle')} value={state.manualInput} onInput={(c) => state.setManualInput(p => p + c)} onDelete={() => state.setManualInput(p => p.slice(0, -1))} onConfirm={() => { if (state.manualInput) handleInbound(state.manualInput); state.setManualInput(''); state.setStatus('idle'); }} />}
      <NumericKeypad 
          isOpen={isChangingLabel}
          onClose={() => { setIsChangingLabel(false); setManualCode(''); }}
          title="CAMBIAR_BULTO"
          value={manualCode}
          onInput={(c) => setManualCode(p => p + c)}
          onDelete={() => setManualCode(p => p.slice(0, -1))}
          onConfirm={async () => {
              if (manualCode) await actions.changeLogisticsLabel(manualCode);
              setManualCode('');
              setIsChangingLabel(false);
          }}
      />
      
      <LocationSelectorModal 
          isOpen={isChangingLocation}
          onClose={() => setIsChangingLocation(false)}
          currentLocation={state.currentLocation}
          onSelect={(name) => state.setCurrentLocation(name)}
      />

      <ScannerToolsSheet 
          isOpen={isToolsOpen}
          onClose={() => setIsToolsOpen(false)}
          hasActiveItem={!!data.lastScan}
          location={state.currentLocation}
          label={currentLabel || ''}
          onChangeLocation={() => setIsChangingLocation(true)}
          onChangeLabel={() => { setManualCode(''); setIsChangingLabel(true); }}
          onShowLabel={() => setShowLabelModal(true)}
          onPrintSummary={handlePrintSummary}
          onReset={handleResetSession}
      />
      <BarcodeLabelModal 
          isOpen={showLabelModal}
          onClose={() => setShowLabelModal(false)}
          barcode={data.lastScan?.barcode || ""}
          productName={(data.lastScan as any)?.productName}
          quantity={data.lastScan?.totalQuantity}
          meta={`ORDEN: ${session.erpOrder}`}
          isPrinting={isPrinting}
          onPrintThermal={handleThermalPrint}
          onPrintPDF={() => data.lastScan && printBarcode(data.lastScan.barcode, (data.lastScan as any).productName, `SESSION: ${session.erpOrder}`)}
      />
      {state.status === 'confirming' && (
          <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-slate-900 border-4 border-white/5 rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-2 bg-blue-600"></div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-4">¿Finalizar?</h2>
                  <p className="text-slate-500 mb-10 font-bold uppercase tracking-widest text-[9px]">El contenido se guardará en el historial local.</p>
                  <div className="grid grid-cols-1 gap-3">
                      <button onClick={onCloseSession} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Guardar y Cerrar</button>
                      <button onClick={() => state.setStatus('idle')} className="w-full bg-white/5 text-white/40 py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">Seguir Contando</button>
                      <button onClick={onDiscardSession} className="w-full mt-4 text-rose-500 font-black uppercase tracking-widest text-[8px] opacity-40 hover:opacity-100">Eliminar Sesión</button>
                  </div>
              </div>
          </div>
      )}
      <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => { setIsScreenLocked(false); }} />
    </div>
  );
};
