
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
  Moon,
  X,
  ArrowDownToLine,
  Trash
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
import { useAppStore } from '../../store/mainAppStore';
import { useCaptureHub } from '../../shared/hooks/useCaptureHub';

// Components
import { CameraScanner } from '../../components/CameraScanner';
import { NumericKeypad } from '../../components/NumericKeypad';
import { ScreenLockOverlay } from '../../shared/components/ui/ScreenLockOverlay';
import { ManagementSearchBar } from '../../shared/components/core/ManagementSearchBar';
import { useAutoLock } from '../../hooks/useAutoLock';
import { SoundFX } from '../../services/audio';

// Custom split components in line with high quality decoupled rules
import { ReceptionStats } from './components/ReceptionStats';
import { ReceptionFiltersDrawer } from './components/ReceptionFiltersDrawer';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { ReceptionItemCard } from './components/ReceptionItemCard';

const ReceptionManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const { state: logicState, actions: logicActions } = useReceptionLogic();
  const { state: historyState, actions: historyActions } = useReceptionHistory();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Advanced filters state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'synced' | 'draft' | 'completed'>('all');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with_photo' | 'without_photo'>('all');
  const [selectedErpFilter, setSelectedErpFilter] = useState<string>('all');
  const [selectedPhotoItem, setSelectedPhotoItem] = useState<any>(null);
  
  const capture = useCaptureHub({
    onCapture: (code) => logicActions.handleScan(code, logicState.currentErp)
  });
  
  const { isLocked, unlock, lock } = useAutoLock(settings.autoLockTimeout || 30000, false);
  const location = useLocation();

  const isDark = settings.theme === 'dark';

  // Mobile redirect
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const preventAutoRedirect = location.state?.preventAutoRedirect;

    if (isMobile && !preventAutoRedirect) {
      navigate('/reception/capture');
    }
  }, [navigate, location.state]);

  // Unificar borradores e historial
  const allItems = useMemo(() => {
    const sessions = historyState.sessions || [];
    return [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  }, [historyState.sessions]);

  // Unique ERPs gatherer
  const uniqueErps = useMemo(() => {
    const erps = new Set<string>();
    allItems.forEach(s => {
      if (s.erpOrder) erps.add(s.erpOrder);
    });
    return Array.from(erps);
  }, [allItems]);

  // Stats calculation
  const stats = useMemo(() => {
    const sessions = historyState.sessions || [];
    const total = sessions.length;
    const synced = sessions.filter(s => !!s.lastSyncTimestamp).length;
    const pending = sessions.filter(s => s.status === 'draft').length;
    const today = sessions.filter(s => {
      const d1 = format(s.createdAt, 'yyyy-MM-dd');
      const d2 = format(new Date(), 'yyyy-MM-dd');
      return d1 === d2;
    }).length;

    return { total, synced, pending, today };
  }, [historyState.sessions]);

  // Complete local filtration
  const filteredItems = useMemo(() => {
    let items = allItems;
    
    // Status Filter
    if (statusFilter === 'synced') {
      items = items.filter(item => !!item.lastSyncTimestamp);
    } else if (statusFilter === 'draft') {
      items = items.filter(item => item.status === 'draft');
    } else if (statusFilter === 'completed') {
      items = items.filter(item => item.status === 'completed' && !item.lastSyncTimestamp);
    }
    
    // Photo Filter
    if (photoFilter === 'with_photo') {
      items = items.filter(item => !!(item.labelPhoto || item.photoUrl));
    } else if (photoFilter === 'without_photo') {
      items = items.filter(item => !(item.labelPhoto || item.photoUrl));
    }
    
    // ERP Filter
    if (selectedErpFilter !== 'all') {
      items = items.filter(item => item.erpOrder === selectedErpFilter);
    }
    
    return items;
  }, [allItems, statusFilter, photoFilter, selectedErpFilter]);

  // Active counts
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (historyState.startDate) count++;
    if (historyState.endDate) count++;
    if (statusFilter !== 'all') count++;
    if (photoFilter !== 'all') count++;
    if (selectedErpFilter !== 'all') count++;
    return count;
  }, [historyState.startDate, historyState.endDate, statusFilter, photoFilter, selectedErpFilter]);

  // Quick reset
  const handleClearAllFilters = useCallback(() => {
    historyActions.setSearchQuery('');
    historyActions.setStartDate('');
    historyActions.setEndDate('');
    setStatusFilter('all');
    setPhotoFilter('all');
    setSelectedErpFilter('all');
    toast.success('Filtros restaurados con éxito');
  }, [historyActions]);

  // Agrupación por fecha
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredItems.forEach(item => {
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
  }, [filteredItems]);

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
    isEnabled: !isLocked && !capture.state.isKeypadOpen && !capture.state.isCameraOpen,
    maxLatency: 50
  });

  const handleManualInput = (value: string) => {
    capture.actions.handleCapture(value);
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans transition-colors duration-500 ${
      isDark ? 'bg-brand-dark text-white' : 'bg-stone-200/50 text-slate-900'
    }`}>
      {/* HEADER */}
      <div className={`p-4 md:p-6 pb-4 backdrop-blur-xl border-b shrink-0 transition-colors ${
        isDark ? 'bg-slate-950/40 border-white/5' : 'bg-stone-50/80 border-stone-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => navigate('/dashboard')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-2">
                <History className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                {settings.pharmacyName || 'Recepción de Bultos'}
              </h1>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                Control de Arribo y Gestión de Cajas de Carga
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button 
              type="button"
              onClick={logicActions.syncToCloud}
              disabled={logicState.isSyncing}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                logicState.isSyncing 
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                  : isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm'
              }`}
            >
              <Cloud className={`w-3.5 h-3.5 ${logicState.isSyncing ? 'animate-bounce' : ''}`} />
              {logicState.isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>

            <button
              type="button"
              onClick={historyActions.exportToCSV}
              className={`border px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-55 text-slate-600 shadow-sm'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Exportar CSV
            </button>

            <div className={`flex items-center p-1 rounded-xl border ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
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

        <ManagementSearchBar 
          searchQuery={historyState.searchQuery}
          setSearchQuery={historyActions.setSearchQuery}
          onOpenFilters={() => setIsFiltersOpen(!isFiltersOpen)}
          onOpenAdd={capture.actions.openCamera}
          onClearFilters={handleClearAllFilters}
          activeFiltersCount={activeFiltersCount}
          placeholder="Buscar bulto..."
          accentColor="blue"
          theme={isDark ? 'dark' : 'light'}
        />

        <AnimatePresence>
          {isFiltersOpen && (
            <ReceptionFiltersDrawer
              isOpen={isFiltersOpen}
              startDate={historyState.startDate}
              setStartDate={historyActions.setStartDate}
              endDate={historyState.endDate}
              setEndDate={historyActions.setEndDate}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              photoFilter={photoFilter}
              setPhotoFilter={setPhotoFilter}
              selectedErpFilter={selectedErpFilter}
              setSelectedErpFilter={setSelectedErpFilter}
              uniqueErps={uniqueErps}
              theme={isDark ? 'dark' : 'light'}
              onClear={handleClearAllFilters}
            />
          )}
        </AnimatePresence>
      </div>

      {/* STATS OVERVIEW HEADER */}
      <div className={`px-4 md:px-6 pt-6 shrink-0 transition-colors ${
        isDark ? 'bg-slate-950/20' : 'bg-stone-100/40'
      }`}>
        <ReceptionStats stats={stats} theme={isDark ? 'dark' : 'light'} />
      </div>

      {/* MAIN LIST */}
      <div ref={parentRef} className={`flex-1 overflow-y-auto px-4 md:px-6 no-scrollbar pb-32 transition-colors ${
        isDark ? 'bg-slate-950/60' : 'bg-stone-100/85'
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
                    <div className="h-px flex-1 bg-slate-500/10" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-500/5 px-4 py-1.5 rounded-full border border-slate-500/10">
                      {item.date}
                    </span>
                    <div className="h-px flex-1 bg-slate-500/10" />
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
                {viewMode === 'grid' ? (
                  <ReceptionItemCard 
                    item={item.data}
                    onDelete={logicActions.deleteDraft}
                    onShowPhoto={setSelectedPhotoItem}
                    isCompact={false}
                  />
                ) : (
                  <div className={`p-3 rounded-2xl border transition-all hover:scale-[1.01] flex items-center justify-between gap-4 ${
                    isDark 
                      ? 'bg-slate-900 border-white/5 text-white' 
                      : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      {item.data.labelPhoto || item.data.photoUrl ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoItem(item.data)}
                          className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-700/30"
                        >
                          <img src={item.data.labelPhoto || item.data.photoUrl} alt="Bulto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                          <Box className="w-5 h-5 text-slate-500" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-mono text-sm font-black truncate block">{item.data.logisticsLabel}</span>
                        <span className="text-[9px] text-slate-500 font-bold block">{format(item.data.createdAt, 'HH:mm:ss')} • {item.data.erpOrder || 'Borrador'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!!item.data.lastSyncTimestamp ? (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 uppercase font-bold">NUBE</span>
                      ) : (
                        <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5 uppercase font-bold text-center">LOCAL</span>
                      )}
                      {!item.data.lastSyncTimestamp && (
                        <button 
                          type="button"
                          onClick={() => logicActions.deleteDraft(item.data.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* PHOTO VIEWER MODAL DECOUPLED COMPONENT */}
        <PhotoViewerModal 
          item={selectedPhotoItem} 
          onClose={() => setSelectedPhotoItem(null)} 
          theme={isDark ? 'dark' : 'light'} 
        />

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border transition-colors ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'
            }`}>
              <Box className={`w-10 h-10 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
            </div>
            <h3 className={`text-lg font-black uppercase tracking-tighter italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sin registros</h3>
            <p className={`text-[10px] font-bold uppercase tracking-widest max-w-[200px] mt-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              No se encontraron bultos que coincidan con la búsqueda o filtros aplicados.
            </p>
          </div>
        )}
      </div>

      {/* FOOTER STATS */}
      <div className={`p-4 backdrop-blur-xl border-t flex justify-between items-center shrink-0 transition-colors ${
        isDark ? 'bg-brand-surface/80 border-white/5' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Bultos en Sesión</span>
          <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{logicState.draftCount} Unidades</span>
        </div>
        
        {logicState.draftCount > 0 && (
          <button 
            type="button"
            onClick={logicActions.finalizeReception}
            className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
          >
            Finalizar Lote
          </button>
        )}

        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Encontrado</span>
          <span className={`text-sm font-black uppercase italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{filteredItems.length} / {allItems.length}</span>
        </div>
      </div>

      {/* OVERLAYS */}
      <AnimatePresence>
        {capture.state.isCameraOpen && (
          <div className="fixed inset-0 z-[200]">
            <CameraScanner 
              onScan={capture.actions.handleCapture} 
              onClose={capture.actions.closeCamera} 
              isTriggered={true} 
            />
          </div>
        )}
      </AnimatePresence>

      <NumericKeypad 
        isOpen={capture.state.isKeypadOpen}
        title="ETIQUETA MANUAL"
        onConfirm={handleManualInput}
        onClose={capture.actions.closeKeypad}
      />

      <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
    </div>
  );
};

export default ReceptionManagementPage;
