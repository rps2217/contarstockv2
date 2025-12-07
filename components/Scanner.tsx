
import React from 'react';
import { Pause, Package, Zap, Keyboard, AlertTriangle, Check, Volume2, Save, XCircle, X } from 'lucide-react';
import { CountingSession } from '../types';
import { ExpirationModal } from './ExpirationModal';
import { useScanner } from '../hooks/useScanner';
import { ScanItem } from './ScanItem';
import { NumericKeypad } from './NumericKeypad';

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-hidden font-sans">
      <div className={`fixed inset-0 pointer-events-none z-[100] transition-colors duration-200 ${state.feedback === 'success' ? 'bg-green-500/25' : state.feedback === 'error' ? 'bg-red-500/25' : 'bg-transparent'}`} />

      {/* HEADER */}
      <header className="h-16 px-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-20 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
             <div className="bg-blue-600/20 text-blue-400 p-2 rounded-lg border border-blue-600/30"><Package className="w-5 h-5" /></div>
             <div><div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Orden ERP</div><div className="font-mono font-bold text-lg leading-none">{session.erpOrder}</div></div>
        </div>
        <button 
            onClick={() => state.setShowConfirmModal(true)} 
            className="bg-slate-800 hover:bg-red-900/30 text-slate-300 hover:text-red-400 px-3 py-1.5 rounded border border-slate-700 hover:border-red-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
        >
            <Pause className="w-3 h-3" /> Terminar
        </button>
      </header>

      {/* STATS BAR + MULTIPLIER BUTTON */}
      <div className="grid grid-cols-3 divide-x divide-slate-800 bg-slate-900/50 border-b border-slate-800 shrink-0">
          <div className="p-2 text-center flex flex-col justify-center items-center">
              <div className="text-[9px] uppercase text-slate-500 font-bold tracking-widest mb-1">Unidades</div>
              <div className="text-2xl font-bold text-white tracking-tighter leading-none">{data.sessionStats.totalQty}</div>
          </div>
          <div className="p-2 text-center flex flex-col justify-center items-center">
              <div className="text-[9px] uppercase text-slate-500 font-bold tracking-widest mb-1">SKUs</div>
              <div className="text-2xl font-bold text-blue-400 tracking-tighter leading-none">{data.sessionStats.uniqueSkus}</div>
          </div>
          
          {/* MULTIPLIER TOGGLE */}
          <button 
            onClick={() => state.setIsMultiplierOpen(true)}
            className={`p-2 flex flex-col justify-center items-center active:bg-slate-800 transition-colors ${state.multiplier > 1 ? 'bg-blue-900/30' : ''}`}
          >
              <div className="text-[9px] uppercase text-slate-500 font-bold tracking-widest mb-1">Cant/Scan</div>
              <div className={`text-2xl font-bold tracking-tighter leading-none ${state.multiplier > 1 ? 'text-yellow-400' : 'text-slate-600'}`}>
                  x{state.multiplier}
              </div>
          </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 relative flex flex-col items-center justify-start pt-6 pb-2 min-h-0">
        <div className="w-full max-w-md px-6 z-10 text-center mb-4 relative shrink-0">
            <div className="py-4">
                {data.lastScan ? (
                    <div className="animate-in zoom-in-95 duration-200">
                        {data.activeProductStats.isUnknown ? (
                            <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl mb-4">
                                <div className="text-amber-500 font-bold text-lg flex items-center justify-center gap-2 mb-2"><AlertTriangle className="w-6 h-6" /> Producto Desconocido</div>
                                <div className="font-mono text-xl text-slate-300 mb-4">{data.lastScan.barcode}</div>
                                <button onClick={actions.handleRegisterPending} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-lg active:scale-95 transition-all">Registrar como PENDIENTE</button>
                            </div>
                        ) : (
                            <>
                                <div className="inline-block bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 border border-green-500/30">Escaneo Correcto</div>
                                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2 line-clamp-2 break-words">{data.activeProductStats.name}</h1>
                                <div className="font-mono text-xl text-slate-400 mb-4">{data.lastScan.barcode}</div>
                                <div className="flex flex-col items-center justify-center">
                                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Acumulado este item</span>
                                    <div className="text-5xl font-black text-blue-500 tracking-tighter mt-1">{data.activeProductStats.totalQty}</div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="opacity-50 flex flex-col items-center py-6">
                        <Zap className="w-16 h-16 text-slate-600 mb-4 animate-pulse" />
                        <h2 className="text-2xl font-bold text-slate-500">LISTO PARA ESCANEAR</h2>
                        <p className="text-sm text-slate-600 mt-2">Use el lector físico en cualquier momento</p>
                    </div>
                )}
            </div>
        </div>

        {/* RECENT LIST */}
        <div className="w-full max-w-md px-4 mt-auto flex-1 overflow-y-auto no-scrollbar pb-16 relative z-30 pointer-events-auto">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3 pl-1 sticky top-0 bg-slate-950/95 py-2 z-10 flex justify-between items-center backdrop-blur-sm">
                <span>Actividad Reciente</span><Volume2 className="w-3 h-3 text-slate-600" />
            </div>
            <div className="space-y-4">
                {data.recentScans?.map((scan, i) => (
                    <ScanItem 
                        key={scan.id} 
                        scan={scan} 
                        productName={actions.getProductName(scan.barcode)} 
                        isLatest={i === 0} 
                        onDelete={actions.handleDeleteScan} 
                        onQuantityChange={actions.handleQuantityChange}
                        onToggleIncident={actions.handleToggleIncident}
                    />
                ))}
            </div>
        </div>
      </div>

      {/* MULTIPLIER KEYPAD MODAL */}
      {state.isMultiplierOpen && (
          <div className="absolute inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl p-4 w-full animate-in slide-in-from-bottom-full">
                  <div className="flex justify-between items-center mb-4 px-2">
                      <div className="flex flex-col">
                          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Multiplicador de Escaneo</span>
                          <span className="text-3xl font-black text-white">x{state.multiplier}</span>
                      </div>
                      <button onClick={() => state.setIsMultiplierOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400"><X className="w-6 h-6"/></button>
                  </div>
                  <NumericKeypad 
                    isOpen={true} 
                    embedded={true}
                    onInput={(val) => {
                        const newVal = parseInt(state.multiplier.toString() + val);
                        if (newVal < 9999) state.setMultiplier(newVal);
                    }}
                    onDelete={() => state.setMultiplier(Math.floor(state.multiplier / 10) || 1)}
                  />
                  <button onClick={() => state.setIsMultiplierOpen(false)} className="w-full mt-4 bg-blue-600 text-white font-bold py-4 rounded-xl text-lg">Confirmar (x{state.multiplier})</button>
              </div>
          </div>
      )}

      {/* EXISTING MODALS... */}
      {state.showConfirmModal && (
            <div className="absolute inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
                <div className="w-full max-w-sm bg-slate-900 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"><Save className="w-8 h-8" /></div>
                    <h3 className="text-2xl font-bold text-white mb-2">¿Finalizar Sesión?</h3>
                    <div className="grid grid-cols-1 gap-3 mt-6">
                        <button onClick={onCloseSession} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"><Check className="w-5 h-5" /> Guardar y Finalizar</button>
                        <button onClick={actions.handleDiscard} className="w-full bg-red-950/30 hover:bg-red-900/50 text-red-500 border border-red-900/50 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><XCircle className="w-5 h-5" /> Descartar</button>
                        <button onClick={() => state.setShowConfirmModal(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold mt-2">Cancelar</button>
                    </div>
                </div>
            </div>
      )}

      {state.manualMode && (
             <div className="absolute inset-0 bg-slate-950/90 z-30 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
                 <form onSubmit={actions.handleManualSubmit} className="w-full max-w-sm bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl">
                     <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Keyboard className="w-5 h-5" /> Ingreso Manual</h3>
                     <div className="relative">
                        <input id="manual-barcode-input" name="barcode" type="text" inputMode="numeric" pattern="[0-9]*" value={state.manualInput} onChange={(e) => state.setManualInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xl font-mono text-white focus:border-blue-500 outline-none mb-4" placeholder="Escriba el código..." autoFocus autoComplete="off" />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                         <button type="button" onClick={() => { state.setManualMode(false); state.setManualInput(''); }} className="py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">Cancelar</button>
                         <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors">Registrar</button>
                     </div>
                 </form>
             </div>
      )}

      {state.showExpirationModal && (
          <div className="contents">
            <ExpirationModal productName={state.pendingProductName} onComplete={actions.handleExpirationComplete} />
          </div>
      )}

      {!state.showConfirmModal && !state.showExpirationModal && !state.isMultiplierOpen && (
        <button onClick={() => state.setManualMode(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-slate-800 border border-slate-700 text-white rounded-full shadow-lg shadow-black/50 flex items-center justify-center z-40 hover:bg-slate-700 active:scale-95 transition-all md:hidden"><Keyboard className="w-6 h-6" /></button>
      )}
    </div>
  );
};
