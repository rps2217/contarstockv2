
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { RotateCcw, Save, XCircle, Check, Keyboard, X } from 'lucide-react';
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

  // --- PERFORMANCE TRACKING (SPEEDOMETER) ---
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

  useEffect(() => {
      if (!settings.speedometerEnabled) return;
      const interval = setInterval(() => {
          const now = Date.now();
          const cutoff = now - 60000;
          const countBefore = scanTimestampsRef.current.length;
          scanTimestampsRef.current = scanTimestampsRef.current.filter(t => t > cutoff);
          if (scanTimestampsRef.current.length !== countBefore) {
              setScansPerMinute(scanTimestampsRef.current.length);
          }
      }, 5000);
      return () => clearInterval(interval);
  }, [settings.speedometerEnabled]);

  // SECURITY CHECK
  const hasCameraSupport = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
    const hasApi = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    return isSecure && hasApi;
  }, []);

  const handleCameraClick = () => {
      if (!hasCameraSupport) {
          alert("⚠️ CÁMARA BLOQUEADA POR EL NAVEGADOR\n\nCausa: Estás accediendo por una conexión no segura (HTTP).\n\nSolución:\n1. Usa 'localhost' si estás en el PC.\n2. Configura HTTPS para acceso móvil.\n3. O habilita las flags de 'Insecure origins' en chrome://flags.");
          return;
      }
      state.setIsCameraOpen(true);
  };

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
    <div className="fixed inset-0 z-50 flex flex-col text-white overflow-hidden font-sans">
      
      {/* 1. VISUAL FEEDBACK LAYER */}
      <ScannerFeedbackLayer 
        feedback={state.feedback} 
        isIncident={!!data.lastScan?.isIncident} 
      />

      {/* 2. HEADER */}
      <ScannerHeader 
        erpOrder={session.erpOrder}
        scansPerMinute={scansPerMinute}
        showSpeedometer={settings.speedometerEnabled}
        onPause={() => state.setShowConfirmModal(true)}
      />

      {/* 3. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative min-h-0 z-10">
        
        {/* CENTER DISPLAY */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ScannerHero 
                lastScan={data.lastScan}
                activeProductStats={data.activeProductStats}
                feedback={state.feedback}
                onRegisterPending={actions.handleRegisterPending}
                onToggleIncident={actions.handleToggleIncident}
            />
        </div>

        {/* FLOATING UNDO ACTION */}
        {state.lastScanId && !state.isMultiplierOpen && !state.manualMode && !state.isCameraOpen && (
            <div className="absolute bottom-24 left-0 right-0 flex justify-center z-30 pointer-events-none animate-in slide-in-from-bottom-4 fade-in">
                <button 
                    onClick={actions.handleUndoLastScan}
                    className="pointer-events-auto bg-slate-800/90 backdrop-blur-md border border-slate-700 hover:bg-red-900/90 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold transition-all active:scale-95 group"
                >
                    <RotateCcw className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:-rotate-180 transition-all duration-300" />
                    <span>Deshacer Último</span>
                </button>
            </div>
        )}

        {/* 4. FOOTER CONTROLS */}
        <ScannerControls 
            sessionStats={data.sessionStats}
            multiplier={state.multiplier}
            scansPerMinute={scansPerMinute}
            showSpeedometer={settings.speedometerEnabled}
            hasCameraSupport={hasCameraSupport}
            onCameraClick={handleCameraClick}
            onMultiplierClick={() => state.setIsMultiplierOpen(true)}
            onManualClick={() => state.setManualMode(true)}
        />
      </div>

      {/* --- MODALS & OVERLAYS --- */}
      
      {state.isCameraOpen && (
        <CameraScanner 
            onScan={(code) => actions.handleExternalScan(code)} 
            onClose={() => state.setIsCameraOpen(false)}
        />
      )}

      {state.isMultiplierOpen && (
          <div className="absolute inset-0 z-[60] flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl p-4 w-full animate-in slide-in-from-bottom-full">
                  <div className="flex justify-between items-center mb-4 px-2">
                      <div className="flex flex-col">
                          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Multiplicador de Escaneo</span>
                          <span className="text-4xl font-black text-white">x{state.multiplier}</span>
                      </div>
                      <button onClick={handleCloseMultiplier} className="p-2 bg-slate-800 rounded-full text-slate-400"><X className="w-6 h-6"/></button>
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
                  <button onClick={handleCloseMultiplier} className="w-full mt-4 bg-blue-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-blue-900/50">Confirmar</button>
              </div>
          </div>
      )}

      {state.showConfirmModal && (
            <div className="absolute inset-0 bg-black/90 z-[70] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-sm bg-slate-900 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"><Save className="w-8 h-8" /></div>
                    <h3 className="text-2xl font-bold text-white mb-2">¿Finalizar Sesión?</h3>
                    <div className="grid grid-cols-1 gap-3 mt-6">
                        <button onClick={onCloseSession} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"><Check className="w-5 h-5" /> Guardar y Salir</button>
                        <button onClick={actions.handleDiscard} className="w-full bg-red-950/30 hover:bg-red-900/50 text-red-500 border border-red-900/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><XCircle className="w-5 h-5" /> Descartar Datos</button>
                        <button onClick={() => state.setShowConfirmModal(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold mt-2">Continuar Contando</button>
                    </div>
                </div>
            </div>
      )}

      {state.manualMode && (
             <div className="absolute inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
                 <form onSubmit={actions.handleManualSubmit} className="w-full max-w-sm bg-slate-900 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                     <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><Keyboard className="w-6 h-6 text-blue-500" /> Ingreso Manual</h3>
                     <div className="relative">
                        <input 
                            ref={manualInputRef}
                            type="text" 
                            inputMode="numeric" 
                            pattern="[0-9]*" 
                            value={state.manualInput} 
                            onChange={(e) => state.setManualInput(e.target.value.replace(/[^0-9]/g, ''))} 
                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-5 text-2xl font-mono text-center text-white focus:border-blue-500 outline-none mb-6 tracking-widest placeholder:tracking-normal" 
                            placeholder="Escanee o Digite" 
                            autoFocus 
                            autoComplete="off" 
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <button type="button" onClick={() => { state.setManualMode(false); state.setManualInput(''); }} className="py-4 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">Cancelar</button>
                         <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/50">Registrar</button>
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
