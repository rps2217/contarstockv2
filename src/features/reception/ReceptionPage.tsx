/**
 * ReceptionPage - Página unificada de recepción
 * 
 * Combina ReceptionManagementPage y ReceptionCapturePage en una sola vista
 * con transiciones fluidas entre lista y captura.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Loader2, Plus, List, Grid, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Hooks
import { useReceptionLogic } from './hooks/useReceptionLogic';
import { useReceptionHistory } from './hooks/useReceptionHistory';
import { useCaptureSession } from '../../hooks/useCaptureSession';
import { useAppStore } from '@/stores';

// Components
import { CameraScanner } from '../../components/CameraScanner';
import { ModuleHeader } from '../../shared/components/layout/ModuleHeader';
import { CaptureLayout } from '../../shared/components/layout/CaptureLayout';
import { ReceptionStats } from './components/ReceptionStats';
import { ReceptionFiltersDrawer } from './components/ReceptionFiltersDrawer';
import { ReceptionItemCard } from './components/ReceptionItemCard';
import { ReceptionItemRow } from './components/ReceptionItemRow';
import { ReceptionDetailModal } from './components/ReceptionDetailModal';
import { ReceptionCameraOverlay } from './components/ReceptionCameraOverlay';
import { ReceptionPhotoModal } from './components/ReceptionPhotoModal';

type ViewMode = 'grid' | 'list';
type PageMode = 'management' | 'capture';

interface ReceptionPageProps {
  initialMode?: PageMode;
}

export const ReceptionPage: React.FC<ReceptionPageProps> = ({ initialMode = 'management' }) => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const { state: logicState, actions: logicActions } = useReceptionLogic();
  const { state: historyState, actions: historyActions } = useReceptionHistory();

  // Modo de página (management vs capture)
  const [pageMode, setPageMode] = useState<PageMode>(initialMode);

  // Vista (grid vs list) para management
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filtros
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'synced' | 'draft' | 'completed'>('all');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with_photo' | 'without_photo'>('all');
  const [selectedErpFilter, setSelectedErpFilter] = useState<string>('all');

  // Modales
  const [selectedReceptionItem, setSelectedReceptionItem] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPhotoItem, setSelectedPhotoItem] = useState<any>(null);

  // Capture mode state
  const {
    inputValue,
    setInputValue,
    isCameraActive,
    setIsCameraActive,
    inputRef,
    handleManualSubmit
  } = useCaptureSession({
    onScan: (code) => logicActions.handleScan(code, logicState.currentErp),
    isEnabled: !state.pendingPhotoCode && pageMode === 'capture'
  });

  // ==================== MANAGEMENT MODE ====================

  const isDark = settings.theme === 'dark';

  // Unificar borradores e historial
  const allItems = useMemo(() => {
    const sessions = historyState.sessions || [];
    return [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  }, [historyState.sessions]);

  // Unique ERPs
  const uniqueErps = useMemo(() => {
    const erps = new Set<string>();
    allItems.forEach(s => {
      if (s.erpOrder) erps.add(s.erpOrder);
    });
    return Array.from(erps);
  }, [allItems]);

  // Stats
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

  // Filtrado
  const filteredItems = useMemo(() => {
    let items = allItems;

    if (statusFilter === 'synced') {
      items = items.filter(item => !!item.lastSyncTimestamp);
    } else if (statusFilter === 'draft') {
      items = items.filter(item => item.status === 'draft');
    } else if (statusFilter === 'completed') {
      items = items.filter(item => item.status === 'completed' && !item.lastSyncTimestamp);
    }

    if (photoFilter === 'with_photo') {
      items = items.filter(item => !!(item.labelPhoto || item.photoUrl));
    } else if (photoFilter === 'without_photo') {
      items = items.filter(item => !(item.labelPhoto || item.photoUrl));
    }

    if (selectedErpFilter !== 'all') {
      items = items.filter(item => item.erpOrder === selectedErpFilter);
    }

    return items;
  }, [allItems, statusFilter, photoFilter, selectedErpFilter]);

  // Handlers
  const handleViewDetail = useCallback((item: any) => {
    setSelectedReceptionItem(item);
    setIsDetailModalOpen(true);
  }, []);

  const handleClearFilters = useCallback(() => {
    historyActions.setSearchQuery('');
    historyActions.setStartDate('');
    historyActions.setEndDate('');
    setStatusFilter('all');
    setPhotoFilter('all');
    setSelectedErpFilter('all');
    toast.success('Filtros restaurados');
  }, [historyActions]);

  // ==================== CAPTURE MODE ====================

  const sortedDrafts = useMemo(() => {
    return [...(logicState.unsyncedDrafts || [])].sort((a, b) => b.createdAt - a.createdAt);
  }, [logicState.unsyncedDrafts]);

  // ==================== RENDER ====================

  // -------------------- MANAGEMENT HEADER --------------------
  const managementHeader = (
    <div className="space-y-4">
      {/* Stats */}
      <ReceptionStats stats={stats} />

      {/* Search & Filters Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Buscar por bulto u orden..."
            value={historyState.searchQuery}
            onChange={(e) => historyActions.setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <button
          onClick={() => setIsFiltersOpen(true)}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
        >
          <List className="w-5 h-5" />
        </button>
        <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-3 ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400'}`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-3 ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400'}`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  // -------------------- CAPTURE LAYOUT --------------------
  const captureHeader = (
    <ModuleHeader
      title="Captura Recepción"
      subtitle={`${logicState.draftCount} Bultos en sesión`}
      onBack={() => {
        setPageMode('management');
        navigate('/reception');
      }}
      actions={
        <button
          onClick={logicActions.syncToCloud}
          disabled={logicState.isSyncing}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all ${
            logicState.isSyncing
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
              : 'bg-white/5 border-white/10 text-slate-400 active:bg-white/10'
          }`}
        >
          {logicState.isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cloud className="w-5 h-5" />}
        </button>
      }
    />
  );

  const cameraArea = (
    <AnimatePresence>
      {isCameraActive && !logicState.pendingPhotoCode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 250, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-black overflow-hidden border-b border-blue-500/30 shadow-2xl"
        >
          <CameraScanner
            onScan={(code) => { logicActions.handleScan(code, logicState.currentErp); setIsCameraActive(false); }}
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
        pendingPhotoCode={logicState.pendingPhotoCode}
        onClose={() => logicActions.setPendingPhotoCode(null)}
        onCapture={(photo) => logicActions.completeReceptionWithPhoto(photo)}
      />
      <ReceptionPhotoModal
        selectedPhotoItem={selectedPhotoItem}
        onClose={() => setSelectedPhotoItem(null)}
      />
    </>
  );

  // ==================== MAIN RENDER ====================

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {pageMode === 'management' ? 'Recepciones' : 'Captura'}
          </h1>
          {pageMode === 'management' && (
            <button
              onClick={() => setPageMode('capture')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              Nueva
            </button>
          )}
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setPageMode('management')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              pageMode === 'management'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          >
            Historial
          </button>
          <button
            onClick={() => setPageMode('capture')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              pageMode === 'capture'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10'
            }`}
          >
            Captura
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {pageMode === 'management' ? (
            <motion.div
              key="management"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {managementHeader}

              {/* Items Grid/List */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No hay recepciones
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item) => (
                    <ReceptionItemCard
                      key={item.id}
                      item={item}
                      onViewDetail={handleViewDetail}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <ReceptionItemCard
                      key={item.id}
                      item={item}
                      onViewDetail={handleViewDetail}
                      compact
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="capture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CaptureLayout
                header={captureHeader}
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
                    {sortedDrafts.map((item) => (
                      <ReceptionItemRow
                        key={item.id}
                        item={item}
                        onDelete={logicActions.deleteDraft}
                        onShowPhoto={setSelectedPhotoItem}
                      />
                    ))}
                  </div>
                }
                emptyState={
                  sortedDrafts.length === 0 && (
                    <div className="text-center py-12 text-slate-500 font-bold text-sm uppercase tracking-widest">
                      No hay bultos en esta sesión
                    </div>
                  )
                }
                footer={
                  logicState.draftCount > 0 && (
                    <div className="flex gap-3">
                      <button
                        onClick={logicActions.discardAll}
                        className="flex-1 py-4 bg-rose-500/10 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-500/20 active:bg-rose-500/20 transition-all"
                      >
                        Descartar
                      </button>
                      <button
                        onClick={logicActions.finalizeReception}
                        className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-900/40 active:scale-95 transition-all"
                      >
                        Finalizar Lote
                      </button>
                    </div>
                  )
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters Drawer */}
      <ReceptionFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        photoFilter={photoFilter}
        setPhotoFilter={setPhotoFilter}
        selectedErpFilter={selectedErpFilter}
        setSelectedErpFilter={setSelectedErpFilter}
        erpOptions={uniqueErps}
        startDate={historyState.startDate}
        endDate={historyState.endDate}
        setStartDate={historyActions.setStartDate}
        setEndDate={historyActions.setEndDate}
        onClearAll={handleClearFilters}
      />

      {/* Detail Modal */}
      <ReceptionDetailModal
        item={selectedReceptionItem}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
};

export default ReceptionPage;
