
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useReceptionLogic } from './hooks/useReceptionLogic';
import { useCaptureSession } from '../../hooks/useCaptureSession';
import { CameraScanner } from '../../components/CameraScanner';
import { ModuleHeader } from '../../shared/components/layout/ModuleHeader';
import { CaptureLayout } from '../../shared/components/layout/CaptureLayout';
import { ReceptionItemRow } from './components/ReceptionItemRow';
import { ReceptionCameraOverlay } from './components/ReceptionCameraOverlay';
import { ReceptionPhotoModal } from './components/ReceptionPhotoModal';

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
      <ReceptionCameraOverlay
        pendingPhotoCode={state.pendingPhotoCode}
        onClose={() => actions.setPendingPhotoCode(null)}
        onCapture={(photo) => actions.completeReceptionWithPhoto(photo)}
      />

      <ReceptionPhotoModal
        selectedPhotoItem={selectedPhotoItem}
        onClose={() => setSelectedPhotoItem(null)}
      />
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
