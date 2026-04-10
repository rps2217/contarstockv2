
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { 
  Box, 
  History, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Cloud, 
  RefreshCw, 
  ChevronLeft,
  Calendar,
  Settings,
  CheckCircle2,
  Camera,
  LayoutGrid,
  List,
  Sun,
  Moon
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';

// Hooks
import { useReceptionLogic } from './hooks/useReceptionLogic';
import { useReceptionHistory } from './hooks/useReceptionHistory';
import { useHIDScanner } from '../../hooks/useHIDScanner';

// Components
import { CameraScanner } from '../../components/CameraScanner';
import { NumericKeypad } from '../../components/NumericKeypad';
import { ScreenLockOverlay } from '../../shared/components/ui/ScreenLockOverlay';
import { useAutoLock } from '../../hooks/useAutoLock';
import { SoundFX } from '../../services/audio';

const ReceptionItemCard = React.memo(({ item, onDelete, theme, isCompact }: any) => {
  const isSynced = !!item.lastSyncTimestamp;
  const isDraft = item.status === 'draft';

  return (
    <div className={`group relative border-2 rounded-2xl p-4 transition-all active:scale-[0.98] ${
      isSynced 
        ? 'bg-emerald-500/5 border-emerald-500/20' 
        : isDraft 
          ? 'bg-blue-500/5 border-blue-500/20' 
          : theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            isSynced 
              ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' 
              : isDraft 
                ? 'bg-blue-500/20 text-blue-500 border-blue-500/20' 
                : 'bg-slate-500/20 text-slate-500 border-slate-500/20'
          }`}>
            <Box className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-mono font-black truncate text-base uppercase tracking-wider ${
                isSynced ? 'text-emerald-400' : theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                {item.logisticsLabel}
              </span>
              {isSynced && (
                <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">NUBE</span>
                </div>
              )}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-2">
              <span>{format(item.createdAt, 'HH:mm:ss')}</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span className={`${isDraft ? 'text-blue-500' : 'text-slate-400'} font-black tracking-tighter`}>
                {item.erpOrder && item.erpOrder !== 'RECEPCION_BORRADOR' ? `ERP: ${item.erpOrder}` : 'BORRADOR'}
              </span>
            </div>
          </div>
        </div>

        {!isSynced && (
          <button 
            onClick={() => onDelete(item.id)}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
});

const ReceptionManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { state: logicState, actions: logicActions } = useReceptionLogic();
  const { state: historyState, actions: historyActions } = useReceptionHistory();
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('logicount_theme') as any) || 'dark');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  
  const [isAutoLockEnabled, setIsAutoLockEnabled] = useState(() => localStorage.getItem('reception_autolock') !== 'false');
  const { isLocked, unlock, lock } = useAutoLock(3000, isAutoLockEnabled);
  const location = useLocation();

  // Mobile redirect
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const preventAutoRedirect = location.state?.preventAutoRedirect;

    if (isMobile && !preventAutoRedirect) {
      navigate('/reception/capture');
    }
  }, [navigate, location.state]);

  // Unificar borradores e historial (el historial ya incluye borradores según el repo)
  const allItems = useMemo(() => {
    const sessions = historyState.sessions || [];
    return [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  }, [historyState.sessions]);

  // Agrupación por fecha
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    allItems.forEach(item => {
      const date = format(item.createdAt, 'dd/MM/yyyy');
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });

    const flattened: any[] = [];
    const sortedDates = Object.keys(groups).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA).getTime();
      const dateB = new Date(yearB, monthB - 1, dayB).getTime();
      return dateB - dateA;
    });

    sortedDates.forEach(date => {
      flattened.push({ type: 'header', date });
      groups[date].forEach(item => {
        flattened.push({ type: 'item', data: item });
      });
    });
    return flattened;
  }, [allItems]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: groupedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => groupedItems[index].type === 'header' ? 50 : 100,
    overscan: 5,
  });

  // ESCUCHA DE HARDWARE
  useHIDScanner({
    onScan: (barcode) => logicActions.handleScan(barcode, logicState.currentErp),
    isEnabled: !isLocked && !isKeypadOpen && !isCameraOpen,
    maxLatency: 50
  });

  const handleManualInput = (value: string) => {
    logicActions.handleScan(value, logicState.currentErp);
    setIsKeypadOpen(false);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('logicount_theme', next);
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans transition-colors duration-500 ${
      theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-stone-200/50 text-slate-900'
    }`}>
      {/* HEADER */}
      <div className={`p-4 md:p-6 pb-4 backdrop-blur-xl border-b shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-stone-50/80 border-stone-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none">Recepción de Bultos</h1>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                Control de Arribo y Gestión de Cajas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button 
              onClick={logicActions.syncToCloud}
              disabled={logicState.isSyncing}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                logicState.isSyncing 
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                  : theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm'
              }`}
            >
              <Cloud className={`w-3.5 h-3.5 ${logicState.isSyncing ? 'animate-bounce' : ''}`} />
              {logicState.isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>

            <button 
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10' 
                  : 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200 shadow-sm'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className={`flex items-center p-1 rounded-xl border ${
              theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-50'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH & ADD */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Buscar bulto o ERP..."
              value={historyState.searchQuery}
              onChange={(e) => historyActions.setSearchQuery(e.target.value)}
              className={`w-full h-12 pl-12 pr-4 rounded-2xl border text-xs font-bold transition-all outline-none ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 focus:border-blue-500/50' 
                  : 'bg-white border-slate-200 focus:border-blue-500 shadow-sm'
              }`}
            />
          </div>
          <button 
            onClick={() => setIsCameraOpen(true)}
            className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsKeypadOpen(true)}
            className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MAIN LIST */}
      <div ref={parentRef} className={`flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar pb-32 transition-colors ${
        theme === 'dark' ? 'bg-slate-950/60' : 'bg-stone-100/80'
      }`}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = groupedItems[virtualRow.index];
            
            if (item.type === 'header') {
              return (
                <div
                  key={`header-${item.date}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-px flex-1 bg-slate-500/20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-500/5 px-3 py-1 rounded-full border border-slate-500/10">
                      {item.date}
                    </span>
                    <div className="h-px flex-1 bg-slate-500/20" />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.data.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '12px',
                }}
              >
                <ReceptionItemCard 
                  item={item.data}
                  onDelete={logicActions.deleteDraft}
                  theme={theme}
                  isCompact={viewMode === 'list'}
                />
              </div>
            );
          })}
        </div>

        {allItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border transition-colors ${
              theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'
            }`}>
              <Box className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
            </div>
            <h3 className={`text-lg font-black uppercase tracking-tighter italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Sin bultos</h3>
            <p className={`text-[10px] font-bold uppercase tracking-widest max-w-[200px] mt-2 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
              Escanea una etiqueta logística para comenzar la recepción.
            </p>
          </div>
        )}
      </div>

      {/* FOOTER STATS */}
      <div className={`p-4 backdrop-blur-xl border-t flex justify-between items-center shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-brand-surface/80 border-white/5' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Bultos en Sesión</span>
          <span className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{logicState.draftCount} Unidades</span>
        </div>
        
        {logicState.draftCount > 0 && (
          <button 
            onClick={logicActions.finalizeReception}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
          >
            Finalizar Lote
          </button>
        )}

        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Histórico</span>
          <span className={`text-sm font-black uppercase italic tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{allItems.length}</span>
        </div>
      </div>

      {/* OVERLAYS */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-[200]">
            <CameraScanner 
              onScan={(code) => { logicActions.handleScan(code, logicState.currentErp); setIsCameraOpen(false); }} 
              onClose={() => setIsCameraOpen(false)} 
              isTriggered={true} 
            />
          </div>
        )}
      </AnimatePresence>

      <NumericKeypad 
        isOpen={isKeypadOpen}
        title="ETIQUETA MANUAL"
        onConfirm={handleManualInput}
        onClose={() => setIsKeypadOpen(false)}
      />

      <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
    </div>
  );
};

export default ReceptionManagementPage;
