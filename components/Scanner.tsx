
import React, { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react';
import { List, MapPin, Keyboard, ChevronLeft, Package, Clock, Camera, Trash2, MoreVertical, ShieldCheck, History, Lock } from 'lucide-react';
import { CountingSession, ScanRecord } from '../types';
import { useScanner } from '../hooks/useScanner';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService';

import { ScannerHero } from './scanner/ScannerHero';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';
import { ExpirationModal } from './ExpirationModal';
import { VirtualList } from './common/VirtualList';
import { getRowStyles } from '../services/uiLogic';

interface ScannerProps {
  session: CountingSession;
  onCloseSession: () => void;
  onDiscardSession?: () => void;
}

const HistoryRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { onSelect, activeBarcode, expectedItems } = data;
    
    const target = expectedItems?.find((ei: any) => ei.barcode === item.barcode)?.expectedQty;
    const isActive = activeBarcode === item.barcode;
    const className = getRowStyles(item.quantity, target, isActive);

    return (
        <div className="px-3 py-1 h-full">
            <button onClick={() => onSelect(item.barcode)} className={className}>
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black font-mono tracking-widest opacity-50 uppercase">{item.barcode}</span>
                        {item.mm && <span className="text-[7px] bg-white/10 px-1.5 py-0.5 rounded font-black">EXP: {item.mm}/{item.yyyy}</span>}
                    </div>
                    <h3 className="font-black text-[12px] uppercase truncate leading-none">PRODUCTO_REGISTRADO</h3>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black tabular-nums leading-none">{item.quantity}</div>
                    {target !== undefined && <div className="text-[7px] font-black uppercase opacity-60 mt-1">META: {target}</div>}
                </div>
            </button>
        </div>
    );
});

