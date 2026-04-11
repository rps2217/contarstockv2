
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Box, Trash2, Camera, Loader2, Plus, CornerDownLeft, Search, CheckCircle2, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useReceptionLogic } from './hooks/useReceptionLogic';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import { SoundFX } from '../../services/audio';
import { CameraScanner } from '../../components/CameraScanner';
import { format } from 'date-fns';

const ReceptionItemRow = React.memo(({ item, onDelete }: { item: any; onDelete: (id: string) => void }) => {
  const isSynced = !!item.lastSyncTimestamp;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
      isSynced ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-blue-500/5 border-blue-500/20'
    }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${
        isSynced ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/20 text-blue-500 border-blue-500/20'
      }`}>
        {item.labelPhoto ? (
          <img 
            src={item.labelPhoto} 
            alt="Etiqueta" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Box className="w-6 h-6" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-black uppercase truncate ${isSynced ? 'text-emerald-400' : 'text-white'}`}>
            {item.logisticsLabel}
          </h3>
          {isSynced && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-slate-500 text-[10px] font-bold uppercase">
            {format(item.createdAt, 'HH:mm:ss')}
          </span>
          {item.erpOrder && item.erpOrder !== 'RECEPCION_BORRADOR' && (
            <>
              <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
              <span className="text-blue-500 text-[10px] font-black uppercase">ERP: {item.erpOrder}</span>
            </>
          )}
        </div>
      </div>
      {!isSynced && (
        <button
          onClick={() => onDelete(item.id)}
          className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 active:bg-rose-500/20 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});

export const ReceptionCapturePage: React.FC = () => {
  const navigate = useNavigate();
  const { state, actions } = useReceptionLogic();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback((code: string) => {
    actions.handleScan(code, state.currentErp);
    setManualInput('');
    // Al escanear, si no estamos usando la cámara para escanear, 
    // la lógica de negocio activará pendingPhotoCode y nosotros mostraremos la cámara de fotos
  }, [actions, state.currentErp]);

  useHIDScanner({
    onScan: handleScan,
    isEnabled: !isCameraActive && !state.pendingPhotoCode,
    maxLatency: 50
  });

  useEffect(() => {
    const focusInput = () => {
      if (!isCameraActive && !state.pendingPhotoCode && inputRef.current) {
        inputRef.current.focus();
      }
    };
    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, [isCameraActive]);

  const sortedItems = useMemo(() => {
    return [...(state.unsyncedDrafts || [])].sort((a, b) => b.createdAt - a.createdAt);
  }, [state.unsyncedDrafts]);

  return (
    <div className="h-screen w-full flex flex-col bg-[#050505] overflow-hidden font-mono text-white">
      {/* HEADER */}
      <div className="shrink-0 p-4 bg-[#050505] z-10 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/reception', { state: { preventAutoRedirect: true } })} 
              className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-400">Captura Recepción</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={actions.syncToCloud}
              disabled={state.isSyncing}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                state.isSyncing 
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                  : 'bg-white/5 border-white/10 text-slate-400 active:bg-white/10'
              }`}
            >
              {state.isSyncing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Cloud className="w-5 h-5" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black italic text-blue-500">{state.draftCount}</span>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Bultos</span>
            </div>
          </div>
        </div>

        {/* SCANNER INPUT */}
        <div className="relative flex items-center">
          <button 
            onClick={() => setIsCameraActive(!isCameraActive)}
            className="absolute inset-y-0 left-0 pl-4 flex items-center z-10 active:scale-90 transition-transform"
          >
            <Camera className={`w-6 h-6 ${isCameraActive ? 'text-blue-500' : 'text-slate-500'}`} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualInput.trim()) {
                handleScan(manualInput.trim());
              }
            }}
            placeholder="Escanear bulto..."
            className="w-full pl-12 pr-14 py-4 bg-[#0a0a0a] border border-blue-900/30 rounded-2xl text-xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
          />
          {manualInput.length > 0 && (
            <button
              onClick={() => handleScan(manualInput.trim())}
              className="absolute right-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center active:bg-blue-700 transition-colors"
            >
              <CornerDownLeft className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* INLINE CAMERA FOR SCANNING */}
      <AnimatePresence>
        {isCameraActive && !state.pendingPhotoCode && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 200, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative bg-black shrink-0 overflow-hidden border-b border-blue-500/30"
          >
            <CameraScanner 
              onScan={(code) => { handleScan(code); setIsCameraActive(false); }} 
              onClose={() => setIsCameraActive(false)} 
              inline={true}
              isTriggered={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN CAMERA FOR PHOTO CAPTURE */}
      <AnimatePresence>
        {state.pendingPhotoCode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="absolute top-0 left-0 right-0 p-6 z-[110] flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Capturar Etiqueta</span>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">{state.pendingPhotoCode}</h2>
              </div>
              <button 
                onClick={() => actions.setPendingPhotoCode(null)}
                className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white active:bg-white/20 transition-colors"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 relative">
              <CameraScanner 
                onScan={() => {}} 
                onClose={() => actions.setPendingPhotoCode(null)} 
                inline={false}
                mode="photo"
                onCapture={(photo) => actions.completeReceptionWithPhoto(photo)}
              />
            </div>

            <div className="p-8 bg-black flex flex-col items-center gap-4">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center">
                Encuadre la etiqueta y capture la imagen para finalizar el registro
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        {sortedItems.map((item) => (
          <ReceptionItemRow 
            key={item.id} 
            item={item} 
            onDelete={actions.deleteDraft} 
          />
        ))}
        
        {sortedItems.length === 0 && (
          <div className="text-center py-12 text-slate-500 font-bold text-sm uppercase tracking-widest">
            No hay bultos en esta sesión
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      {state.draftCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#050505]/80 backdrop-blur-xl border-t border-white/5 flex gap-3">
          <button
            onClick={actions.discardAll}
            className="flex-1 py-4 bg-rose-500/10 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-500/20 active:bg-rose-500/20 transition-all"
          >
            Descartar
          </button>
          <button
            onClick={actions.finalizeReception}
            className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
          >
            Finalizar Lote
          </button>
        </div>
      )}
    </div>
  );
};

export default ReceptionCapturePage;
