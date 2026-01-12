
import React, { useMemo, useState } from 'react';
import { List, Sparkles } from 'lucide-react';
import { CountingSession, ConsolidatedItem } from '../types';
import { useScanner } from '../hooks/useScanner';
import { VisionAuditModal } from './scanner/VisionAuditModal';
import { aggregateScans } from '../services/aggregator';
import * as settingsService from '../services/settings';

import { ScannerFeedbackLayer } from './scanner/ScannerFeedbackLayer';
import { ScannerHeader } from './scanner/ScannerHeader';
import { ScannerHero } from './scanner/ScannerHero';
import { ScannerControls } from './ScannerControls';
import { ScanItem } from './ScanItem';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';

interface ScannerProps {
  session: CountingSession;
  onCloseSession: () => void;
  onDiscardSession?: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ session, onCloseSession, onDiscardSession }) => {
  const { state, data, actions } = useScanner(session, onCloseSession, onDiscardSession);
  const settings = useMemo(() => settingsService.getSettings(), []);
  const [showRecentScansMobile, setShowRecentScansMobile] = useState(false);
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [consolidatedItems, setConsolidatedItems] = useState<ConsolidatedItem[]>([]);

  const handleOpenVision = async () => {
      const scans = await aggregateScans(data.recentScans || []);
      setConsolidatedItems(scans);
      setIsVisionOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900 overflow-hidden font-sans select-none page-transition">
      {/* CAPA DE FEEDBACK VISUAL MEJORADA */}
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
                <button 
                    onClick={handleOpenVision}
                    className="w-14 h-14 bg-white border-2 border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-xl active:scale-90 transition-all hover:bg-indigo-50"
                    title="Auditoría Visual"
                >
                    <Sparkles className="w-7 h-7" />
                </button>
            </div>

            <button 
                onClick={() => setShowRecentScansMobile(true)}
                className="lg:hidden absolute top-4 right-4 z-40 w-14 h-14 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl text-blue-600 flex items-center justify-center"
            >
                <List className="w-7 h-7" />
            </button>

            <div className="flex-1 flex flex-col justify-center items-center min-h-0">
                <ScannerHero 
                    lastScan={data.lastScan}
                    activeProduct={data.activeProduct}
                    accumulatedQty={state.optimisticActiveQty}
                    feedback={state.feedback}
                    onRegisterPending={() => state.setStatus('product_form')}
                />
            </div>

            <div className="w-full shrink-0">
                <ScannerControls 
                    session={session}
                    sessionStats={{ totalQty: state.optimisticTotalQty, uniqueSkus: state.optimisticUniqueSkus }}
                    multiplier={state.multiplier}
                    scansPerMinute={0}
                    showSpeedometer={settings.speedometerEnabled}
                    hasCameraSupport={true}
                    onCameraClick={() => state.setStatus('camera')}
                    onMultiplierClick={() => state.setMultiplier(m => m >= 99 ? 1 : m + 1)} 
                    onManualClick={() => state.setStatus('manual')}
                />
            </div>
        </div>

        <div className={`
            ${showRecentScansMobile ? 'flex fixed inset-0 z-[120]' : 'hidden lg:flex'} 
            lg:relative lg:col-span-4 bg-slate-50 border-l border-slate-200 flex-col overflow-hidden shadow-2xl
        `}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">
                    Items en Bulto
                </h3>
                <button onClick={() => setShowRecentScansMobile(false)} className="lg:hidden p-3 bg-slate-100 rounded-xl text-slate-500 font-black text-[10px] uppercase">Cerrar</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-24">
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

      {/* MODALES REFINADOS */}
      {state.status === 'manual' && (
          <NumericKeypad 
            isOpen={true} 
            title="Ingreso Manual de SKU" 
            onClose={() => state.setStatus('idle')}
            onInput={(c) => state.setManualInput(p => p + c)}
            onDelete={() => state.setManualInput(p => p.slice(0, -1))}
            onConfirm={() => {
                if (state.manualInput) actions.handleExternalScan(state.manualInput);
                state.setManualInput('');
                state.setStatus('idle');
            }}
          />
      )}

      {state.status === 'camera' && (
          <CameraScanner 
            onScan={(code) => { actions.handleExternalScan(code); state.setStatus('idle'); }} 
            onClose={() => state.setStatus('idle')} 
          />
      )}

      {state.status === 'confirming' && (
          <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl border-t-8 border-black">
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic mb-4">¿Finalizar?</h2>
                  <p className="text-slate-500 mb-10 font-bold uppercase tracking-widest text-[10px]">El contenido quedará guardado localmente.</p>
                  <div className="grid grid-cols-1 gap-4">
                      <button onClick={onCloseSession} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-blue-700">Guardar y Cerrar</button>
                      <button onClick={() => state.setStatus('idle')} className="w-full bg-slate-100 text-slate-600 py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">Seguir Contando</button>
                      <button onClick={actions.handleDiscard} className="w-full mt-4 text-rose-500 font-black uppercase tracking-widest text-[9px] hover:text-rose-700">Eliminar bulto por completo</button>
                  </div>
              </div>
          </div>
      )}

      <VisionAuditModal isOpen={isVisionOpen} onClose={() => setIsVisionOpen(false)} currentItems={consolidatedItems} />
    </div>
  );
};
