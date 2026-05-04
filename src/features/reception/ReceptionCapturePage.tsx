
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Trash2, CheckCircle2, Cloud, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useReceptionLogic } from './hooks/useReceptionLogic';
import { useCaptureSession } from '../../hooks/useCaptureSession';
import { CameraScanner } from '../../components/CameraScanner';
import { format } from 'date-fns';
import { ModuleHeader } from '../../shared/components/layout/ModuleHeader';
import { CaptureLayout } from '../../shared/components/layout/CaptureLayout';

const ReceptionItemRow = React.memo(({ item, onDelete, onShowPhoto }: { item: any; onDelete: (id: string) => void; onShowPhoto: (item: any) => void }) => {
  const isSynced = !!item.lastSyncTimestamp;
  const hasPhoto = !!(item.labelPhoto || item.photoUrl);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
      isSynced ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-blue-500/5 border-blue-500/20'
    }`}>
      <button 
        onClick={() => hasPhoto && onShowPhoto(item)}
        disabled={!hasPhoto}
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden active:scale-90 transition-transform ${
        isSynced ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/20 text-blue-500 border-blue-500/20'
      }`}>
        {item.labelPhoto || item.photoUrl ? (
          <img 
            src={item.labelPhoto || item.photoUrl} 
            alt="Etiqueta" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Box className="w-6 h-6" />
        )}
      </button>
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
  const [selectedPhotoItem, setSelectedPhotoItem] = useState<any>(null);

  const {
    inputValue,
    setInputValue,
    isCameraActive,
    setIsCameraActive,
    inputRef,
    handleManualSubmit
  } = useCaptureSession({
    onScan: (code) => actions.handleScan(code, state.currentErp),
    isEnabled: !state.pendingPhotoCode
  });

  const sortedItems = useMemo(() => {
    return [...(state.unsyncedDrafts || [])].sort((a, b) => b.createdAt - a.createdAt);
  }, [state.unsyncedDrafts]);

  const header = (
    <ModuleHeader 
      title="Captura Recepción"
      subtitle={`${state.draftCount} Bultos en sesión`}
      onBack={() => navigate('/reception', { state: { preventAutoRedirect: true } })}
      actions={
        <button
          onClick={actions.syncToCloud}
          disabled={state.isSyncing}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all ${
            state.isSyncing 
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
              : 'bg-white/5 border-white/10 text-slate-400 active:bg-white/10'
          }`}
        >
          {state.isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />}
        </button>
      }
    />
  );

  const cameraArea = (
    <AnimatePresence>
      {isCameraActive && !state.pendingPhotoCode && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 250, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-black overflow-hidden border-b border-blue-500/30 shadow-2xl"
        >
          <CameraScanner 
            onScan={(code) => { actions.handleScan(code, state.currentErp); setIsCameraActive(false); }} 
            onClose={() => setIsCameraActive(false)} 
            inline={true}
            isTriggered={true}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  const modalForm = (
    <>
      {/* FULL SCREEN CAMERA FOR PHOTO CAPTURE */}
      <AnimatePresence>
        {state.pendingPhotoCode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black flex flex-col"
          >
            <div className="absolute top-0 left-0 right-0 p-6 z-[2110] flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
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

      {/* PHOTO VIEWER MODAL */}
      <AnimatePresence>
        {selectedPhotoItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhotoItem(null)}
            className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            <div className="absolute top-6 right-6">
              <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Etiqueta Logística</span>
                  <h3 className="text-lg font-black text-white uppercase">{selectedPhotoItem.logisticsLabel}</h3>
                </div>
              </div>
              
              <div className="aspect-square w-full bg-black flex items-center justify-center">
                <img 
                  src={selectedPhotoItem.photoUrl || selectedPhotoItem.labelPhoto} 
                  alt="Etiqueta" 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="p-6 flex justify-center">
                <button 
                  onClick={() => setSelectedPhotoItem(null)}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      <CaptureLayout
        header={header}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onInputSubmit={handleManualSubmit}
        onCameraToggle={() => setIsCameraActive(!isCameraActive)}
        inputPlaceholder="Escanear bulto..."
        inputRef={inputRef}
        extra={cameraArea}
        modalForm={modalForm}
        list={
          <div className="space-y-4 pb-32">
            {sortedItems.map((item) => (
              <ReceptionItemRow 
                key={item.id} 
                item={item} 
                onDelete={actions.deleteDraft} 
                onShowPhoto={setSelectedPhotoItem}
              />
            ))}
          </div>
        }
        emptyState={
          sortedItems.length === 0 && (
            <div className="text-center py-12 text-slate-500 font-bold text-sm uppercase tracking-widest">
              No hay bultos en esta sesión
            </div>
          )
        }
        footer={
          state.draftCount > 0 && (
            <div className="flex gap-3">
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
          )
        }
      />
    </>
  );
};

export default ReceptionCapturePage;
