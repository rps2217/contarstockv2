import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Save, XCircle, Check, Keyboard, X, History as HistoryIcon, ArrowLeft } from 'lucide-react';
import { CountingSession } from '../types';
import { ExpirationModal } from './ExpirationModal';
import { useScanner } from '../hooks/useScanner';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import * as settingsService from '../services/settings';

// Sub-components
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
  const { 
      state, 
      data, 
      actions 
  } = useScanner(session, onCloseSession, onDiscardSession);

  const settings = useMemo(() => settingsService.getSettings(), []);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const [scansPerMinute, setScansPerMinute] = useState(0);
  const scanTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    if (settings.speedometerEnabled && data.lastScan) {
        const now = Date.now();
        scanTimestampsRef.current.push(now);
        const cutoff = now - 60000;
        const filtered = scanTimestampsRef.current.filter(t => t > cutoff);
        scanTimestampsRef.current = filtered;
        if (filtered.length !== scansPerMinute) {
            setScansPerMinute(filtered.length);
        }
    }
  }, [data.lastScan, settings.speedometerEnabled]);

  useEffect(() => {
      if (!settings.speedometerEnabled) return;
      const interval = setInterval(() => {
          const now = Date.now();
          const cutoff = now - 60000;
          const filtered = scanTimestampsRef.current.filter(t => t > cutoff);
          scanTimestampsRef.current = filtered;
          if (filtered.length !== scansPerMinute) {
              setScansPerMinute(filtered.length);
          }
      }, 5000);
      return () => clearInterval(interval);
  }, [settings.speedometerEnabled, scansPerMinute]);

  const hasCameraSupport = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
    const hasApi = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    return isSecure && hasApi;
  }, []);

  const handleCameraClick = useCallback(() => {
      if (!hasCameraSupport) {
          alert("⚠️ CÁMARA BLOQUEADA\n\nRequiere conexión segura (HTTPS).");
          return;
      }
      state.setIsCameraOpen(true);
  }, [hasCameraSupport, state.setIsCameraOpen]);

  const handleCloseMultiplier = () => {
      if (state.multiplier === 0) state.setMultiplier(1);
      state.setIsMultiplierOpen(false);
  };

  useEffect(() => {
      if (state.manualMode) {
          setTimeout(() => manualInputRef.current?.focus(), 100);
      }
  }, [state.manualMode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col text-slate-800 overflow-hidden font-sans bg-slate-100">
      
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

      <div className="flex-1 min-h-0 relative z-10 grid grid-cols-1 lg:grid-cols-12">
        
        <div className="lg:col-span-8 flex flex-col justify-center items-center relative p-6">
            
            <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-3xl">
                <ScannerHero 
                    lastScan={data.lastScan}
                    activeProductStats={{
                        ...data.activeProductStats,
                        totalQty: state.optimisticActiveQty 
                    }}
                    feedback={state.feedback}
                    onRegisterPending={actions.handleRegisterPending}
                    onToggleIncident={actions.handleToggleIncident}
                    expectedItem={data.expectedForActive}
                />
            </div>

            {state.lastScanId && !state.isMultiplierOpen && !state.manualMode && !state.isCameraOpen && (
                <div className="absolute bottom-24 lg:bottom-32 flex justify-center z-30 pointer-events-none animate-in slide-in-from-bottom-4 fade-in w-full">
                    <button 
                        onClick={actions.handleUndoLastScan}
                        className="pointer-events-auto bg-white border border-slate-200 hover:bg-red-50 text-red-600 px-6 py-3 rounded-full shadow-lg flex items-center gap-3 font-bold transition-all active:scale-95 group"
                    >
                        <RotateCcw className="w-5 h-5 transition-all duration-300 group-hover:-rotate-180" />
                        <span>Deshacer Último</span>
                    </button>
                </div>
            )}

            <div className="w-full max-w-md">
                <ScannerControls 
                    session={session}
                    sessionStats={{
                        totalQty: state.optimisticTotalQty, 
                        uniqueSkus: state.optimisticUniqueSkus 
                    }}
                    multiplier={state.multiplier}
                    scansPerMinute={scansPerMinute}
                    showSpeedometer={settings.speedometerEnabled}
                    hasCameraSupport={hasCameraSupport}
                    onCameraClick={handleCameraClick}
                    onMultiplierClick={() => state.setIsMultiplierOpen(true)}
                    onManualClick={() => state.setManualMode(true)}
                />
            </div>
        </div>

        <div className="hidden lg:flex lg:col-span-4 bg-white border-l border-slate-200 flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wider flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4" /> Historial de Conteo
                </h3>
                <span className="text-xs bg-white border border-slate-200 text-slate-400 px-2 py-1 rounded-lg font-mono">
                    {data.recentScans?.length || 0}
                </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar scroll-smooth bg-slate-50/50">
                {data.recentScans?.map((scan, idx) => {
                    const isLatest = idx === 0;
                    return (
                        <ScanItem 
                            key={scan.id} 
                            scan={scan} 
                            productName={actions.getProductName(scan.barcode)} 
                            isLatest={isLatest}
                            onDelete={actions.handleDeleteScan}
                            onQuantityChange={actions.handleQuantityChange}
                            onToggleIncident={actions.handleToggleIncident}
                        />
                    );
                })}
                {(!data.recentScans || data.recentScans.length === 0) && (
                    <div className="text-center py-12 opacity-30">
                        <p className="text-sm">Sin registros</p>
                    </div>
                )}
            </div>
        </div>

      </div>

      {state.isCameraOpen && (
        <CameraScanner 
            onScan={(code) => actions.handleExternalScan(code)} 
            onClose={() => state.setIsCameraOpen(false)}
        />
      )}

      {state.isMultiplierOpen && (
          <div className="absolute inset-0 z-[60] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl p-6 w-full animate-in slide-in-from-bottom-full max-w-lg mx-auto lg:rounded-3xl lg:border lg:mb-10">
                  <div className="flex justify-between items-center mb-6 px-2">
                      <div className="flex flex-col">
                          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Multiplicador</span>
                          <span className="text-4xl font-black text-slate-900">x{state.multiplier}</span>
                      </div>
                      <button onClick={handleCloseMultiplier} className="p-2 bg-slate-100 rounded-full text-slate-400"><X className="w-6 h-6"/></button>
                  </div>
                  <NumericKeypad 
                    isOpen={true} 
                    embedded={true}
                    onInput={(val) => {
                        const current = state.multiplier;
                        const newValStr = current === 0 ? val : current.toString() + val;
                        const newVal = parseInt(newValStr);
                        if (newVal < 9999) state.setMultiplier(newVal);
                    }}
                    onDelete={() => state.setMultiplier(Math.floor(state.multiplier / 10))}
                  />
                  <button onClick={handleCloseMultiplier} className="w-full mt-6 bg-blue-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-all">Confirmar Multiplicador</button>
              </div>
          </div>
      )}

      {state.showConfirmModal && (
            <div className="absolute inset-0 bg-slate-900/40 z-[70] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
                <div className="w-full max-w-sm bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><Save className="w-8 h-8" /></div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">¿Finalizar Sesión?</h3>
                    <p className="text-slate-500 text-sm mb-6">Guarde los datos locales antes de salir.</p>
                    <div className="grid grid-cols-1 gap-3">
                        <button onClick={onCloseSession} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"><Check className="w-5 h-5" /> Guardar y Salir</button>
                        <button onClick={actions.handleDiscard} className="w-full bg-white border border-red-200 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><XCircle className="w-5 h-5" /> Descartar Datos</button>
                        <button onClick={() => state.setShowConfirmModal(false)} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">Continuar</button>
                    </div>
                </div>
            </div>
      )}

      {state.manualMode && (
             <div className="absolute inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
                 <form onSubmit={actions.handleManualSubmit} className="w-full max-w-sm bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl">
                     <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3"><Keyboard className="w-6 h-6 text-blue-600" /> Ingreso Manual</h3>
                     <input 
                        ref={manualInputRef}
                        type="text" 
                        inputMode="numeric" 
                        pattern="[0-9]*" 
                        value={state.manualInput} 
                        onChange={(e) => state.setManualInput(e.target.value.replace(/[^0-9]/g, ''))} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-2xl font-bold text-center text-slate-900 focus:border-blue-500 outline-none mb-6 transition-all" 
                        placeholder="Código de Barras" 
                        autoFocus 
                        autoComplete="off" 
                     />
                     <div className="grid grid-cols-2 gap-4">
                         <button type="button" onClick={() => { state.setManualMode(false); state.setManualInput(''); }} className="py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors border border-transparent">Cancelar</button>
                         <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all shadow-md">Registrar</button>
                     </div>
                 </form>
             </div>
      )}

      {state.showExpirationModal && (
          <div className="contents">
            <ExpirationModal productName={state.pendingProductName} onComplete={actions.handleExpirationComplete} />
          </div>
      )}
    </div>
  );
};