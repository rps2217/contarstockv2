
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReceptionLogic } from './hooks/useReceptionLogic';
import { CameraScanner } from '../../components/CameraScanner';
import { ReceptionHero } from './components/ReceptionHero'; 
import { QueueManager } from './components/QueueManager'; 
import { ReceptionToolsSheet } from './components/ReceptionToolsSheet';
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { VirtualList } from '../../shared/components/ui/VirtualList';
import { ScreenLockOverlay } from '../../shared/components/ui/ScreenLockOverlay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { ExpirationModal } from '../expiry/components/ExpirationModal';
import { ChevronLeft, Box, Trash2, Camera, Loader2, Calendar, Settings } from 'lucide-react';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import * as documentProcessor from '../../services/documentProcessor';
import { SoundFX } from '../../services/audio';

const ReceptionRow = React.memo(({ index, data }: any) => {
 const item = data.items[index];
 if (!item) return null;
 const { onDelete } = data;

 return (
 <div className="px-3 py-1 h-full">
 <div className="w-full h-full border-2 border-white/5 bg-slate-900/40 p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98]">
 <div className="flex items-center gap-4 overflow-hidden">
 <div className="w-10 h-10 rounded-xl bg-blue-900/20 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
 <Box className="w-5 h-5" />
 </div>
 <div className="min-w-0">
 <div className="font-mono font-black text-white truncate text-sm uppercase tracking-wider">
 {item.logisticsLabel}
 </div>
 <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-2">
 <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
 {item.erpOrder && item.erpOrder !== 'RECEPCION_BORRADOR' ? (
 <>
 <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
 <span className="text-emerald-500 font-black tracking-tighter">ERP: {item.erpOrder}</span>
 </>
 ) : (
 <>
 <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
 <span className="text-blue-500 font-black tracking-tighter">BORRADOR</span>
 </>
 )}
 </div>
 </div>
 </div>
 <button 
 onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
 className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-rose-500 hover:bg-rose-900/20 rounded-xl transition-all"
 >
 <Trash2 className="w-5 h-5" />
 </button>
 </div>
 </div>
 );
});

