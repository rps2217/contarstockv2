
import React, { useMemo, useState, useCallback } from 'react';
import { List, MapPin, Keyboard, ChevronLeft, Package, Clock, Camera } from 'lucide-react';
import { CountingSession } from '../types';
import { useScanner } from '../hooks/useScanner';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as settingsService from '../services/settings';

import { ScannerHero } from './scanner/ScannerHero';
import { ScanItem } from './ScanItem';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';
import { ExpirationModal } from './ExpirationModal';

interface ScannerProps {
  session: CountingSession;
  onCloseSession: () => void;
  onDiscardSession?: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ session, onCloseSession, onDiscardSession }) => {
  const { state, data, actions } = useScanner(session, onCloseSession, onDiscardSession);
  const settings = useMemo(() => settingsService.getSettings(), []);
  
  const [showRecentScansMobile, setShowRecentScansMobile] = useState(false);
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [pendingBarcodeForDate, setPendingBarcodeForDate] = useState<string | null>(null);

  // Obtener todos los barcodes ya registrados en esta sesión para saber si pedir fecha
  const existingBarcodesInSession = useLiveQuery(
    async () => {
        const scans = await db.scans.where('sessionId').equals(session.id).toArray();
        return new Set(scans.map(s => s.barcode));
    },
    [session.id, data.lastScan] // Se refresca cuando cambia el último scan
  );

  // Interceptor de escaneo central (Cámara, Manual y HID)
  const handleScanWithDateCheck = useCallback((barcode: string) => {
      if (isScreenLocked) return;

      const hasDate = existingBarcodesInSession?.has(barcode);
      
      if (!hasDate) {
          // Si es el primer pick del SKU en este bulto, pedimos fecha
          setPendingBarcodeForDate(barcode);
          setShowExpirationModal(true);
      } else {
          // Si ya tiene fecha registrada en este bulto, flujo ráfaga (Martillo)
          actions.handleExternalScan(barcode);
      }
  }, [existingBarcodesInSession, actions, isScreenLocked]);

  // Soporte para Pistolas Láser Externas
  useHIDScanner({
      isEnabled: !showExpirationModal && !isScreenLocked && state.status === 'idle',
      onScan: handleScanWithDateCheck
  });

  const onExpirationComplete = (mm?: number, yyyy?: number) => {
      if (pendingBarcodeForDate) {
          actions.handleExternalScan(pendingBarcodeForDate, mm, yyyy);
      }
      setShowExpirationModal(false);
      setPendingBarcodeForDate(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white overflow-hidden font-mono select-none">
      
      {/* 1. CABECERA TÉCNICA (HUD Estilo Martillo) */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900/80 shrink-0 z-20">
          <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20"><Package className="w-4 h-4 text-white" /></div>
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white leading-none uppercase tracking-tighter italic">{session.erpOrder}</span>
                  <span className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.2em]">{session.logisticsLabel}</span>
              </div>
          </div>
          
          <div className="flex items-center gap-2">
              <button 
                  onClick={() => setIsChangingLocation(true)}
                  className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-[8px] font-black uppercase tracking-widest flex items-center gap-2 active:bg-white/10"
              >
                  <MapPin className="w-3 h-3 text-blue-500" /> {state.currentLocation}
              </button>
              <button onClick={() => setIsScreenLocked(true)} className="p-2 bg-white/5 rounded-lg text-slate-500 active:text-blue-500 transition-colors">
                  <List className="w-5 h-5" />
              </button>
          </div>
      </header>

      {/* 2. ÁREA HUD PRINCIPAL (Cuerpo Martillo) */}
      <div className="flex-1 relative z-10 overflow-hidden flex flex-col">
          <ScannerHero 
                lastScan={data.lastScan}
                activeProduct={data.activeProduct}
                accumulatedQty={state.optimisticActiveQty}
                feedback={state.feedback}
                onRegisterPending={() => state.setStatus('product_form')}
                expectedItem={session.expectedItems?.find(i => i.barcode === data.lastScan?.barcode)}
                onDecrement={() => data.lastScan && actions.handleQuantityChange(data.lastScan.id, data.lastScan.quantity, -1)}
                onIncrement={() => data.lastScan && handleScanWithDateCheck(data.lastScan.barcode)}
          />

          {/* BARRA DE ACCIÓN INFERIOR */}
          <div className="p-3 bg-slate-900/95 border-t border-white/5 grid grid-cols-4 gap-2 shrink-0 pb-safe">
                <button 
                    onClick={() => state.setStatus('manual')}
                    className="h-12 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 active:bg-blue-600 transition-colors"
                >
                    <Keyboard className="w-4 h-4" />
                    <span className="text-[7px] font-black uppercase tracking-widest">Manual</span>
                </button>
                <button 
                    onClick={() => setShowRecentScansMobile(true)}
                    className="h-12 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 active:bg-blue-600 transition-colors"
                >
                    <Clock className="w-4 h-4" />
                    <span className="text-[7px] font-black uppercase tracking-widest">Cola</span>
                </button>
                <button 
                    onClick={() => state.setStatus('camera')}
                    className="h-12 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 active:bg-blue-600 transition-colors"
                >
                    <Camera className="w-4 h-4" />
                    <span className="text-[7px] font-black uppercase tracking-widest">Lente</span>
                </button>
                <button 
                    onClick={() => state.setStatus('confirming')}
                    className="h-12 bg-blue-600 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-xl"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-[7px] font-black uppercase tracking-widest">Cerrar</span>
                </button>
          </div>
      </div>

      {/* 3. MODALES Y OVERLAYS */}
      
      {/* Panel Lateral de Recientes */}
      {showRecentScansMobile && (
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md animate-in slide-in-from-right duration-300">
              <div className="flex flex-col h-full max-w-md ml-auto bg-slate-900 border-l border-white/10 shadow-2xl">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950">
                      <div>
                        <h3 className="font-black text-xs uppercase tracking-[0.2em]">Contenido del Bulto</h3>
                        <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Historial de capturas locales</p>
                      </div>
                      <button onClick={() => setShowRecentScansMobile(false)} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase border border-white/5">Cerrar</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-32">
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
      )}

      {/* Selector de Fecha Obligatorio */}
      {showExpirationModal && pendingBarcodeForDate && (
          <ExpirationModal 
            productName={pendingBarcodeForDate} 
            onComplete={onExpirationComplete} 
          />
      )}

      {state.status === 'manual' && (
          <NumericKeypad 
              isOpen={true} 
              title="SKU MANUAL" 
              onClose={() => state.setStatus('idle')}
              onInput={(c) => state.setManualInput(p => p + c)}
              onDelete={() => state.setManualInput(p => p.slice(0, -1))}
              onConfirm={() => {
                  if (state.manualInput) handleScanWithDateCheck(state.manualInput);
                  state.setManualInput('');
                  state.setStatus('idle');
              }}
          />
      )}

      {state.status === 'camera' && (
          <CameraScanner 
              onScan={(code) => { handleScanWithDateCheck(code); state.setStatus('idle'); }} 
              onClose={() => state.setStatus('idle')} 
              isTriggered={true}
          />
      )}

      {state.status === 'confirming' && (
          <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-slate-900 border-4 border-white/5 rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-2 bg-blue-600"></div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-4">¿Finalizar?</h2>
                  <p className="text-slate-500 mb-10 font-bold uppercase tracking-widest text-[9px]">El contenido se guardará en el historial local.</p>
                  <div className="grid grid-cols-1 gap-3">
                      <button onClick={onCloseSession} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Guardar y Cerrar</button>
                      <button onClick={() => state.setStatus('idle')} className="w-full bg-white/5 text-white/40 py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">Seguir Contando</button>
                      <button onClick={actions.handleDiscard} className="w-full mt-4 text-rose-500 font-black uppercase tracking-widest text-[8px] opacity-40 hover:opacity-100 transition-opacity">Eliminar Sesión</button>
                  </div>
              </div>
          </div>
      )}

      {isChangingLocation && (
          <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95">
              <div className="bg-slate-900 border-2 border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mb-6">Set Ubicación</h3>
                  <input 
                      autoFocus
                      className="w-full h-16 bg-black border-4 border-white/5 rounded-2xl text-center font-black text-2xl uppercase tracking-widest outline-none focus:border-blue-500 transition-all text-white"
                      placeholder="BODEGA_A..."
                      defaultValue={state.currentLocation}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              state.setCurrentLocation((e.target as HTMLInputElement).value.toUpperCase());
                              setIsChangingLocation(false);
                          }
                      }}
                  />
                  <div className="mt-6 flex gap-3">
                      <button onClick={() => setIsChangingLocation(false)} className="flex-1 py-4 bg-white/5 text-white/40 font-black uppercase text-xs rounded-xl">Cerrar</button>
                      <button onClick={() => {
                          const val = (document.querySelector('input[placeholder="BODEGA_A..."]') as HTMLInputElement).value;
                          state.setCurrentLocation(val.toUpperCase());
                          setIsChangingLocation(false);
                      }} className="flex-1 py-4 bg-blue-600 text-white font-black uppercase text-xs rounded-xl shadow-lg">Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      <ScreenLockOverlay isLocked={isScreenLocked} onUnlock={() => setIsScreenLocked(false)} />
    </div>
  );
};
