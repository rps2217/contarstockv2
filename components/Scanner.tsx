
import React from 'react';
import { Pause, Package, Zap, Keyboard, AlertTriangle, Check, Volume2, Save, XCircle, X, RotateCcw, Camera } from 'lucide-react';
import { CountingSession } from '../types';
import { ExpirationModal } from './ExpirationModal';
import { useScanner } from '../hooks/useScanner';
import { ScanItem } from './ScanItem';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';

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

  // Determine Background Color based on Feedback State (Zen Mode Flash)
  const getBgClass = () => {
      if (state.feedback === 'success') {
          // If the scanned item is an incident, show Amber/Orange instead of Green
          if (data.lastScan?.isIncident) return 'bg-amber-600';
          return 'bg-emerald-600';
      }
      if (state.feedback === 'error') return 'bg-red-600';
      if (state.feedback === 'undo') return 'bg-purple-600';
      
      // Idle states
      if (data.lastScan?.isIncident) return 'bg-amber-700'; // Keep amber if looking at an incident
      return 'bg-slate-950'; // Default Zen Dark Mode
  };

  const isUnknown = data.activeProductStats.isUnknown;
  const isLastScanIncident = !!data.lastScan?.isIncident;

  const handleCloseMultiplier = () => {
      // Safety: If user leaves it at 0, default to 1 on close
      if (state.multiplier === 0) state.setMultiplier(1);
      state.setIsMultiplierOpen(false);
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col text-white overflow-hidden font-sans transition-colors duration-200 ${getBgClass()}`}>
      
      {/* --- HEADER (Minimalist) --- */}
      <header className="h-14 px-4 flex justify-between items-center z-20 shrink-0 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3 opacity-80">
             <div className="bg-white/10 p-1.5 rounded-lg"><Package className="w-4 h-4" /></div>
             <div className="font-mono font-bold text-sm tracking-widest">{session.erpOrder}</div>
        </div>
        <div className="flex items-center gap-2">
            {/* CAMERA BUTTON (EMERGENCY) */}
            <button 
                onClick={() => state.setIsCameraOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all backdrop-blur-md"
                title="Cámara (Emergencia)"
            >
                <Camera className="w-4 h-4" />
            </button>
            <button 
                onClick={() => state.setShowConfirmModal(true)} 
                className="bg-white/10 hover:bg-red-500/80 text-white/80 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all backdrop-blur-md"
            >
                <Pause className="w-3 h-3" /> <span className="hidden md:inline">Pausar</span>
            </button>
        </div>
      </header>

      {/* --- MAIN ZEN AREA --- */}
      <div className="flex-1 flex flex-col relative min-h-0">
        
        {/* CENTER CONTENT */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
            {state.feedback === 'undo' ? (
                 <div className="flex flex-col items-center animate-in zoom-in">
                    <RotateCcw className="w-32 h-32 text-white mb-4" />
                    <h2 className="text-4xl font-black uppercase tracking-widest">Deshecho</h2>
                    <p className="text-white/70 mt-2">El último registro ha sido eliminado.</p>
                 </div>
            ) : data.lastScan ? (
                <div className="animate-in zoom-in-95 duration-150 w-full max-w-2xl flex flex-col items-center">
                    {isUnknown ? (
                        /* UNKNOWN PRODUCT STATE */
                        <div className="bg-amber-500/90 text-black p-8 rounded-3xl shadow-2xl border-4 border-amber-300 w-full">
                            <div className="flex flex-col items-center gap-4 mb-6">
                                <AlertTriangle className="w-20 h-20 animate-pulse" />
                                <h2 className="text-3xl font-black uppercase tracking-tight">Producto Desconocido</h2>
                            </div>
                            <div className="font-mono text-3xl font-bold mb-8 bg-black/10 py-2 rounded-xl">{data.lastScan.barcode}</div>
                            <button 
                                onClick={actions.handleRegisterPending} 
                                className="w-full bg-black text-amber-500 hover:bg-slate-900 font-black text-xl py-5 rounded-2xl shadow-lg active:scale-95 transition-all"
                            >
                                REGISTRAR COMO PENDIENTE
                            </button>
                        </div>
                    ) : (
                        /* SUCCESS SCAN STATE */
                        <>
                            {/* Product Name */}
                            <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4 text-white drop-shadow-md break-words line-clamp-3">
                                {data.activeProductStats.name}
                            </h1>
                            
                            {/* Metadata Row: Barcode & Incident Toggle */}
                            <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
                                {/* Barcode Badge */}
                                <div className="bg-white/10 px-4 py-2 rounded-xl font-mono text-sm md:text-base text-white/80 border border-white/5">
                                    {data.lastScan.barcode}
                                </div>

                                {/* Incident Toggle Button */}
                                <button 
                                    onClick={(e) => actions.handleToggleIncident(e, data.lastScan!.id, isLastScanIncident)}
                                    className={`px-4 py-2 rounded-xl font-bold text-sm md:text-base flex items-center gap-2 transition-all active:scale-95 border border-white/10 shadow-lg ${
                                        isLastScanIncident 
                                        ? 'bg-white text-amber-700 shadow-amber-900/20' 
                                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                                    }`}
                                >
                                    <AlertTriangle className={`w-5 h-5 ${isLastScanIncident ? 'fill-amber-700' : ''}`} />
                                    {isLastScanIncident ? 'CON INCIDENCIA' : 'MARCAR FRC'}
                                </button>
                            </div>

                            {/* QUANTITY DISPLAY (HERO) */}
                            <div className="flex flex-col items-center">
                                <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/50 mb-1">Total Acumulado</div>
                                <div className="text-[7rem] md:text-[9rem] leading-none font-black tracking-tighter text-white drop-shadow-2xl">
                                    {data.activeProductStats.totalQty}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                /* IDLE / READY STATE */
                <div className="flex flex-col items-center opacity-20">
                    <Zap className="w-32 h-32 mb-6" />
                    <h2 className="text-4xl font-black tracking-widest uppercase">Listo</h2>
                    <p className="mt-2 text-sm font-mono">Esperando Escáner...</p>
                </div>
            )}
        </div>

        {/* --- FLOATING UNDO ACTION --- */}
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

        {/* --- FOOTER STATS & CONTROLS --- */}
        <div className="shrink-0 pb-safe-area px-4 pb-4 relative z-40">
            <div className="max-w-md mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex justify-between items-center shadow-lg">
                
                {/* Stats */}
                <div className="flex gap-6 px-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-white/40">Unidades</span>
                        <span className="text-xl font-bold tabular-nums">{data.sessionStats.totalQty}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-white/40">SKUs</span>
                        <span className="text-xl font-bold tabular-nums text-blue-400">{data.sessionStats.uniqueSkus}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => state.setIsMultiplierOpen(true)}
                        className={`h-12 px-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${state.multiplier > 1 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <span className="text-xs mr-1 opacity-60">x</span>{state.multiplier}
                    </button>
                    
                    <button 
                        onClick={() => state.setManualMode(true)}
                        className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
                    >
                        <Keyboard className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* CAMERA SCANNER MODAL */}
      {state.isCameraOpen && (
        <CameraScanner 
            onScan={(code) => actions.handleExternalScan(code)} 
            onClose={() => state.setIsCameraOpen(false)}
        />
      )}

      {/* MULTIPLIER KEYPAD MODAL */}
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
                        // If current is 0, replace it with the new digit. Otherwise append.
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

      {/* CONFIRM / EXIT MODAL */}
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

      {/* MANUAL ENTRY MODAL */}
      {state.manualMode && (
             <div className="absolute inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
                 <form onSubmit={actions.handleManualSubmit} className="w-full max-w-sm bg-slate-900 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                     <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><Keyboard className="w-6 h-6 text-blue-500" /> Ingreso Manual</h3>
                     <div className="relative">
                        <input 
                            id="manual-barcode-input" 
                            name="barcode" 
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
