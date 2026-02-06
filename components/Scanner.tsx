
import React, { useMemo, useState, useCallback, memo } from 'react';
import { ChevronLeft, Camera, MoreVertical, Lock, History } from 'lucide-react';
import { CountingSession } from '../types';
import { useScanner } from '../hooks/useScanner';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { useAppStore } from '../store/useAppStore';
import { normalizeSku } from '../services/utils';
import { ScannerHero } from './scanner/ScannerHero';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';
import { ExpirationModal } from './ExpirationModal';
import { VirtualList } from './common/VirtualList';
import { getRowStyles, shouldPromptForBatch } from '../services/uiLogic';
import { ScannerToolsSheet } from './scanner/ScannerToolsSheet';
import { BarcodeLabelModal } from './common/BarcodeLabelModal';
import { LocationSelectorModal } from './common/LocationSelectorModal';
import { SoundFX } from '../services/audio';

const HistoryRow = memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { onSelect, activeBarcode, optimisticQty } = data;
    const isActive = activeBarcode === normalizeSku(item.barcode);
    const displayQty = isActive ? optimisticQty : item.totalQuantity;
    return (
        <div className="px-2 py-1 h-full">
            <button onClick={() => onSelect(item.barcode)} className={getRowStyles(displayQty, item.expectedQuantity, isActive)}>
                <div className="flex-1 min-w-0 pr-4">
                    <span className="text-[8px] font-black font-mono tracking-widest opacity-40 uppercase block mb-0.5">{item.barcode}</span>
                    <h3 className="font-black text-[12px] uppercase truncate leading-none text-white/90">{item.productName}</h3>
                    {item.location === 'GUÍA' && displayQty === 0 && <span className="text-[7px] bg-white/20 px-1.5 py-0.5 rounded font-black text-white/50 animate-pulse mt-1 inline-block">PENDIENTE</span>}
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black tabular-nums leading-none">{displayQty}{item.expectedQuantity > 0 && <span className="text-[10px] opacity-40 ml-1">/ {item.expectedQuantity}</span>}</div>
                </div>
            </button>
        </div>
    );
});

