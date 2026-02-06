
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
import { SoundFX } from '../services/audio';
import { LocationSelectorModal } from './common/LocationSelectorModal';
import { LocationService } from '../services/locationService';

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
        <div className="px-2 py-1 h-full">
            <button onClick={() => onSelect(item.barcode)} className={className}>
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[8px] font-black font-mono tracking-widest opacity-40 uppercase">{item.barcode}</span>
                        {item.mm && <span className="text-[7px] bg-white/10 px-1.5 py-0.5 rounded font-black">EXP: {item.mm}/{item.yyyy}</span>}
                    </div>
                    <h3 className="font-black text-[12px] uppercase truncate leading-none text-white/90">{item.productName}</h3>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black tabular-nums leading-none">{displayQty}</div>
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
      if (isChangingLabel) { setManualCode(barcode); SoundFX.play('success'); return; }

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

  const handleAcceptAiSuggestion = async (loc: string) => {
      await LocationService.saveLocation(loc);
      state.setCurrentLocation(loc);
      state.setAiLocationSuggestion(null);
      SoundFX.play('success');
  };

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
      {/* Header Compacto para Mobile */}
      <header className="h-14 px-3 flex items-center justify-between border-b border-white/10 bg-slate-950 shrink-0 z-50 shadow-lg">
          <div className="flex items-center gap-2">
              <button onClick={() => state.setStatus('confirming')} className="p-2.5 bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
                  <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={() => setIsScreenLocked(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl active:bg-amber-500 active:text-black">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Lock</span>
              </button>
          </div>
          <div className="flex flex-col items-center px-1 truncate">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 leading-none mb-0.5">ORDEN ERP</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-blue-400 truncate max-w-[120px]">{erpTitle}</span>
          </div>
          <button onClick={() => setIsToolsOpen(true)} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-white/20 transition-all border border-white/10">
              <MoreVertical className="w-6 h-6" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
             <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${state.globalStats.progress}%` }} />
          </div>
      </header>

      {/* Hero: Cantidad Grande (42% de altura) */}
      <div className="h-[42vh] shrink-0 relative border-b-4 border-black">
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
                aiSuggestion={state.aiLocationSuggestion}
                onAcceptSuggestion={handleAcceptAiSuggestion}
          />
      </div>

      {/* Lista de Histórico Compacta */}
      <div className="flex-1 min-0 bg-black flex flex-col relative overflow-hidden">
          <div className="shrink-0 p-2 bg-slate-900/40 border-b border-white/5 grid grid-cols-4 gap-2">
                <button onClick={() => state.setStatus('manual')} className="h-10 rounded-xl font-black text-[9px] bg-slate-800 border border-slate-700 text-white active:scale-95">MANUAL</button>
                {[5, 10, 20].map(val => (
                    <button key={val} onClick={() => state.setMultiplier(val)} className={`h-10 rounded-xl font-black text-[11px] border-2 transition-all ${state.multiplier === val ? 'bg-amber-500 border-amber-600 text-black scale-105 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-white/5 border-white/10 text-white/30'}`}>
                        +{val}
                    </button>
                ))}
          </div>
          <div className="flex-1 min-h-0">
                <VirtualList 
                    items={data.recentScans || []} 
                    itemHeight={70} 
                    renderRow={HistoryRow} 
                    rowData={rowData} 
                    className="bg-black/20" 
                    emptyState={<div className="flex flex-col items-center opacity-10 mt-12"><History className="w-12 h-12 mb-3" /><p className="text-[8px] font-black uppercase tracking-[0.4em]">Sin movimientos</p></div>} 
                />
          </div>
      </div>

      {/* Disparador de Cámara Flotante / Inferior (Zona de Máximo Acceso) */}
      <div className="h-20 md:h-24 shrink-0 bg-slate-950 border-t border-white/10 flex items-center px-4 z-40 pb-safe-area shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
          <button 
            onPointerDown={(e) => { e.preventDefault(); if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} 
            onPointerUp={() => setIsTriggerActive(false)} 
            onPointerLeave={() => setIsTriggerActive(false)} 
            className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-4 transition-all border-b-4 ${isTriggerActive ? 'bg-blue-600 border-blue-900 translate-y-1 border-b-0' : 'bg-white text-black border-slate-400 active:scale-[0.98]'}`}
          >
              <Camera className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">{isTriggerActive ? 'LENS_ACTVE' : 'LASER_TRIGGER'}</span>
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

      <NumericKeypad isOpen={isChangingLabel} onClose={() => { setIsChangingLabel(false); setManualCode(''); }} title="SET_BULTO" value={manualCode} onInput={(c) => setManualCode(p => p + c)} onDelete={() => setManualCode(p => p.slice(0, -1))} onConfirm={async () => { if (manualCode) await actions.changeLogisticsLabel(manualCode); setManualCode(''); setIsChangingLabel(false); }} />
      <LocationSelectorModal isOpen={isChangingLocation} onClose={() => setIsChangingLocation(false)} currentLocation={state.currentLocation} onSelect={(name) => state.setCurrentLocation(name)} />
      <ScannerToolsSheet isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)} hasActiveItem={!!data.lastScan} location={state.currentLocation} label={currentLabel || ''} onChangeLocation={() => setIsChangingLocation(true)} onChangeLabel={() => { setManualCode(''); setIsChangingLabel(true); }} onShowLabel={() => setShowLabelModal(true)} onPrintSummary={() => {}} onReset={async () => { if (confirm("¿Vaciar bulto?")) await db.scans.where('sessionId').equals(session.id).delete(); }} />

      {state.status === 'manual' && <NumericKeypad isOpen={true} title="SKU MANUAL" onClose={() => state.setStatus('idle')} value={state.manualInput} onInput={(c) => state.setManualInput(p => p + c)} onDelete={() => state.setManualInput(p => p.slice(0, -1))} onConfirm={() => { if (state.manualInput) handleInbound(state.manualInput); state.setManualInput(''); state.setStatus('idle'); }} />}
      
      <BarcodeLabelModal isOpen={showLabelModal} onClose={() => setShowLabelModal(false)} barcode={data.lastScan?.barcode || ""} productName={(data.lastScan as any)?.productName} quantity={data.lastScan?.totalQuantity} meta={`ORDEN: ${erpTitle}`} isPrinting={isPrinting} onPrintThermal={async () => { setIsPrinting(true); try { await thermalPrinter.printLabel(data.lastScan!.barcode, (data.lastScan as any).productName, data.lastScan!.totalQuantity); } finally { setIsPrinting(false); } }} />
      
      <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />

      {state.status === 'confirming' && (
          <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6">
              <div className="bg-slate-900 border-4 border-white/5 rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl">
                  <h2 className="text-3xl font-black text-white uppercase italic mb-4 tracking-tighter italic">Cerrar_Bulto</h2>
                  <p className="text-slate-500 mb-10 font-bold uppercase tracking-widest text-[9px]">El registro se guardará en local.</p>
                  <div className="grid gap-3">
                      <button onClick={onCloseSession} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Guardar y Finalizar</button>
                      <button onClick={() => state.setStatus('idle')} className="w-full bg-white/5 text-white/40 py-5 rounded-2xl font-black uppercase tracking-widest active:bg-white/10 transition-all">Cancelar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
