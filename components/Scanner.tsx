
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { X, List, History as HistoryIcon, Sparkles } from 'lucide-react';
import { CountingSession, ScanRecord, ConsolidatedItem } from '../types';
import { useScanner } from '../hooks/useScanner';
import { VisionAuditModal } from './scanner/VisionAuditModal';
import { aggregateScans } from '../services/aggregator';
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
  const [showRecentScansMobile, setShowRecentScansMobile] = useState(false);
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [consolidatedItems, setConsolidatedItems] = useState<ConsolidatedItem[]>([]);

  const handleOpenVision = async () => {
      const scans = await aggregateScans(data.recentScans || []);
      setConsolidatedItems(scans);
      setIsVisionOpen(true);
  };

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
            
            <div className="absolute top-4 left-4 z-40 flex flex-col gap-4">
                <button 
                    onClick={handleOpenVision}
                    className="w-16 h-16 bg-white border-2 border-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-xl active:scale-90 transition-all"
                >
                    <Sparkles className="w-8 h-8" />
                </button>
            </div>

            <button 
                onClick={() => setShowRecentScansMobile(true)}
                className="lg:hidden absolute top-4 right-4 z-40 p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl text-blue-600"
            >
                <List className="w-6 h-6" />
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
            lg:relative lg:col-span-4 bg-slate-50 border-l border-slate-200 flex-col overflow-hidden shadow-2xl
        `}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-3">
                    <HistoryIcon className="w-4 h-4 text-blue-600" /> Historial Local
                </h3>
                <button onClick={() => setShowRecentScansMobile(false)} className="lg:hidden p-2 text-slate-400 font-bold">CERRAR</button>
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
                    />
                ))}
            </div>
        </div>
      </div>

      <VisionAuditModal isOpen={isVisionOpen} onClose={() => setIsVisionOpen(false)} currentItems={consolidatedItems} />
    </div>
  );
};