const ManifestRow = React.memo(({ index, data }: any) => {
  const item = data.items[index];
  if (!item) return null;

  return (
    <div className="px-3 py-1 h-full">
      <div className="w-full h-full border-2 border-white/5 bg-slate-900/40 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-900/20 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Box className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-mono font-black text-white truncate text-sm uppercase tracking-wider">
              {item.name}
            </div>
            <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-2">
              <span>SKU: {item.barcode}</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span className="text-amber-500 font-black tracking-tighter">CANT: {item.qty}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const ReceptionPage: React.FC<{ 
  isEmbedded?: boolean;
  initialExpectedCount?: number;
  initialErp?: string;
  initialItems?: any[];
}> = ({ isEmbedded = false, initialExpectedCount, initialErp, initialItems }) => {
  const navigate = useNavigate();
  const { state, actions } = useReceptionLogic();
  
  const [isAutoLockEnabled, setIsAutoLockEnabled] = useState(() => localStorage.getItem('reception_autolock') !== 'false');
  const { isLocked, unlock, lock } = useAutoLock(3000, isAutoLockEnabled);
  
  const [isTriggerActive, setIsTriggerActive] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [expectedCount, setExpectedCount] = useState<number>(initialExpectedCount || 0);
  const [isSettingExpected, setIsSettingExpected] = useState(!initialExpectedCount);
  const [viewMode, setViewMode] = useState<'scanned' | 'expected'>(initialItems ? 'expected' : 'scanned');
  const [expectedItems] = useState<any[]>(initialItems || []);

  // Persistir preferencia de auto-bloqueo
  React.useEffect(() => {
    localStorage.setItem('reception_autolock', isAutoLockEnabled.toString());
  }, [isAutoLockEnabled]);

  // Initialize ERP if provided
  React.useEffect(() => {
    if (initialErp) {
      actions.setCurrentErp(initialErp);
    }
  }, [initialErp, actions.setCurrentErp]);

  // ESCUCHA DE HARDWARE
  useHIDScanner({
    onScan: (barcode) => actions.handleScan(barcode, state.currentErp),
    isEnabled: !isLocked && !showKeypad && !showQueue && !isSettingExpected,
    maxLatency: 50
  });

  const startTrigger = useCallback(() => {
    if (isLocked) return;
    setIsTriggerActive(true);
    if (navigator.vibrate) navigator.vibrate(30);
  }, [isLocked]);

  const endTrigger = useCallback(() => {
    setIsTriggerActive(false);
  }, []);

  const drafts = state.unsyncedDrafts || [];
  const rowData = React.useMemo(() => ({ onDelete: actions.deleteDraft, items: drafts }), [actions.deleteDraft, drafts]);

  const handleKeypadConfirm = (value: string) => {
    actions.handleScan(value, state.currentErp);
    setShowKeypad(false);
  };

  const handleSetExpected = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num)) {
      setExpectedCount(num);
      setIsSettingExpected(false);
    }
  };

  const progress = expectedCount > 0 ? (state.draftCount / expectedCount) * 100 : 0;
  const isComplete = expectedCount > 0 && state.draftCount >= expectedCount;

  if (isSettingExpected) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mb-6 border border-blue-500/30">
          <Box className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Control de Arribo</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8 max-w-xs">
          ¿Cuántas bandejas o bultos esperas recibir según el manifiesto?
        </p>
        <div className="w-full max-w-xs">
          <NumericKeypad 
            isOpen={true}
            title="CANTIDAD ESPERADA"
            onConfirm={handleSetExpected}
            onClose={() => navigate('/dashboard')}
            embedded
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full w-full flex flex-col font-mono select-none overflow-hidden text-white transition-colors duration-200 ${isComplete ? 'bg-emerald-950/20' : 'bg-black'}`}>
      
      {/* STATUS BAR - TRAY PROGRESS */}
      <div className="p-6 bg-slate-900 border-b border-white/10 shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 active:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">PROGRESO DE ARRIBO</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black italic tracking-tighter">{state.draftCount}</span>
                <span className="text-xl font-bold text-slate-600">/ {expectedCount}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">ESTADO</span>
              <span className={`text-xs font-black uppercase tracking-widest ${isComplete ? 'text-emerald-500' : 'text-blue-500'}`}>
                {isComplete ? 'COMPLETO' : 'PENDIENTE'}
              </span>
            </div>
            {state.draftCount > 0 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowTools(true)}
                  className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 active:bg-white/10"
                  title="Herramientas"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowQueue(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
                >
                  FINALIZAR
                </button>
              </div>
            )}
            {state.draftCount === 0 && (
              <button 
                onClick={() => setShowTools(true)}
                className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 active:bg-white/10"
                title="Herramientas"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
          <div 
            className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-blue-600'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-black flex flex-col">
        <div className="p-4 flex items-center justify-between z-10">
          <span className="px-3 py-1 bg-slate-800/80 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400">
            {viewMode === 'scanned' ? 'Bandejas Escaneadas' : 'Listado Esperado (Nube)'}
          </span>
          
          {expectedItems.length > 0 && (
            <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setViewMode('scanned')}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'scanned' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                Escaneados
              </button>
              <button 
                onClick={() => setViewMode('expected')}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${viewMode === 'expected' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                Esperados
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-h-0">
          {viewMode === 'scanned' ? (
            <VirtualList 
              items={drafts} 
              itemHeight={80} 
              renderRow={ReceptionRow} 
              rowData={rowData} 
              className="bg-black/20" 
            />
          ) : (
            <VirtualList 
              items={expectedItems} 
              itemHeight={80} 
              renderRow={ManifestRow} 
              rowData={{ items: expectedItems }} 
              className="bg-black/20" 
            />
          )}
        </div>
      </div>

      <ScannerFooter 
        multiplier={1}
        unitsPerBox={1}
        isTriggerActive={isTriggerActive}
        onMultiplierChange={() => {}}
        onOpenManual={() => setShowKeypad(true)}
        onTriggerStart={startTrigger}
        onTriggerEnd={endTrigger}
        onOpenMenu={() => setShowQueue(true)}
      />

      {isTriggerActive && (
        <div className="fixed inset-0 z-[200]">
          <CameraScanner 
            onScan={(code) => { actions.handleScan(code, state.currentErp); setIsTriggerActive(false); }} 
            onClose={endTrigger} 
            isTriggered={true} 
          />
        </div>
      )}

      <NumericKeypad 
        isOpen={showKeypad}
        title="ETIQUETA MANUAL"
        onConfirm={handleKeypadConfirm}
        onClose={() => setShowKeypad(false)}
      />

      <QueueManager 
        isOpen={showQueue} 
        onClose={() => setShowQueue(false)} 
        drafts={drafts} 
        onDelete={actions.deleteDraft} 
        onDiscardAll={actions.discardAll} 
        onFinalize={() => {
          actions.finalizeReception();
          setShowQueue(false);
          setIsSettingExpected(true);
        }}
      />

      <ReceptionToolsSheet 
        isOpen={showTools}
        onClose={() => setShowTools(false)}
        isAutoLockEnabled={isAutoLockEnabled}
        onToggleAutoLock={() => setIsAutoLockEnabled(!isAutoLockEnabled)}
        onDiscardAll={actions.discardAll}
        onSync={actions.syncToCloud}
        isSyncing={state.isSyncing}
      />

      <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
    </div>
  );
};

export default ReceptionPage;
