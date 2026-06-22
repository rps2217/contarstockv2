/**
 * useEvents - Hook centralizado para gestión de eventos
 * 
 * Arquitectura simplificada v2.0 - Un solo hook, una sola responsabilidad
 */

// Re-exportar desde domain
export { EventStatus } from '../domain/eventsDomain';
export type { EventStats } from '../domain/eventsDomain';
export { 
  evaluateEventStatus, 
  getEventStatusLabel, 
  getEventStatusConfig,
  formatEventDate,
  formatEventDateShort,
  eventMatchesSearch,
  calculateEventStats,
  normalizeText
} from '../domain/eventsDomain';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { db } from '@/db';
import { useAppStore } from '@/stores';
import { genericSyncEngine } from '@/services/cloud/GenericSyncEngine';
import { 
  EventStatus, 
  EventStats, 
  evaluateEventStatus,
  calculateEventStats,
  normalizeText 
} from '../domain/eventsDomain';

// ============================================================================
// TIPOS
// ============================================================================

export interface EventRecord {
  id: string;
  barcode: string;
  productName: string;
  destino: string;
  traspaso: string;
  observaciones: string;
  frc: string;
  isAdjusted: boolean;
  timestamp: number;
  syncStatus?: 'synced' | 'pending' | 'error';
  status?: EventStatus; // Estado calculado (opcional para entrada)
}

export interface EventFilters {
  searchQuery: string;
  selectedStatuses: EventStatus[];
  dateRange: { start: Date | null; end: Date | null };
}

interface UseEventsReturn {
  events: EventRecord[];
  filteredEvents: EventRecord[];
  pendingEvents: EventRecord[];
  destinedEvents: EventRecord[];
  adjustedEvents: EventRecord[];
  stats: EventStats;
  filters: EventFilters;
  isLoading: boolean;
  isSyncing: boolean;
  selectedIds: Set<string>;
  isDetailModalOpen: boolean;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  selectedEvent: EventRecord | null;
  actions: {
    setSearchQuery: (query: string) => void;
    setSelectedStatuses: (statuses: EventStatus[]) => void;
    setDateRange: (range: { start: Date | null; end: Date | null }) => void;
    toggleSelection: (id: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
    deleteEvent: (id: string) => Promise<void>;
    bulkDelete: (ids: string[]) => Promise<void>;
    updateEvent: (id: string, data: Partial<EventRecord>) => Promise<void>;
    createEvent: (data: Omit<EventRecord, 'id'>) => Promise<void>;
    syncEvents: () => Promise<void>;
    setIsDetailModalOpen: (open: boolean) => void;
    setIsCreateModalOpen: (open: boolean) => void;
    setIsEditModalOpen: (open: boolean) => void;
    setSelectedEvent: (event: EventRecord | null) => void;
    clearFilters: () => void;
  };
}

export const useEvents = (): UseEventsReturn => {
  const settings = useAppStore(state => state.settings);
  const tableName = settings?.cloudConfig?.eventsTableName || 'EVENTOS';

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);

  const [filters, setFilters] = useState<EventFilters>({
    searchQuery: '',
    selectedStatuses: [],
    dateRange: { start: null, end: null }
  });

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await db.table('dynamic_data')
        .where('tableName')
        .equals(tableName)
        .toArray();
      
      const mapped: EventRecord[] = stored.map(item => {
        const eventData = {
          isAdjusted: (item.data as any)?.isAdjusted || false,
          destino: (item.data as any)?.destino || ''
        };
        
        return {
          id: item.id as string,
          barcode: (item.data as any)?.barcode || '',
          productName: (item.data as any)?.productName || '',
          destino: eventData.destino,
          traspaso: (item.data as any)?.traspaso || '',
          observaciones: (item.data as any)?.observaciones || '',
          frc: (item.data as any)?.frc || '',
          isAdjusted: eventData.isAdjusted,
          timestamp: (item.data as any)?.timestamp || Date.now(),
          syncStatus: item.syncStatus as 'synced' | 'pending' | 'error' || 'synced',
          status: evaluateEventStatus(eventData) // Calcular estado
        };
      });

