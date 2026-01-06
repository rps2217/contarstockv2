import React, { useMemo, useRef, useEffect, useState } from 'react';
import { X, ChevronLeft, Keyboard as KeyboardIcon, Hash, History as HistoryIcon, Trash2, Camera, List } from 'lucide-react';
import { CountingSession } from '../types';
import { ExpirationModal } from './ExpirationModal';
import { useScanner } from '../hooks/useScanner';
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
  const [showRecentScansMobile, setShowRecentScansMobile] = useState(false);

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
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900 overflow-hidden font-sans">
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
            {/* Botón flotante para ver historial en móvil */}
            <button 
                onClick={() => setShowRecentScansMobile(true)}
                className="lg:hidden absolute top-4 right-4 z-40 p-4 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm active:scale-90 transition-all text-slate-400"
            >
                <List className="w-6 h-6" />
            </button>

            <div className="flex-1 flex flex-col justify-center items-center min-h-0">
                <ScannerHero 
                    lastScan={data.lastScan}
                    activeProductStats={{
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
                    onMultiplierClick={() => state.setStatus('manual')} 
                    onManualClick={() => state.setStatus('manual')}
                />
            </div>
        </div>

        {/* Panel Lateral - Adaptado para Móvil como Overlay */}
        <div className={`
            ${showRecentScansMobile ? 'flex fixed inset-0 z-[120]' : 'hidden lg:flex'} 
            lg:relative lg:col-span-4 bg-white border-l border-slate-200 flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right-full duration-300
        `}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm">
                <h3 className="font-black text-indigo-600 text-[10px] uppercase tracking-[0.2em] flex items-center gap-3">
                    <HistoryIcon className="w-4 h-4" /> Secuencia de Entrada
                </h3>
                <button onClick={() => setShowRecentScansMobile(false)} className="lg:hidden p-2 text-slate-400"><X className="w-6 h-6"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-slate-50/30">
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
                {(!data.recentScans || data.recentScans.length === 0) && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                        <HistoryIcon className="w-12 h-12 mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Sin registros aún</p>
                    </div>
                )}
            </div>
            {showRecentScansMobile && (
                <div className="p-6 bg-white border-t border-slate-100">
                    <button 
                        onClick={() => setShowRecentScansMobile(false)}
                        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-xs"
                    >
                        Cerrar Historial
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Teclado Manual Optimizado */}
      {state.status === 'manual' && (
          <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 md:p-10 animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
                          <KeyboardIcon className="w-6 h-6 text-indigo-600" /> Registro Manual
                      </h3>
                      <button onClick={() => state.setStatus('idle')} className="p-3 bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-all"><X className="w-6 h-6"/></button>
                  </div>
                  
                  <form onSubmit={actions.handleManualSubmit} className="space-y-6">
                      <div className="grid grid-cols-3 gap-2">
                          {[1, 5, 10, 12, 24, 50].map(v => (
                              <button 
                                type="button"
                                key={v}
                                onClick={() => state.setMultiplier(v)}
                                className={`py-4 rounded-xl font-black border-2 transition-all text-xs ${state.multiplier === v ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                              >x{v}</button>
                          ))}
                      </div>
                      <input 
                          autoFocus
                          type="text"
                          inputMode="numeric"
                          value={state.manualInput}
                          onChange={(e) => state.setManualInput(e.target.value)}
                          placeholder="DIGITAR SKU"
                          className="w-full h-20 bg-slate-50 border-4 border-slate-200 rounded-[1.5rem] text-3xl font-black text-center outline-none focus:border-indigo-500 text-slate-950 tracking-tighter shadow-inner"
                      />
                      <button type="submit" className="w-full h-16 bg-slate-900 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs active:scale-95 transition-all">Registrar Ahora</button>
                  </form>
              </div>
          </div>
      )}

      {state.status === 'product_form' && (
          <ProductForm 
            isOpen={true} 
            onClose={() => state.setStatus('idle')} 
            initialData={state.pendingScanCode ? { barcode: state.pendingScanCode, name: state.pendingProductName, category: 'AUTO_REGISTRO' } : null}
            onSaveSuccess={() => state.setStatus('idle')}
          />
      )}

      {state.status === 'camera' && (
          <CameraScanner 
            onScan={(code) => { actions.handleExternalScan(code); state.setStatus('idle'); }} 
            onClose={() => state.setStatus('idle')} 
          />
      )}
      
      {state.status === 'confirming' && (
          <div className="fixed inset-0 bg-slate-950/80 z-[210] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
              <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl text-center max-w-sm border-2 border-white">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><X className="w-10 h-10" /></div>
                  <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter text-slate-900">Finalizar</h3>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-10 leading-relaxed">¿Desea cerrar la sesión activa y guardar el manifiesto?</p>
                  
                  <div className="flex flex-col gap-3">
                      <button onClick={onCloseSession} className="bg-blue-600 text-white h-16 rounded-2xl font-black shadow-xl uppercase text-xs tracking-[0.2em] active:scale-95 transition-all">SÍ, GUARDAR TODO</button>
                      <button onClick={actions.handleDiscard} className="bg-rose-50 text-rose-600 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">BORRAR SESIÓN</button>
                      <button onClick={() => state.setStatus('idle')} className="text-slate-400 font-black py-4 uppercase text-[10px] tracking-[0.4em] hover:text-indigo-600">CANCELAR</button>
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