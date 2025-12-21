
import React, { useMemo, useRef, useEffect, useState } from 'react';
/* Added History as HistoryIcon to resolve missing name error */
import { X, ChevronLeft, Keyboard as KeyboardIcon, Hash, History as HistoryIcon } from 'lucide-react';
import { CountingSession } from '../types';
import { ExpirationModal } from './ExpirationModal';
import { useScanner } from '../hooks/useScanner';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
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

  // Resolución de ítem esperado para modo verificado
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

        {/* Lado Derecho: Historial (Solo Desktop o Pantallas Anchas) */}
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

      {/* --- MODALES DE INTERACCIÓN --- */}

      {/* Entrada Manual de SKU */}
      {state.manualMode && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                          <KeyboardIcon className="w-6 h-6 text-blue-600" /> Ingreso Manual
                      </h3>
                      <button onClick={() => state.setManualMode(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={actions.handleManualSubmit}>
                      <input 
                          autoFocus
                          type="text"
                          inputMode="numeric"
                          value={state.manualInput}
                          onChange={(e) => state.setManualInput(e.target.value)}
                          placeholder="DIGITE CÓDIGO SKU"
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-3xl font-black text-center outline-none focus:border-blue-500 transition-all placeholder:text-slate-200 mb-6"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <button type="button" onClick={() => state.setManualMode(false)} className="bg-slate-100 text-slate-600 font-black py-4 rounded-xl uppercase tracking-widest text-xs">Cancelar</button>
                        <button type="submit" className="bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 uppercase tracking-widest text-xs">Registrar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Selector de Multiplicador */}
      {state.isMultiplierOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-10">
                  <div className="text-center mb-8">
                      <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Hash className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Multiplicador</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase mt-1">Afecta al siguiente escaneo</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-8">
                      {[1, 2, 5, 10, 12, 24].map(val => (
                          <button 
                            key={val}
                            onClick={() => { state.setMultiplier(val); state.setIsMultiplierOpen(false); }}
                            className={`py-5 rounded-2xl font-black text-xl border-2 transition-all active:scale-90 ${state.multiplier === val ? 'bg-amber-400 border-amber-500 text-amber-950 shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200'}`}
                          >
                              {val}
                          </button>
                      ))}
                  </div>

                  <button 
                    onClick={() => state.setIsMultiplierOpen(false)}
                    className="w-full bg-slate-900 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs shadow-xl"
                  >
                    Confirmar x{state.multiplier}
                  </button>
              </div>
          </div>
      )}

      {state.isCameraOpen && <CameraScanner onScan={(code) => actions.handleExternalScan(code)} onClose={() => state.setIsCameraOpen(false)} />}
      
      {state.showConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/70 z-[110] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-sm border border-slate-100 animate-in zoom-in-95">
                  <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">Pausa en Conteo</h3>
                  <p className="text-slate-400 text-sm mb-8 font-medium">¿Deseas finalizar la sesión actual o continuar escaneando?</p>
                  <div className="flex flex-col gap-3">
                      <button onClick={onCloseSession} className="bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95 uppercase text-xs tracking-widest">Finalizar y Salir</button>
                      <button onClick={() => state.setShowConfirmModal(false)} className="text-slate-400 font-bold hover:text-slate-900 py-3 transition-colors uppercase text-[10px] tracking-[0.2em]">Volver al Escáner</button>
                  </div>
              </div>
          </div>
      )}

      {state.showExpirationModal && <ExpirationModal productName={state.pendingProductName} onComplete={actions.handleExpirationComplete} />}
    </div>
  );
};
