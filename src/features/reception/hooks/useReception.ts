/**
 * useReception.ts - Hook centralizado para el módulo de Recepciones
 * 
 * Combina useReceptionLogic y useReceptionHistory
 */

import { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { CountingSession } from '@/types';
import { useReceptionLogic } from './useReceptionLogic';
import { useReceptionHistory } from './useReceptionHistory';
import {
  calculateReceptionStats,
  receptionMatchesSearch,
  filterReceptions,
  sortReceptions,
  getUniqueErps,
  ReceptionStats,
  StatusFilter,
  PhotoFilter,
  Session as ReceptionSession
} from '../domain/receptionDomain';

// ============================================================================
// TIPOS
// ============================================================================

export type PageMode = 'management' | 'capture';
export type ViewMode = 'grid' | 'list';

export interface ReceptionFilters {
  searchQuery: string;
  status: StatusFilter;
  photo: PhotoFilter;
  erp: string;
  startDate: string;
  endDate: string;
}

export interface UseReceptionReturn {
  // Estado
  filteredSessions: ReceptionSession[];
  allSessions: ReceptionSession[];
  draftSessions: ReceptionSession[];
  stats: ReceptionStats;
  filters: ReceptionFilters;
  uniqueErps: string[];
  isLoading: boolean;
  isSyncing: boolean;
  
  // Modo UI
  pageMode: PageMode;
  viewMode: ViewMode;
  
  // UI State
  ui: {
    isFiltersOpen: boolean;
    isDetailModalOpen: boolean;
    selectedSession: ReceptionSession | null;
  };
  
  // Acciones
  actions: {
    // Modo
    setPageMode: (mode: PageMode) => void;
    setViewMode: (mode: ViewMode) => void;
    
    // Filtros
    setSearchQuery: (query: string) => void;
    setStatusFilter: (filter: StatusFilter) => void;
    setPhotoFilter: (filter: PhotoFilter) => void;
    setErpFilter: (erp: string) => void;
    setStartDate: (date: string) => void;
    setEndDate: (date: string) => void;
    clearFilters: () => void;
    setFiltersOpen: (open: boolean) => void;
    
    // Sesiones
    selectSession: (session: ReceptionSession | null) => void;
    openDetail: (session: ReceptionSession) => void;
    closeDetail: () => void;
    deleteSession: (id: string | number) => Promise<void>;
    
    // Capture mode
    handleScan: (code: string, erp?: string) => Promise<void>;
    completeWithPhoto: (photo: string) => Promise<void>;
    finalizeReception: () => Promise<void>;
    discardAll: () => Promise<void>;
    syncToCloud: () => Promise<void>;
    deleteDraft: (id: string) => Promise<void>;
  };
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useReception = (): UseReceptionReturn => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings?.theme as 'dark' | 'light' | 'high-contrast') || 'dark';

  // Hooks existentes
  const { state: logicState, actions: logicActions } = useReceptionLogic();
  const { state: historyState, actions: historyActions } = useReceptionHistory();

  // Estado local de filtros
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('all');
  const [selectedErpFilter, setSelectedErpFilter] = useState<string>('all');

  // Modo UI
  const [pageMode, setPageMode] = useState<PageMode>('management');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // UI State
  const [selectedSession, setSelectedSession] = useState<ReceptionSession | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Combinar sesiones (borradores + historial)
  const allSessions = useMemo(() => {
    const sessions: CountingSession[] = historyState.sessions || [];
    return [...sessions].sort((a, b) => b.createdAt - a.createdAt);
  }, [historyState.sessions]);

  // ERPs únicos
  const uniqueErps = useMemo(() => {
    return getUniqueErps(allSessions);
  }, [allSessions]);

  // Estadísticas
  const stats = useMemo(() => {
    return calculateReceptionStats(allSessions);
  }, [allSessions]);

  // Sesiones filtradas
  const filteredSessions = useMemo(() => {
    let sessions: CountingSession[] = allSessions;

    // Filtrar por búsqueda
    if (historyState.searchQuery?.trim()) {
      sessions = sessions.filter(s => 
        receptionMatchesSearch(s, historyState.searchQuery)
      );
    }

    // Filtrar por criterios
    sessions = filterReceptions(sessions, {
      status: statusFilter,
      photo: photoFilter,
      erp: selectedErpFilter
    });

    // Ordenar por fecha (más reciente primero)
    sessions = sortReceptions(sessions, 'createdAt', 'desc');

    return sessions;
  }, [
    allSessions, 
    historyState.searchQuery, 
    statusFilter, 
    photoFilter, 
    selectedErpFilter
  ]);

  // Borradores para capture mode
  const draftSessions = useMemo(() => {
    return [...(logicState.unsyncedDrafts || [])].sort((a, b) => b.createdAt - a.createdAt);
  }, [logicState.unsyncedDrafts]);

  // Acciones
  const openDetail = useCallback((session: ReceptionSession) => {
    setSelectedSession(session);
    setIsDetailModalOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedSession(null);
  }, []);

  const deleteSession = useCallback(async (id: string | number) => {
    await historyActions.deleteSession(id);
  }, [historyActions]);

  const clearFilters = useCallback(() => {
    historyActions.setSearchQuery('');
    historyActions.setStartDate('');
    historyActions.setEndDate('');
    setStatusFilter('all');
    setPhotoFilter('all');
    setSelectedErpFilter('all');
  }, [historyActions]);

  return {
    filteredSessions,
    allSessions,
    draftSessions,
    stats,
    filters: {
      searchQuery: historyState.searchQuery || '',
      status: statusFilter,
      photo: photoFilter,
      erp: selectedErpFilter,
      startDate: historyState.startDate || '',
      endDate: historyState.endDate || ''
    },
    uniqueErps,
    isLoading: allSessions.length === 0 && !logicState.isSyncing,
    isSyncing: logicState.isSyncing,
    pageMode,
    viewMode,
    ui: {
      isFiltersOpen,
      isDetailModalOpen,
      selectedSession
    },
    actions: {
      // Modo
      setPageMode,
      setViewMode,
      
      // Filtros
      setSearchQuery: historyActions.setSearchQuery,
      setStatusFilter,
      setPhotoFilter,
      setErpFilter: setSelectedErpFilter,
      setStartDate: historyActions.setStartDate,
      setEndDate: historyActions.setEndDate,
      clearFilters,
      setFiltersOpen: setIsFiltersOpen,
      
      // Sesiones
      selectSession: setSelectedSession,
      openDetail,
      closeDetail,
      deleteSession,
      
      // Capture mode
      handleScan: logicActions.handleScan,
      completeWithPhoto: logicActions.completeReceptionWithPhoto,
      finalizeReception: async () => { await logicActions.finalizeReception(); },
      discardAll: logicActions.discardAll,
      syncToCloud: logicActions.syncToCloud,
      deleteDraft: logicActions.deleteDraft
    }
  };
};

// Re-exportar tipos útiles
export type { ReceptionStats, ReceptionSession };
