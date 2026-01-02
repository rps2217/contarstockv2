
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { X, ChevronLeft, Keyboard as KeyboardIcon, Hash, History as HistoryIcon, Trash2, Camera } from 'lucide-react';
import { CountingSession } from '../types';
import { ExpirationModal } from './ExpirationModal';
import { useScanner } from '../hooks/useScanner';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { ProductForm } from './database/ProductForm';
import * as settingsService from '../services/settings';

import { ScannerFeedbackLayer } from './scanner/ScannerFeedbackLayer';
import { ScannerHeader } from './scanner/ScannerHeader';
import { ScannerHero } from './scanner/ScannerHero';
import { ScannerControls } from './scanner/ScannerControls';
import { ScanItem } from './ScanItem';

interface ScannerProps {
  session: CountingSession;
  onCloseSession: () => void;
  onDiscardSession?: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ session, onCloseSession, onDiscardSession }) => {
  const { state, data, actions } = useScanner(session, onCloseSession, onDiscardSession);
  const settings = useMemo(() => settingsService.getSettings(), []);
  
  const [scansPerMinute, setScansPerMinute] = useState(0);
  const scanTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    if (settings.speedometerEnabled && data.lastScan) {
        const now = Date.now();
        scanTimestampsRef.current.push(now);
        const cutoff = now - 60000;
        scanTimestampsRef.current = scanTimestampsRef.current.filter(t => t > cutoff);
        setScansPerMinute(scanTimestampsRef.current.length);
    }
  }, [data.lastScan, settings.speedometerEnabled]);

  const expectedForActive = useMemo(() => {
      if (!session.isVerifiedMode || !data.lastScan || !session.expectedItems) return null;
      return session.expectedItems.find(item => item.barcode === data.lastScan!.barcode) || null;
  }, [session.isVerifiedMode, data.lastScan, session.expectedItems]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#020617] text-slate-100 overflow-hidden font-sans">
      <ScannerFeedbackLayer 
        feedback={state.feedback} 
        isIncident={!!data.lastScan?.isIncident}
        isWindowFocused={state.isWindowFocused}
        isIdle={state.isIdle}
      />

      <ScannerHeader 
        erpOrder={session.erpOrder}
        scansPerMinute={scansPerMinute}
        showSpeedometer={settings.speedometerEnabled}
        onPause={() => state.setStatus('confirming')}
      />

      <div className="flex-1 min-h-0 relative z-10 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <div className="lg:col-span-8 flex flex-col relative p-4 h-full">
            <div className="flex-1 flex flex-col justify-center items-center min-h-0">
                <ScannerHero 
                    lastScan={data.lastScan}
                    activeProductStats={{
                        // Fix: data.data.activeProductStats -> data.activeProductStats
                        ...data.activeProductStats,
                        totalQty: state.optimisticActiveQty 
                    }}
                    feedback={state.feedback}
                    onRegisterPending={() => state.setStatus('product_form')}
                    onToggleIncident={actions.handleToggleIncident}
                    expectedItem={expectedForActive}
                />
            </div>

            <div className="w-full max-w-lg mx-auto shrink-0 mt-auto pb-4">
                <ScannerControls 
                    session={session}
                    sessionStats={{
                        totalQty: state.optimisticTotalQty, 
                        uniqueSkus: state.optimisticUniqueSkus 
                    }}
                    multiplier={state.multiplier}
                    scansPerMinute={scansPerMinute}
                    showSpeedometer={settings.speedometerEnabled}
                    hasCameraSupport={true}
                    onCameraClick={() => state.setStatus('camera')}
                    onMultiplierClick={() => state.setStatus('manual')} // Multiplicador usa modal manual o keypad
                    onManualClick={() => state.setStatus('manual')}
                />
            </div>
        </div>

        <div className="hidden lg:flex lg:col-span-4 bg-white/5 border-l border-white/10 flex-col overflow-hidden backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="font-black text-blue-400 text-xs uppercase tracking-[0.2em] flex items-center gap-3">
                    <HistoryIcon className="w-4 h-4" /> Live Feed
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {data.recentScans?.map((scan, idx) => (
                    <ScanItem 
                        key={scan.id} 
                        scan={scan} 
                        productName={scan.barcode} 
                        isLatest={idx === 0}
                        onDelete={actions.handleDeleteScan}
                        onQuantityChange={actions.handleQuantityChange}
                        onToggleIncident={actions.handleToggleIncident}
                    />
                ))}
            </div>
        </div>
      </div>

      {/* --- RENDERIZADO DE MODALES BASADO EN FSM --- */}

      {state.status === 'product_form' && (
          <ProductForm 
            isOpen={true} 
            onClose={() => state.setStatus('idle')} 
            initialData={state.pendingScanCode ? { barcode: state.pendingScanCode, name: '', category: '' } : null}
            onSaveSuccess={() => state.setStatus('expiring')}
          />
      )}

      {state.status === 'manual' && (
          <div className="fixed inset-0 z-[100] bg-[#020617]/90 backdrop-blur-xl flex items-end md:items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
                          <KeyboardIcon className="w-6 h-6 text-indigo-600" /> Entrada Manual
                      </h3>
                      <button onClick={() => state.setStatus('idle')} className="p-2 bg-slate-100 rounded-full text-slate-500"><X className="w-6 h-6"/></button>
                  </div>
                  
                  {/* Selector de Multiplicador Integrado */}
                  <div className="grid grid-cols-3 gap-2 mb-8">
                      {[1, 2, 5, 10, 12, 24].map(v => (
                          <button 
                            key={v}
                            onClick={() => state.setMultiplier(v)}
                            className={`py-3 rounded-xl font-black border-2 transition-all ${state.multiplier === v ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-slate-100 text-slate-400'}`}
                          >x{v}</button>
                      ))}
                  </div>

                  <form onSubmit={actions.handleManualSubmit} className="space-y-6">
                      <input 
                          autoFocus
                          type="text"
                          inputMode="numeric"
                          value={state.manualInput}
                          onChange={(e) => state.setManualInput(e.target.value)}
                          placeholder="DIGITAR SKU"
                          className="w-full h-24 bg-slate-50 border-4 border-slate-100 rounded-[2rem] text-4xl font-black text-center outline-none focus:border-indigo-500 text-slate-900 tracking-tighter"
                      />
                      <button type="submit" className="w-full h-16 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 uppercase tracking-widest text-xs active:scale-95 transition-all">Procesar Registro</button>
                  </form>
              </div>
          </div>
      )}

      {state.status === 'camera' && (
          <CameraScanner 
            // Fix: actions.handleExternalScan is mapped to the processScan callback in hooks/useScanner.ts
            onScan={(code) => { actions.handleExternalScan(code); state.setStatus('idle'); }} 
            onClose={() => state.setStatus('idle')} 
          />
      )}
      
      {state.status === 'confirming' && (
          <div className="fixed inset-0 bg-[#020617]/95 z-[110] flex items-center justify-center p-6 backdrop-blur-2xl animate-in fade-in">
              <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center max-w-sm border border-white/10">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><X className="w-10 h-10" /></div>
                  <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter text-slate-900">¿Cerrar Sesión?</h3>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-10 leading-relaxed">Sus datos están seguros en la base local.</p>
                  
                  <div className="flex flex-col gap-4">
                      <button onClick={onCloseSession} className="bg-indigo-600 text-white h-16 rounded-2xl font-black shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">Guardar y Finalizar</button>
                      <button onClick={actions.handleDiscard} className="bg-rose-50 text-rose-600 h-16 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">Eliminar Todo</button>
                      <button onClick={() => state.setStatus('idle')} className="text-slate-400 font-black py-4 uppercase text-[10px] tracking-[0.3em] hover:text-indigo-600">Volver</button>
                  </div>
              </div>
          </div>
      )}

      {state.status === 'expiring' && (
          <ExpirationModal 
            productName={state.pendingProductName} 
            onComplete={(mm, yyyy) => { actions.handleExpirationComplete(mm, yyyy); state.setStatus('idle'); }} 
          />
      )}
    </div>
  );
};
