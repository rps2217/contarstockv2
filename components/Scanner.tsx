import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Save, XCircle, Check, Keyboard, X, History as HistoryIcon } from 'lucide-react';
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

  const hasCameraSupport = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }, []);

  const handleCameraClick = useCallback(() => {
      if (!hasCameraSupport) {
          alert("Cámara no disponible.");
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
    <div className="fixed inset-0 z-50 flex flex-col text-slate-900 overflow-hidden font-sans bg-slate-50">
      
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
        
        <div className="lg:col-span-8 flex flex-col justify-center items-center relative p-4 md:p-10">
            
            <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-4xl">
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
                <div className="absolute bottom-28 md:bottom-36 flex justify-center z-30 animate-in slide-in-from-bottom-4 duration-300">
                    <button 
                        onClick={actions.handleUndoLastScan}
                        className="bg-white border-2 border-red-100 hover:bg-red-50 text-red-600 px-8 py-4 rounded-full shadow-xl flex items-center gap-3 font-black transition-all active:scale-95 group"
                    >
                        <RotateCcw className="w-5 h-5 transition-transform duration-500 group-hover:-rotate-180" />
                        <span>Deshacer Último</span>
                    </button>
                </div>
            )}

            <div className="w-full max-w-lg mt-auto">
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

        <div className="hidden lg:flex lg:col-span-4 bg-white border-l border-slate-200 flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-sm">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-3">
                    <HistoryIcon className="w-5 h-5 text-blue-600" /> Historial de Sesión
                </h3>
                <span className="text-xs bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-xl font-black">
                    {data.recentScans?.length || 0} ITEMS
                </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50/30">
                {data.recentScans?.map((scan, idx) => (
                    <ScanItem 
                        key={scan.id} 
                        scan={scan} 
                        productName={actions.getProductName(scan.barcode)} 
                        isLatest={idx === 0}
                        onDelete={actions.handleDeleteScan}
                        onQuantityChange={actions.handleQuantityChange}
                        onToggleIncident={actions.handleToggleIncident}
                    />
                ))}
                {(!data.recentScans || data.recentScans.length === 0) && (
                    <div className="text-center py-20 opacity-30">
                        <HistoryIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-sm font-bold uppercase tracking-widest">Sin registros recientes</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {state.isCameraOpen && <CameraScanner onScan={(code) => actions.handleExternalScan(code)} onClose={() => state.setIsCameraOpen(false)} />}

      {state.isMultiplierOpen && (
          <div className="absolute inset-0 z-[60] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-t-[2.5rem] shadow-2xl p-8 w-full animate-in slide-in-from-bottom-full duration-300 max-w-lg mx-auto lg:rounded-[2.5rem] lg:mb-10 lg:border lg:border-slate-200">
                  <div className="flex justify-between items-center mb-8 px-2">
                      <div className="flex flex-col">
                          <span className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-1">Multiplicador</span>
                          <span className="text-5xl font-black text-slate-900">x{state.multiplier}</span>
                      </div>
                      <button onClick={handleCloseMultiplier} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X className="w-7 h-7"/></button>
                  </div>
                  <NumericKeypad isOpen={true} embedded={true}
                    onInput={(val) => {
                        const newValStr = state.multiplier === 0 ? val : state.multiplier.toString() + val;
                        const newVal = parseInt(newValStr);
                        if (newVal < 9999) state.setMultiplier(newVal);
                    }}
                    onDelete={() => state.setMultiplier(Math.floor(state.multiplier / 10))}
                  />
                  <button onClick={handleCloseMultiplier} className="w-full mt-8 bg-blue-600 text-white font-black py-5 rounded-[1.5rem] text-xl shadow-lg shadow-blue-200 active:scale-95 transition-all">Confirmar Cantidad</button>
              </div>
          </div>
      )}

      {state.showConfirmModal && (
            <div className="absolute inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl text-center">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><Save className="w-10 h-10" /></div>
                    <h3 className="text-3xl font-black text-slate-900 mb-2">Finalizar Conteo</h3>
                    <p className="text-slate-500 text-base mb-10 font-medium px-4">¿Desea guardar los registros actuales y cerrar la sesión de trabajo?</p>
                    <div className="flex flex-col gap-4">
                        <button onClick={onCloseSession} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-all active:scale-95"><Check className="w-6 h-6" /> Guardar y Salir</button>
                        <button onClick={actions.handleDiscard} className="w-full bg-white border-2 border-red-100 text-red-600 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"><XCircle className="w-5 h-5" /> Descartar Datos</button>
                        <button onClick={() => state.setShowConfirmModal(false)} className="w-full text-slate-400 py-3 font-black uppercase tracking-widest text-xs mt-2">Continuar Operando</button>
                    </div>
                </div>
            </div>
      )}

      {state.manualMode && (
             <div className="absolute inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-200">
                 <form onSubmit={actions.handleManualSubmit} className="w-full max-w-md bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl">
                     <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4"><Keyboard className="w-8 h-8 text-blue-600" /> Ingreso Manual</h3>
                     <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mb-8 shadow-inner">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Código del SKU</label>
                        <input 
                            ref={manualInputRef} type="text" inputMode="numeric" pattern="[0-9]*" value={state.manualInput} 
                            onChange={(e) => state.setManualInput(e.target.value.replace(/[^0-9]/g, ''))} 
                            className="w-full bg-transparent border-none text-4xl font-black text-center text-slate-900 outline-none placeholder:text-slate-200" 
                            placeholder="00000000" autoFocus 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <button type="button" onClick={() => { state.setManualMode(false); state.setManualInput(''); }} className="py-5 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-colors uppercase tracking-widest text-xs">Cancelar</button>
                         <button type="submit" className="bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Registrar</button>
                     </div>
                 </form>
             </div>
      )}

      {state.showExpirationModal && <div className="contents"><ExpirationModal productName={state.pendingProductName} onComplete={actions.handleExpirationComplete} /></div>}
    </div>
  );
};