export const Scanner: React.FC<{ session: CountingSession, onCloseSession: () => void, onDiscardSession: () => void }> = ({ session, onCloseSession }) => {
  const { state, data, actions } = useScanner(session, onCloseSession);
  const { settings } = useAppStore(); 
  
  const [isTriggerActive, setIsTriggerActive] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);

  const handleInbound = useCallback((barcode: string) => {
      if (isScreenLocked) return;
      
      // SoC: Delegar decisión de modal al servicio uiLogic
      if (shouldPromptForBatch(barcode, data.recentScans || [], settings)) {
          setPendingBarcode(barcode);
          setShowExpirationModal(true);
          if (navigator.vibrate) navigator.vibrate(20);
      } else {
          actions.handleExternalScan(barcode, state.multiplier);
      }
  }, [isScreenLocked, data.recentScans, settings, state.multiplier, actions]);

  useHIDScanner({ isEnabled: !showExpirationModal && !isScreenLocked && state.status === 'idle', onScan: handleInbound });

  const rowData = useMemo(() => ({ onSelect: actions.selectItem, activeBarcode: state.activeBarcode, optimisticQty: state.optimisticActiveQty }), [actions.selectItem, state.activeBarcode, state.optimisticActiveQty]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white font-mono overflow-hidden">
      <header className="h-14 px-3 flex items-center justify-between border-b border-white/10 bg-slate-950 shrink-0 z-50">
          <button onClick={() => state.setStatus('confirming')} className="p-2.5 bg-white/5 rounded-xl active:bg-blue-600 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
          <div className="text-center"><span className="text-[7px] font-black text-white/30 block tracking-widest leading-none">ORDEN ERP</span><span className="text-[11px] font-black text-blue-400 truncate max-w-[140px] uppercase">{state.deducedErp || session.erpOrder}</span></div>
          <button onClick={() => setIsScreenLocked(true)} className="p-2.5 bg-white/5 rounded-xl active:bg-amber-500"><Lock className="w-5 h-5" /></button>
      </header>

      <div className="h-[42vh] shrink-0 border-b-4 border-black">
          <ScannerHero 
                lastScan={data.lastScan as any} 
                activeProduct={data.lastScan ? { name: data.lastScan.productName, barcode: data.lastScan.barcode } as any : undefined} 
                accumulatedQty={state.optimisticActiveQty} 
                feedback={state.feedback} 
                onRegisterPending={() => {}} 
                expectedItem={session.expectedItems?.find(i => normalizeSku(i.barcode) === state.activeBarcode)} 
                onDecrement={() => actions.handleExternalScan(state.activeBarcode!, -1)} 
                onIncrement={() => handleInbound(state.activeBarcode!)} 
                isDeducing={state.isDeducing} 
                aiSuggestion={state.aiLocationSuggestion} 
                onAcceptSuggestion={(loc) => { state.setCurrentLocation(loc); state.setAiLocationSuggestion(null); }} 
          />
      </div>

      <div className="flex-1 min-0 bg-black flex flex-col relative">
          <div className="p-2 bg-slate-900/40 grid grid-cols-4 gap-2 border-b border-white/5">
                <button onClick={() => state.setStatus('manual')} className="h-10 rounded-xl font-black text-[9px] bg-slate-800 border border-slate-700">MANUAL</button>
                {[5, 10, 20].map(v => (
                    <button key={v} onClick={() => state.setMultiplier(v)} className={`h-10 rounded-xl font-black text-xs border-2 transition-all ${state.multiplier === v ? 'bg-amber-500 border-amber-600 text-black shadow-lg scale-105' : 'bg-white/5 border-white/10 text-white/30'}`}>
                        +{v}
                    </button>
                ))}
          </div>
          <div className="flex-1 min-h-0">
                <VirtualList 
                    items={data.recentScans || []} 
                    itemHeight={70} 
                    renderRow={HistoryRow} 
                    rowData={rowData} 
                    emptyState={<div className="flex flex-col items-center opacity-10 mt-12"><History className="w-12 h-12 mb-3" /><p className="text-[8px] font-black uppercase tracking-[0.4em]">Sin movimientos</p></div>} 
                />
          </div>
      </div>

      <div className="h-20 shrink-0 bg-slate-950 border-t border-white/10 flex items-center px-4 pb-safe-area shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
          <button onPointerDown={() => setIsTriggerActive(true)} onPointerUp={() => setIsTriggerActive(false)} onPointerLeave={() => setIsTriggerActive(false)} className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-4 transition-all border-b-4 ${isTriggerActive ? 'bg-blue-600 border-blue-900 translate-y-1 border-b-0' : 'bg-white text-black border-slate-300'}`}>
              <Camera className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">{isTriggerActive ? 'LENS_ACTIVE' : 'GATILLO_OPTICO'}</span>
          </button>
      </div>

      {isTriggerActive && <div className="fixed inset-0 z-[250]"><CameraScanner onScan={(c) => { handleInbound(c); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} /></div>}
      
      {showExpirationModal && pendingBarcode && (
          <ExpirationModal 
            productName={pendingBarcode} 
            onComplete={(m, y, b) => { 
                if (m && y) actions.setRememberedDate({ mm: m, yyyy: y, batch: b || '' }); 
                actions.handleExternalScan(pendingBarcode, state.multiplier, m, y, b); 
                setShowExpirationModal(false); 
                setPendingBarcode(null);
            }} 
          />
      )}

      <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />

      {state.status === 'confirming' && (
          <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl">
              <div className="bg-slate-900 p-10 rounded-[3rem] w-full max-w-sm text-center border-4 border-white/5 shadow-2xl">
                  <h2 className="text-2xl font-black mb-10 italic uppercase tracking-tighter">Cerrar_Bulto</h2>
                  <button onClick={onCloseSession} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest mb-3 shadow-xl active:scale-95 transition-all">Guardar y Finalizar</button>
                  <button onClick={() => state.setStatus('idle')} className="w-full bg-white/5 text-white/40 py-5 rounded-2xl font-black uppercase tracking-widest active:bg-white/10 transition-all">Volver</button>
              </div>
          </div>
      )}
      
      {state.status === 'manual' && (
          <NumericKeypad 
            isOpen={true} 
            title="SKU MANUAL" 
            onClose={() => state.setStatus('idle')} 
            onInput={(c) => actions.handleExternalScan(c, state.multiplier)} 
            onDelete={() => {}} 
            onConfirm={() => state.setStatus('idle')} 
          />
      )}
    </div>
  );
};
