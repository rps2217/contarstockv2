
import React, { useMemo, useState } from 'react';
import { List, MapPin } from 'lucide-react';
import { CountingSession } from '../types';
import { useScanner } from '../hooks/useScanner';
import * as settingsService from '../services/settings';

import { ScannerFeedbackLayer } from './scanner/ScannerFeedbackLayer';
import { ScannerHeader } from './scanner/ScannerHeader';
import { ScannerHero } from './scanner/ScannerHero';
import { ScannerControls } from './scanner/ScannerControls';
import { ScanItem } from './ScanItem';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { ScreenLockOverlay } from './common/ScreenLockOverlay';

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app-main text-app-text overflow-hidden font-sans select-none page-transition">
      <ScannerFeedbackLayer feedback={state.feedback} />

      <ScannerHeader 
        erpOrder={session.erpOrder}
        location={state.currentLocation}
        onLocationClick={() => setIsChangingLocation(true)}
        onPause={() => state.setStatus('confirming')}
        onUndo={actions.handleUndo}
        onLock={() => setIsScreenLocked(true)}
        canUndo={!!data.lastScan || state.feedback === 'success'}
      />

      <div className="flex-1 min-h-0 relative z-10 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <div className="lg:col-span-8 flex flex-col relative p-4 h-full">
            
            <button 
                onClick={() => setShowRecentScansMobile(true)}
                className="lg:hidden absolute top-4 right-4 z-40 w-14 h-14 bg-app-surface/80 backdrop-blur-md rounded-app border border-app-border shadow-xl text-app-accent flex items-center justify-center"
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
                    onMultiplierClick={(val) => state.setMultiplier(val)} 
                    onManualClick={() => state.setStatus('manual')}
                />
            </div>
        </div>

        <div className={`
            ${showRecentScansMobile ? 'flex fixed inset-0 z-[120]' : 'hidden lg:flex'} 
            lg:relative lg:col-span-4 bg-app-surface border-l border-app-border flex-col overflow-hidden shadow-2xl
        `}>
            <div className="p-6 border-b border-app-border flex items-center justify-between bg-app-card">
                <h3 className="font-black text-app-text text-xs uppercase tracking-widest">
                    Items en Bulto
                </h3>
                <button onClick={() => setShowRecentScansMobile(false)} className="lg:hidden p-3 bg-app-main rounded-app text-app-muted font-black text-[10px] uppercase">Cerrar</button>
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

        {/* MODALES */}
        {isChangingLocation && (
            <div className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-app-surface rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border-4 border-app-border">
                    <div className="flex items-center gap-3 mb-6">
                        <MapPin className="text-app-accent w-6 h-6" />
                        <h3 className="text-xl font-black uppercase tracking-tight text-app-text">Set Ubicación</h3>
                    </div>
                    <input 
                        autoFocus
                        className="w-full h-16 bg-app-main border-4 border-app-border rounded-app text-center font-black text-2xl uppercase tracking-widest outline-none focus:border-app-accent transition-all text-app-text"
                        placeholder="PASILLO A..."
                        defaultValue={state.currentLocation}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                state.setCurrentLocation((e.target as HTMLInputElement).value.toUpperCase());
                                setIsChangingLocation(false);
                            }
                        }}
                    />
                    <div className="mt-6 flex gap-3">
                        <button onClick={() => setIsChangingLocation(false)} className="flex-1 py-4 bg-app-main text-app-muted font-black uppercase text-xs rounded-app border border-app-border">Cancelar</button>
                        <button onClick={() => {
                            const val = (document.querySelector('input[placeholder="PASILLO A..."]') as HTMLInputElement).value;
                            state.setCurrentLocation(val.toUpperCase());
                            setIsChangingLocation(false);
                        }} className="flex-1 py-4 bg-app-accent text-white font-black uppercase text-xs rounded-app shadow-lg">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

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
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-app-card rounded-[3rem] p-10 w-full max-sm text-center shadow-2xl border-t-8 border-app-accent">
                    <h2 className="text-3xl font-black text-app-text uppercase tracking-tighter italic mb-4">¿Finalizar?</h2>
                    <p className="text-app-muted mb-10 font-bold uppercase tracking-widest text-[10px]">El contenido quedará guardado localmente.</p>
                    <div className="grid grid-cols-1 gap-4">
                        <button onClick={onCloseSession} className="w-full bg-app-accent text-white py-5 rounded-app font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Guardar y Cerrar</button>
                        <button onClick={() => state.setStatus('idle')} className="w-full bg-app-main text-app-text border-2 border-app-border py-5 rounded-app font-black uppercase tracking-widest active:scale-95 transition-all">Seguir Contando</button>
                        <button onClick={actions.handleDiscard} className="w-full mt-4 text-app-danger font-black uppercase tracking-widest text-[9px] hover:text-white">Eliminar bulto por completo</button>
                    </div>
                </div>
            </div>
        )}

        {/* OVERLAY DE BLOQUEO DE PANTALLA */}
        <ScreenLockOverlay 
            isLocked={isScreenLocked} 
            onUnlock={() => setIsScreenLocked(false)} 
        />
      </div>
    </div>
  );
};
