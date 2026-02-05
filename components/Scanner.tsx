
import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { ChevronLeft, Package, Keyboard, Camera, MoreVertical, Lock, History, Box, MapPin, Sparkles, Loader2 } from 'lucide-react';
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
    const target = item.expectedQuantity ?? expectedItems?.find((ei: any) => ei.barcode === item.barcode)?.expectedQty;
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

  const handleInbound = useCallback((barcode: string) => {
      if (isScreenLocked) return;

      if (isChangingLabel) {
          setManualCode(barcode);
          SoundFX.play('success');
          return;
      }

      if (!settings.batchTrackingEnabled) {
          actions.handleExternalScan(barcode);
          return;
      }
      
      const hasDateInMemory = !!state.rememberedDate;
      if (!hasDateInMemory) {
          setPendingBarcodeForDate(barcode);
          setShowExpirationModal(true);
      } else {
          actions.handleExternalScan(barcode);
      }
  }, [actions, isScreenLocked, state.rememberedDate, settings.batchTrackingEnabled, isChangingLabel]);

  useHIDScanner({
      isEnabled: !showExpirationModal && !isScreenLocked && !state.status.includes('manual'),
      onScan: handleInbound
  });

  const handleDecrement = useCallback(() => {
      if (!data.lastScan) return;
      const item = data.lastScan as any;
      if (item.totalQuantity <= 1) {
          if (confirm(`¿Eliminar SKU ${item.barcode}?`)) actions.handleDeleteProduct(item.barcode);
      } else {
          actions.handleQuantityChange(item.barcode, -1);
      }
  }, [data.lastScan, actions]);

  const rowData = useMemo(() => ({ 
      onSelect: actions.selectItem, 
      activeBarcode: state.activeBarcode,
      optimisticQty: state.optimisticActiveQty,
      expectedItems: session.expectedItems
  }), [actions.selectItem, state.activeBarcode, state.optimisticActiveQty, session.expectedItems]);

  const currentLabel = useLiveQuery(() => db.sessions.get(session.id).then(s => s?.logisticsLabel), [isChangingLabel, session.id]);
  const erpTitle = state.deducedErp || session.erpOrder;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white font-mono select-none overflow-hidden">
      <header className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-2xl shrink-0 z-50">
          <div className="flex items-center gap-3">
              <button onClick={() => state.setStatus('confirming')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600">
                  <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={() => setIsScreenLocked(true)} className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Lock</span>
              </button>
          </div>
          <div className="flex flex-col items-center min-w-0 px-2">
                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1 flex items-center gap-1">
                   {state.isDeducing ? <Loader2 className="w-2 h-2 animate-spin" /> : (state.hasOrdersInDb === false ? <Box className="w-2 h-2 text-slate-500" /> : <Sparkles className="w-2 h-2 text-orange-400" />)} 
                   {state.hasOrdersInDb === false ? 'CONTEO CIEGO' : 'AUDITORIA INTELIGENTE'}
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-white italic truncate max-w-[140px]">
                    {erpTitle}
                </span>
          </div>
          <button onClick={() => setIsToolsOpen(true)} className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 active:bg-white/20 transition-all">
              <MoreVertical className="w-6 h-6 text-white" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
             <div className="h-full bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${state.globalStats.progress}%` }} />
          </div>
      </header>

      <div className="h-[38vh] shrink-0 relative">
          <ScannerHero 
                lastScan={data.lastScan as any}
                activeProduct={data.lastScan ? { name: (data.lastScan as any).productName, barcode: (data.lastScan as any).barcode } as any : undefined}
                accumulatedQty={state.optimisticActiveQty}
                feedback={state.feedback}
                onRegisterPending={() => state.setStatus('product_form')}
                expectedItem={session.expectedItems?.find(i => i.barcode === data.lastScan?.barcode) || null}
                onDecrement={handleDecrement}
                onIncrement={() => data.lastScan && handleInbound(data.lastScan.barcode)}
                isDeducing={state.isDeducing}
                hasOrdersInDb={state.hasOrdersInDb}
                deducedErp={state.deducedErp}
          />
      </div>

      <div className="flex-1 min-0 bg-black flex flex-col relative border-t-8 border-white/5">
          <div className="shrink-0 p-3 bg-slate-900/50 border-b border-white/5 grid grid-cols-4 gap-2">
                <button onClick={() => state.setStatus('manual')} className="h-11 rounded-xl font-black text-[10px] bg-slate-800 border-slate-700 text-white shadow-lg active:scale-95">MANUAL</button>
                {[5, 10, 20].map(val => (
                    <button key={val} onClick={() => state.setMultiplier(val)} className={`h-11 rounded-xl font-black text-xs border-2 ${state.multiplier === val ? 'bg-amber-500 border-amber-600 text-black shadow-lg scale-105' : 'bg-white/5 border-white/10 text-white/40'}`}>
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

      <div className="h-24 md:h-28 shrink-0 bg-slate-900 border-t border-white/5 flex items-center px-4 z-40 pb-safe-area">
          <button onPointerDown={(e) => { e.preventDefault(); if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} onPointerUp={() => setIsTriggerActive(false)} onPointerLeave={() => setIsTriggerActive(false)} className={`flex-1 h-14 md:h-16 rounded-2xl flex items-center justify-center gap-4 transition-all border-b-4 ${isTriggerActive ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0' : 'bg-white text-black border-slate-300 shadow-2xl'}`}>
              <Camera className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">{isTriggerActive ? 'LENS_OPEN' : 'GATILLO_OPTICO'}</span>
          </button>
      </div>

      {isTriggerActive && <div className="fixed inset-0 z-[250]"><CameraScanner onScan={(code) => { handleInbound(code); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} /></div>}
      
      {showExpirationModal && pendingBarcodeForDate && (
          <ExpirationModal 
            productName={pendingBarcodeForDate} 
            onComplete={(mm, yyyy, batch) => {
                if (mm && yyyy) actions.setRememberedDate({ mm, yyyy, batch });
                actions.handleExternalScan(pendingBarcodeForDate, mm, yyyy, batch);
                setShowExpirationModal(false);
                setPendingBarcodeForDate(null);
            }} 
          />
      )}

      <NumericKeypad isOpen={isChangingLabel} onClose={() => { setIsChangingLabel(false); setManualCode(''); }} title="CAMBIAR_BULTO" value={manualCode} onInput={(c) => setManualCode(p => p + c)} onDelete={() => setManualCode(p => p.slice(0, -1))} onConfirm={async () => { if (manualCode) await actions.changeLogisticsLabel(manualCode); setManualCode(''); setIsChangingLabel(false); }} />
      <LocationSelectorModal isOpen={isChangingLocation} onClose={() => setIsChangingLocation(false)} currentLocation={state.currentLocation} onSelect={(name) => state.setCurrentLocation(name)} />
      <ScannerToolsSheet isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)} hasActiveItem={!!data.lastScan} location={state.currentLocation} label={currentLabel || ''} onChangeLocation={() => setIsChangingLocation(true)} onChangeLabel={() => { setManualCode(''); setIsChangingLabel(true); }} onShowLabel={() => setShowLabelModal(true)} onPrintSummary={() => {}} onReset={async () => { if (confirm("¿Vaciar bulto?")) await db.scans.where('sessionId').equals(session.id).delete(); }} />

      {state.status === 'manual' && <NumericKeypad isOpen={true} title="SKU MANUAL" onClose={() => state.setStatus('idle')} value={state.manualInput} onInput={(c) => state.setManualInput(p => p + c)} onDelete={() => state.setManualInput(p => p.slice(0, -1))} onConfirm={() => { if (state.manualInput) handleInbound(state.manualInput); state.setManualInput(''); state.setStatus('idle'); }} />}
      
      <BarcodeLabelModal isOpen={showLabelModal} onClose={() => setShowLabelModal(false)} barcode={data.lastScan?.barcode || ""} productName={(data.lastScan as any)?.productName} quantity={data.lastScan?.totalQuantity} meta={`ORDEN: ${erpTitle}`} isPrinting={isPrinting} onPrintThermal={async () => { setIsPrinting(true); try { await thermalPrinter.printLabel(data.lastScan!.barcode, (data.lastScan as any).productName, data.lastScan!.totalQuantity); } finally { setIsPrinting(false); } }} />
      
      {state.status === 'confirming' && (
          <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
              <div className="bg-slate-900 border-4 border-white/5 rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl">
                  <h2 className="text-3xl font-black text-white uppercase italic mb-4">¿Finalizar?</h2>
                  <p className="text-slate-500 mb-10 font-bold uppercase tracking-widest text-[9px]">El contenido se guardará localmente.</p>
                  <div className="grid gap-3">
                      <button onClick={onCloseSession} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Guardar y Cerrar</button>
                      <button onClick={() => state.setStatus('idle')} className="w-full bg-white/5 text-white/40 py-5 rounded-2xl font-black uppercase tracking-widest">Cancelar</button>
                  </div>
              </div>
          </div>
      )}
      <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />
    </div>
  );
};
