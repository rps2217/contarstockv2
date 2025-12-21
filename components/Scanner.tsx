
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Save, Keyboard, History as HistoryIcon, RotateCcw } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex flex-col text-slate-900 overflow-hidden bg-slate-50">
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
        <div className="lg:col-span-8 flex flex-col justify-center items-center relative p-4">
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
                    hasCameraSupport={true}
                    onCameraClick={() => state.setIsCameraOpen(true)}
                    onMultiplierClick={() => state.setIsMultiplierOpen(true)}
                    onManualClick={() => state.setManualMode(true)}
                />
            </div>
        </div>

        <div className="hidden lg:flex lg:col-span-4 bg-white border-l border-slate-200 flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-3">
                    <HistoryIcon className="w-5 h-5 text-blue-600" /> Historial de Bulto
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
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

      {state.isCameraOpen && <CameraScanner onScan={(code) => actions.handleExternalScan(code)} onClose={() => state.setIsCameraOpen(false)} />}
      
      {state.showConfirmModal && (
          <div className="absolute inset-0 bg-slate-900/70 z-[70] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center max-w-sm border border-slate-100 animate-in zoom-in-95">
                  <h3 className="text-2xl font-black mb-2">Pausa en Conteo</h3>
                  <p className="text-slate-400 text-sm mb-8 font-medium">¿Deseas finalizar y guardar los datos capturados hasta ahora?</p>
                  <div className="flex flex-col gap-3">
                      <button onClick={onCloseSession} className="bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95">Finalizar y Salir</button>
                      <button onClick={() => state.setShowConfirmModal(false)} className="text-slate-400 font-bold hover:text-slate-900 py-3 transition-colors">Volver a Escanear</button>
                  </div>
              </div>
          </div>
      )}

      {state.showExpirationModal && <ExpirationModal productName={state.pendingProductName} onComplete={actions.handleExpirationComplete} />}
    </div>
  );
};
