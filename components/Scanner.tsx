
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { X, List, History as HistoryIcon } from 'lucide-react';
import { CountingSession } from '../types';
import { ExpirationModal } from './ExpirationModal';
import { useScanner } from '../hooks/useScanner';
import { CameraScanner } from './CameraScanner';
import { ProductForm } from './database/ProductForm';
import * as settingsService from '../services/settings';

// Atómicos
import { ScannerFeedbackLayer } from './scanner/ScannerFeedbackLayer';
import { ScannerHeader } from './scanner/ScannerHeader';
import { ScannerHero } from './scanner/ScannerHero';
import { ScannerControls } from './scanner/ScannerControls';
import { ScanItem } from './ScanItem';
import { LiveVoiceOrb } from './scanner/LiveVoiceOrb';
import { LiveVoiceAssistant } from '../services/liveVoiceService';

interface ScannerProps {
  session: CountingSession;
  onCloseSession: () => void;
  onDiscardSession?: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ session, onCloseSession, onDiscardSession }) => {
  const { state, data, actions } = useScanner(session, onCloseSession, onDiscardSession);
  const settings = useMemo(() => settingsService.getSettings(), []);
  const [showRecentScansMobile, setShowRecentScansMobile] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking'>('idle');

  // PERSISTENCIA DE VOZ: Usar ref para evitar recrear la conexión IA en cada escaneo
  const voiceAssistantRef = useRef<LiveVoiceAssistant | null>(null);

  useEffect(() => {
      // Inicializar asistente una sola vez
      voiceAssistantRef.current = new LiveVoiceAssistant(
          (delta) => {
              // El callback debe usar la versión más reciente de las acciones (vía refs si fuera necesario, o closure controlado)
              const lastScan = (window as any)._lastScan; // Hack controlado o ref
              if (lastScan) actions.handleQuantityChange(lastScan.id, lastScan.quantity, delta);
          },
          (s) => setVoiceStatus(s)
      );

      return () => {
          voiceAssistantRef.current?.stop();
      };
  }, []); // Sin dependencias para permanencia

  // Sincronizar el estado del último escaneo para el callback de voz sin disparar re-creación
  useEffect(() => {
      (window as any)._lastScan = data.lastScan;
  }, [data.lastScan]);

  const toggleVoice = () => {
      if (voiceStatus === 'idle') voiceAssistantRef.current?.start();
      else voiceAssistantRef.current?.stop();
  };

  const expectedForActive = useMemo(() => {
      if (!session.isVerifiedMode || !data.lastScan || !session.expectedItems) return null;
      return session.expectedItems.find(item => item.barcode === data.lastScan!.barcode) || null;
  }, [session.isVerifiedMode, data.lastScan, session.expectedItems]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900 overflow-hidden font-sans select-none">
      <ScannerFeedbackLayer feedback={state.feedback} />

      <ScannerHeader 
        erpOrder={session.erpOrder}
        scansPerMinute={0} 
        showSpeedometer={settings.speedometerEnabled}
        onPause={() => state.setStatus('confirming')}
        onUndo={actions.handleUndo}
        canUndo={!!data.lastScan || state.feedback === 'success'}
      />

      <div className="flex-1 min-h-0 relative z-10 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <div className="lg:col-span-8 flex flex-col relative p-4 h-full">
            <div className="absolute top-4 left-4 z-40">
                <LiveVoiceOrb status={voiceStatus} onClick={toggleVoice} />
            </div>

            <button 
                onClick={() => setShowRecentScansMobile(true)}
                className="lg:hidden absolute top-4 right-4 z-40 p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl active:scale-90 transition-all text-blue-600"
            >
                <List className="w-6 h-6" />
            </button>

            <div className="flex-1 flex flex-col justify-center items-center min-h-0 py-10">
                <ScannerHero 
                    lastScan={data.lastScan}
                    activeProductStats={data.activeProductStats}
                    feedback={state.feedback}
                    onRegisterPending={() => state.setStatus('product_form')}
                    onToggleIncident={actions.handleToggleIncident}
                    expectedItem={expectedForActive}
                    predictions={state.predictions}
                    onPredictionClick={actions.handleExternalScan}
                />
            </div>

            <div className="w-full max-w-lg mx-auto shrink-0 mt-auto pb-4">
                <ScannerControls 
                    session={session}
                    sessionStats={{ totalQty: state.optimisticTotalQty, uniqueSkus: state.optimisticUniqueSkus }}
                    multiplier={state.multiplier}
                    scansPerMinute={0}
                    showSpeedometer={settings.speedometerEnabled}
                    hasCameraSupport={true}
                    onCameraClick={() => state.setStatus('camera')}
                    onMultiplierClick={() => state.setStatus('manual')} 
                    onManualClick={() => state.setStatus('manual')}
                />
            </div>
        </div>

        <div className={`
            ${showRecentScansMobile ? 'flex fixed inset-0 z-[120]' : 'hidden lg:flex'} 
            lg:relative lg:col-span-4 bg-slate-50 border-l border-slate-200 flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right-full duration-300
        `}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-3">
                    <HistoryIcon className="w-4 h-4 text-blue-600" /> Historial de Entrada
                </h3>
                <button onClick={() => setShowRecentScansMobile(false)} className="lg:hidden p-2 text-slate-400"><X className="w-6 h-6"/></button>
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

      {state.status === 'manual' && (
          <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-md flex items-end md:items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-8 animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                          <HistoryIcon className="w-6 h-6 text-blue-600" /> Entrada Manual
                      </h3>
                      <button onClick={() => state.setStatus('idle')} className="p-2 bg-slate-100 rounded-full text-slate-400 active:scale-90 transition-all"><X className="w-6 h-6"/></button>
                  </div>
                  <form onSubmit={actions.handleManualSubmit} className="space-y-8">
                      <div className="grid grid-cols-3 gap-3">
                          {[1, 5, 10, 12, 24, 48].map(v => (
                              <button type="button" key={v} onClick={() => state.setMultiplier(v)} className={`py-4 rounded-2xl font-black border-2 transition-all text-xs ${state.multiplier === v ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>x{v}</button>
                          ))}
                      </div>
                      <input autoFocus type="text" inputMode="numeric" value={state.manualInput} onChange={(e) => state.setManualInput(e.target.value)} placeholder="DIGITE SKU" className="w-full h-24 bg-slate-50 border-4 border-slate-100 rounded-[2rem] text-4xl font-black text-center outline-none focus:border-blue-500 text-slate-900 shadow-inner tracking-widest placeholder:text-slate-200 transition-all" />
                      <button type="submit" className="w-full h-20 bg-slate-900 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-sm active:scale-[0.98] transition-all">Confirmar Registro</button>
                  </form>
              </div>
          </div>
      )}

      {state.status === 'product_form' && (
          <ProductForm 
            isOpen={true} 
            onClose={() => state.setStatus('idle')} 
            initialData={state.pendingScanCode ? { barcode: state.pendingScanCode, name: state.pendingProductName, category: 'AUTO' } : null}
            onSaveSuccess={() => state.setStatus('idle')}
          />
      )}

      {state.status === 'camera' && (
          <CameraScanner onScan={(code) => actions.handleExternalScan(code)} onClose={() => state.setStatus('idle')} />
      )}
      
      {state.status === 'confirming' && (
          <div className="fixed inset-0 bg-slate-950/90 z-[210] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl text-center max-w-sm border-2 border-white">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><X className="w-10 h-10" /></div>
                  <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter">¿Cerrar Sesión?</h3>
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-10 leading-relaxed">Los datos se guardarán localmente para sincronizar después.</p>
                  <div className="flex flex-col gap-3">
                      <button onClick={onCloseSession} className="bg-blue-600 text-white h-20 rounded-3xl font-black shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">SÍ, FINALIZAR</button>
                      <button onClick={actions.handleDiscard} className="bg-rose-50 text-rose-600 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest">BORRAR TODO</button>
                      <button onClick={() => state.setStatus('idle')} className="text-slate-400 font-black py-4 uppercase text-[10px] tracking-widest">CANCELAR</button>
                  </div>
              </div>
          </div>
      )}

      {state.status === 'expiring' && (
          <ExpirationModal productName={state.pendingProductName} onComplete={(mm, yyyy) => actions.handleExpirationComplete(mm, yyyy)} />
      )}
    </div>
  );
};
