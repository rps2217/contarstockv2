
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { X, ChevronLeft, Keyboard as KeyboardIcon, Hash, History as HistoryIcon, Trash2 } from 'lucide-react';
import { CountingSession } from '../types';
import { ExpirationModal } from './ExpirationModal';
import { useScanner } from '../hooks/useScanner';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { ProductForm } from './database/ProductForm';
import * as settingsService from '../services/settings';

// Sub-componentes modularizados
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
        const filtered = scanTimestampsRef.current.filter(t => t > cutoff);
        scanTimestampsRef.current = filtered;
        setScansPerMinute(filtered.length);
    }
  }, [data.lastScan, settings.speedometerEnabled]);

  const expectedForActive = useMemo(() => {
      if (!session.isVerifiedMode || !data.lastScan || !session.expectedItems) return null;
      return session.expectedItems.find(item => item.barcode === data.lastScan!.barcode) || null;
  }, [session.isVerifiedMode, data.lastScan, session.expectedItems]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col text-slate-900 overflow-hidden bg-slate-50 font-sans selection:bg-blue-100">
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
        onPause={() => state.setShowConfirmModal(true)}
      />

      <div className="flex-1 min-h-0 relative z-10 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Lado Izquierdo: Visualización y Controles Principales */}
        <div className="lg:col-span-8 flex flex-col relative p-4 h-full">
            <div className="flex-1 flex flex-col justify-center items-center min-h-0">
                <ScannerHero 
                    lastScan={data.lastScan}
                    activeProductStats={{
                        ...data.activeProductStats,
                        totalQty: state.optimisticActiveQty 
                    }}
                    feedback={state.feedback}
                    onRegisterPending={actions.handleRegisterPending}
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
                    onCameraClick={() => state.setIsCameraOpen(true)}
                    onMultiplierClick={() => state.setIsMultiplierOpen(true)}
                    onManualClick={() => state.setManualMode(true)}
                />
            </div>
        </div>

        {/* Lado Derecho: Historial */}
        <div className="hidden lg:flex lg:col-span-4 bg-white border-l border-slate-200 flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-3">
                    <HistoryIcon className="w-4 h-4 text-blue-600" /> Registro Reciente
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

      {/* --- MODALES --- */}

      {state.isProductFormOpen && (
          <ProductForm 
            isOpen={state.isProductFormOpen} 
            onClose={() => state.setIsProductFormOpen(false)} 
            initialData={state.pendingScanCode ? { barcode: state.pendingScanCode, name: '', category: '' } : null}
            onSaveSuccess={() => {
                state.setIsProductFormOpen(false);
                // Una vez registrado, procedemos con el flujo normal de vencimiento
                state.setShowExpirationModal(true);
            }}
          />
      )}

      {state.manualMode && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
                          <KeyboardIcon className="w-6 h-6 text-blue-600" /> Ingreso Manual
                      </h3>
                      <button onClick={() => state.setManualMode(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-6 h-6"/></button>
                  </div>
                  <form onSubmit={actions.handleManualSubmit} className="space-y-6">
                      <input 
                          autoFocus
                          type="text"
                          inputMode="numeric"
                          value={state.manualInput}
                          onChange={(e) => state.setManualInput(e.target.value)}
                          placeholder="DIGITE SKU"
                          className="w-full h-20 bg-slate-50 border-2 border-slate-200 rounded-3xl text-3xl font-black text-center outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-200 text-slate-900 tracking-wider"
                      />
                      <button type="submit" className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 uppercase tracking-widest text-sm active:scale-95 transition-all">
                          Registrar Item
                      </button>
                  </form>
              </div>
          </div>
      )}

      {state.isMultiplierOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-10">
                  <div className="text-center mb-8">
                      <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Hash className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Multiplicador</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-8">
                      {[1, 2, 5, 10, 12, 24].map(val => (
                          <button 
                            key={val}
                            onClick={() => { state.setMultiplier(val); state.setIsMultiplierOpen(false); }}
                            className={`h-16 rounded-2xl font-black text-xl border-2 transition-all active:scale-90 ${state.multiplier === val ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200'}`}
                          >
                              {val}
                          </button>
                      ))}
                  </div>

                  <button onClick={() => state.setIsMultiplierOpen(false)} className="w-full bg-slate-900 text-white font-black h-14 rounded-xl uppercase tracking-widest text-xs">Cerrar</button>
              </div>
          </div>
      )}

      {state.isCameraOpen && <CameraScanner onScan={(code) => actions.handleExternalScan(code)} onClose={() => state.setIsCameraOpen(false)} />}
      
      {state.showConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/70 z-[110] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-sm border border-slate-100 animate-in zoom-in-95">
                  <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter text-slate-900">Pausa en Conteo</h3>
                  <p className="text-slate-500 text-xs font-medium mb-8 leading-relaxed">¿Deseas finalizar la sesión actual o descartar todo lo escaneado?</p>
                  
                  <div className="flex flex-col gap-3">
                      <button 
                        onClick={onCloseSession} 
                        className="bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest transition-all active:scale-95"
                      >
                        Finalizar y Salir
                      </button>
                      
                      <button 
                        onClick={actions.handleDiscard} 
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Descartar Conteo
                      </button>

                      <button 
                        onClick={() => state.setShowConfirmModal(false)} 
                        className="text-slate-400 font-bold py-4 uppercase text-[10px] tracking-[0.2em] mt-2 hover:text-slate-600 transition-colors"
                      >
                        Volver al Escáner
                      </button>
                  </div>
              </div>
          </div>
      )}

      {state.showExpirationModal && <ExpirationModal productName={state.pendingProductName} onComplete={actions.handleExpirationComplete} />}
    </div>
  );
};
