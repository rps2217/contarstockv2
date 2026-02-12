
import React, { useState } from 'react';
import { ChevronLeft, Lock } from 'lucide-react';
import { CountingSession } from '../types';
import { useScanner } from '../hooks/useScanner';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { normalizeSku } from '../services/utils';
import { ScannerHero } from './scanner/ScannerHero';
import { ScannerFooter } from './scanner/ScannerFooter';
import { ScannerHistoryList } from './scanner/ScannerHistoryList';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';
import { ExpirationModal } from './ExpirationModal';

export const Scanner: React.FC<{ session: CountingSession, onCloseSession: () => void }> = ({ session, onCloseSession }) => {
  const { state, data, actions } = useScanner(session, onCloseSession);
  const [isTriggerActive, setIsTriggerActive] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);

  // Gatillo de Hardware
  useHIDScanner({ 
      isEnabled: !isScreenLocked && state.status !== 'expiring', 
      onScan: (barcode) => actions.handleExternalScan(barcode, state.multiplier) 
  });

  const handleManualConfirm = (sku: string) => {
      actions.handleExternalScan(sku, state.multiplier);
      actions.setStatus('idle');
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white font-mono overflow-hidden">
      
      <header className="h-14 px-3 flex items-center justify-between border-b border-white/10 bg-slate-950 shrink-0 z-50">
          <button onClick={() => actions.setStatus('confirming')} className="p-2.5 bg-white/5 rounded-xl active:bg-blue-600 transition-all"><ChevronLeft className="w-6 h-6" /></button>
          <div className="text-center">
              <span className="text-[7px] font-black text-white/30 block tracking-widest leading-none">POSICIÓN</span>
              <span className="text-[11px] font-black text-blue-400 uppercase">{state.currentLocation}</span>
          </div>
          <button onClick={() => setIsScreenLocked(true)} className="p-2.5 bg-white/5 rounded-xl active:bg-amber-500"><Lock className="w-5 h-5" /></button>
      </header>

      <div className="h-[38vh] shrink-0 border-b-4 border-black">
          <ScannerHero 
                lastScan={state.activeBarcode ? { barcode: state.activeBarcode } as any : undefined} 
                activeProduct={state.activeProduct || undefined} 
                accumulatedQty={state.optimisticActiveQty} 
                feedback={state.feedback} 
                onRegisterPending={() => {}} 
                expectedItem={session.expectedItems?.find(i => normalizeSku(i.barcode) === state.activeBarcode)} 
                onDecrement={() => actions.handleExternalScan(state.activeBarcode!, -1)} 
                onIncrement={() => actions.handleExternalScan(state.activeBarcode!, 1)} 
          />
      </div>

      <ScannerHistoryList 
            items={data.history} 
            activeBarcode={state.activeBarcode} 
            optimisticQty={state.optimisticActiveQty} 
            onSelect={actions.selectItem} 
      />

      <ScannerFooter 
            multiplier={state.multiplier}
            unitsPerBox={state.activeProduct?.unitsPerBox}
            onMultiplierChange={actions.setMultiplier}
            onOpenManual={() => actions.setStatus('manual')}
            onTriggerCamera={() => setIsTriggerActive(true)}
      />

      {isTriggerActive && (
          <div className="fixed inset-0 z-[250]">
              <CameraScanner onScan={(c) => { actions.handleExternalScan(c, state.multiplier); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
          </div>
      )}
      
      {state.status === 'expiring' && state.activeBarcode && (
          <ExpirationModal productName={state.activeProduct?.name || state.activeBarcode} onComplete={(m, y, b) => actions.handlePharmaComplete(m, y, b)} />
      )}

      <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />

      {state.status === 'confirming' && (
          <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-200">
              <div className="bg-slate-900 p-10 rounded-[3rem] w-full max-w-sm text-center border-4 border-white/5 shadow-2xl">
                  <h2 className="text-2xl font-black mb-10 italic uppercase tracking-tighter">Finalizar_Bulto</h2>
                  <button onClick={onCloseSession} className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest mb-3 shadow-xl active:scale-95 transition-all">Guardar y Salir</button>
                  <button onClick={() => actions.setStatus('idle')} className="w-full bg-white/5 text-white/40 py-5 rounded-2xl font-black uppercase tracking-widest active:bg-white/10">Volver</button>
              </div>
          </div>
      )}
      
      {state.status === 'manual' && (
          <NumericKeypad 
            isOpen={true} 
            title="EAN / SKU MANUAL" 
            onClose={() => actions.setStatus('idle')} 
            onConfirm={handleManualConfirm} 
          />
      )}
    </div>
  );
};