export const Scanner: React.FC<ScannerProps> = ({ session, onCloseSession, onDiscardSession }) => {
  const { state, data, actions } = useScanner(session, onCloseSession, onDiscardSession);
  
  const [isTriggerActive, setIsTriggerActive] = useState(false);
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [pendingBarcodeForDate, setPendingBarcodeForDate] = useState<string | null>(null);
  
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAutoLock = useCallback(() => {
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    if (isScreenLocked) return;
    autoLockTimerRef.current = setTimeout(() => {
        setIsScreenLocked(true);
        if (navigator.vibrate) navigator.vibrate(10);
    }, 4000);
  }, [isScreenLocked]);

  useEffect(() => {
      resetAutoLock();
      return () => { if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current); };
  }, [data.lastScan, state.multiplier, resetAutoLock]);

  const existingBarcodes = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(session.id).toArray();
        return new Set(scans.map(s => s.barcode));
    }, [session.id, data.lastScan]
  );

  const handleInbound = useCallback((barcode: string) => {
      if (isScreenLocked) return;
      const alreadyHasDate = existingBarcodes?.has(barcode);
      if (!alreadyHasDate) {
          setPendingBarcodeForDate(barcode);
          setShowExpirationModal(true);
      } else {
          actions.handleExternalScan(barcode);
      }
  }, [existingBarcodes, actions, isScreenLocked]);

  useHIDScanner({
      isEnabled: !showExpirationModal && !isScreenLocked && !state.status.includes('manual'),
      onScan: handleInbound
  });

  const onExpirationComplete = (mm?: number, yyyy?: number) => {
      if (pendingBarcodeForDate) {
          actions.handleExternalScan(pendingBarcodeForDate, mm, yyyy);
      }
      setShowExpirationModal(false);
      setPendingBarcodeForDate(null);
  };

  const rowData = useMemo(() => ({ 
      onSelect: actions.handleExternalScan, 
      activeBarcode: data.lastScan?.barcode,
      expectedItems: session.expectedItems
  }), [actions, data.lastScan, session.expectedItems]);

  const quickValues = [5, 10, 20];

  return (
    <div 
        className="fixed inset-0 z-[100] flex flex-col bg-black text-white font-mono select-none overflow-hidden"
        onPointerDown={resetAutoLock}
    >
      <header className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-2xl shrink-0 z-50">
          <div className="flex items-center gap-3">
              <button onClick={() => state.setStatus('confirming')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600">
                  <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button onClick={() => setIsScreenLocked(true)} className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl active:bg-amber-500 active:text-black transition-all">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Lock</span>
              </button>
          </div>
          <div className="flex flex-col items-center">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">NUEVA CARGA</span>
                <span className="text-xs font-black uppercase tracking-widest text-white italic truncate max-w-[120px]">{session.erpOrder}</span>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => setIsChangingLocation(true)} className="px-3 h-10 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" /> {state.currentLocation}
              </button>
          </div>
      </header>
      <div className="h-[38vh] shrink-0 relative">
          <ScannerHero 
                lastScan={data.lastScan}
                activeProduct={data.activeProduct}
                accumulatedQty={state.optimisticActiveQty}
                feedback={state.feedback}
                onRegisterPending={() => state.setStatus('product_form')}
                expectedItem={session.expectedItems?.find(i => i.barcode === data.lastScan?.barcode)}
                onDecrement={() => data.lastScan && actions.handleQuantityChange(data.lastScan.id, data.lastScan.quantity, -1)}
                onIncrement={() => data.lastScan && handleInbound(data.lastScan.barcode)}
          />
      </div>
      <div className="flex-1 min-h-0 bg-black flex flex-col relative">
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
                <VirtualList items={data.recentScans || []} itemHeight={78} renderRow={HistoryRow} rowData={rowData} className="bg-black/20" emptyState={<div className="flex flex-col items-center opacity-20 mt-12"><History className="w-16 h-16 mb-4" /><p className="text-[9px] font-black uppercase tracking-[0.5em]">Historial_Vacío</p></div>} />
          </div>
      </div>
      <div className="h-24 md:h-28 shrink-0 bg-slate-900 border-t border-white/5 flex items-center px-4 z-40 pb-6">
          <button onPointerDown={(e) => { e.preventDefault(); if(navigator.vibrate) navigator.vibrate(40); setIsTriggerActive(true); }} onPointerUp={() => setIsTriggerActive(false)} onPointerLeave={() => setIsTriggerActive(false)} className={`flex-1 h-14 md:h-16 rounded-2xl flex items-center justify-center gap-4 transition-all duration-75 active:scale-[0.98] border-b-4 ${isTriggerActive ? 'bg-blue-600 border-blue-800 translate-y-1 border-b-0 shadow-inner' : 'bg-white text-black border-slate-300 shadow-2xl'}`}>
              <Camera className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">{isTriggerActive ? 'LENS_OPEN' : 'GATILLO_OPTICO'}</span>
          </button>
      </div>
      {isTriggerActive && <div className="fixed inset-0 z-[250]"><CameraScanner onScan={(code) => { handleInbound(code); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} /></div>}
      {showExpirationModal && pendingBarcodeForDate && <ExpirationModal productName={pendingBarcodeForDate} onComplete={onExpirationComplete} />}
      {state.status === 'manual' && <NumericKeypad isOpen={true} title="SKU MANUAL" onClose={() => state.setStatus('idle')} value={state.manualInput} onInput={(c) => state.setManualInput(p => p + c)} onDelete={() => state.setManualInput(p => p.slice(0, -1))} onConfirm={() => { if (state.manualInput) handleInbound(state.manualInput); state.setManualInput(''); state.setStatus('idle'); }} />}
      {state.status === 'confirming' && (
          <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-slate-900 border-4 border-white/5 rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-2 bg-blue-600"></div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-4">¿Finalizar?</h2>
                  <p className="text-slate-500 mb-10 font-bold uppercase tracking-widest text-[9px]">El contenido se guardará en el historial local.</p>
                  <div className="grid grid-cols-1 gap-3">
                      <button onClick={onCloseSession} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Guardar y Cerrar</button>
                      <button onClick={() => state.setStatus('idle')} className="w-full bg-white/5 text-white/40 py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">Seguir Contando</button>
                      <button onClick={actions.handleDiscard} className="w-full mt-4 text-rose-500 font-black uppercase tracking-widest text-[8px] opacity-40 hover:opacity-100">Eliminar Sesión</button>
                  </div>
              </div>
          </div>
      )}
      {isChangingLocation && (
          <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95">
              <div className="bg-slate-900 border-2 border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mb-6">Establecer Ubicación</h3>
                  <input autoFocus className="w-full h-16 bg-black border-4 border-white/5 rounded-2xl text-center font-black text-2xl uppercase tracking-widest outline-none focus:border-blue-500 transition-all text-white" placeholder="PASILLO A..." defaultValue={state.currentLocation} onKeyDown={(e) => { if (e.key === 'Enter') { state.setCurrentLocation((e.target as HTMLInputElement).value.toUpperCase()); setIsChangingLocation(false); } }} />
                  <div className="mt-6 flex gap-3">
                      <button onClick={() => setIsChangingLocation(false)} className="flex-1 py-4 bg-white/5 text-white/40 font-black uppercase text-xs rounded-xl">Cerrar</button>
                      <button onClick={() => { const val = (document.querySelector('input[placeholder="PASILLO A..."]') as HTMLInputElement).value; state.setCurrentLocation(val.toUpperCase()); setIsChangingLocation(false); }} className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-xl shadow-lg">Confirmar</button>
                  </div>
              </div>
          </div>
      )}
      <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => { setIsScreenLocked(false); resetAutoLock(); }} />
    </div>
  );
};