      setEvents(mapped);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Error al cargar eventos');
    } finally {
      setIsLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ============================================================================
  // COMPUTED: FILTRADO Y ESTADÍSTICAS
  // ============================================================================

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Filtro de búsqueda
      if (filters.searchQuery) {
        const normalizedQuery = normalizeText(filters.searchQuery);
        const terms = normalizedQuery.split(/\s+/).filter(Boolean);
        const searchIndex = normalizeText(
          `${event.barcode} ${event.productName} ${event.destino} ${event.frc} ${event.traspaso}`
        );
        if (!terms.every(term => searchIndex.includes(term))) return false;
      }

      // Filtro por estado
      if (filters.selectedStatuses.length > 0) {
        if (!filters.selectedStatuses.includes(event.status)) return false;
      }

      // Filtro por rango de fechas
      if (filters.dateRange.start || filters.dateRange.end) {
        const eventDate = new Date(event.timestamp);
        if (filters.dateRange.start && eventDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && eventDate > filters.dateRange.end) return false;
      }

      return true;
    });
  }, [events, filters]);

  const stats = useMemo((): EventStats => {
    return calculateEventStats(events);
  }, [events]);

  const pendingEvents = useMemo(() => 
    filteredEvents.filter(e => e.status === EventStatus.PENDING),
    [filteredEvents]
  );

  const destinedEvents = useMemo(() => 
    filteredEvents.filter(e => e.status === EventStatus.DESTINED),
    [filteredEvents]
  );

  const adjustedEvents = useMemo(() => 
    filteredEvents.filter(e => e.status === EventStatus.ADJUSTED),
    [filteredEvents]
  );

  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setSelectedStatuses = useCallback((statuses: EventStatus[]) => {
    setFilters(prev => ({ ...prev, selectedStatuses: statuses }));
  }, []);

  const setDateRange = useCallback((range: { start: Date | null; end: Date | null }) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      selectedStatuses: [],
      dateRange: { start: null, end: null }
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredEvents.map(e => e.id)));
  }, [filteredEvents]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    try {
      await db.table('dynamic_data').delete(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success('Evento eliminado');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error al eliminar evento');
      throw error;
    }
  }, []);

  const bulkDelete = useCallback(async (ids: string[]) => {
    try {
      await db.table('dynamic_data').bulkDelete(ids);
      setEvents(prev => prev.filter(e => !ids.includes(e.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} eventos eliminados`);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Error al eliminar eventos');
      throw error;
    }
  }, []);

  const updateEvent = useCallback(async (id: string, data: Partial<EventRecord>) => {
    try {
      const existing = await db.table('dynamic_data').get(id);
      if (!existing) throw new Error('Evento no encontrado');

      const updated = {
        ...existing,
        data: {
          ...(existing.data as any),
          ...data,
          updated_at: new Date().toISOString()
        },
        syncStatus: 'pending'
      };

      await db.table('dynamic_data').put(updated);
      setEvents(prev => prev.map(e => 
        e.id === id ? { ...e, ...data } : e
      ));
      toast.success('Evento actualizado');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Error al actualizar evento');
      throw error;
    }
  }, []);

  const createEvent = useCallback(async (data: Omit<EventRecord, 'id'>) => {
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const record = {
        tableName,
        id,
        data: { ...data, created_at: new Date().toISOString() },
        syncStatus: 'pending' as const
      };

      await db.table('dynamic_data').add(record);
      setEvents(prev => [...prev, { ...data, id }]);
      toast.success('Evento creado');
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Error al crear evento');
      throw error;
    }
  }, [tableName]);

  const syncEvents = useCallback(async () => {
    try {
      setIsSyncing(true);
      await genericSyncEngine.sync('events');
      await loadEvents();
      toast.success('Sincronización completada');
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Error al sincronizar');
    } finally {
      setIsSyncing(false);
    }
  }, [loadEvents]);

  return {
    events,
    filteredEvents,
    pendingEvents,
    destinedEvents,
    adjustedEvents,
    stats,
    filters,
    isLoading,
    isSyncing,
    selectedIds,
    isDetailModalOpen,
    isCreateModalOpen,
    isEditModalOpen,
    selectedEvent,
    actions: {
      setSearchQuery,
      setSelectedStatuses,
      setDateRange,
      toggleSelection,
      selectAll,
      clearSelection,
      deleteEvent,
      bulkDelete,
      updateEvent,
      createEvent,
      syncEvents,
      setIsDetailModalOpen,
      setIsCreateModalOpen,
      setIsEditModalOpen,
      setSelectedEvent,
      clearFilters
    }
  };
};
