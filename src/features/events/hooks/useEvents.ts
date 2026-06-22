/**
 * useEvents - Hook centralizado para gestión de eventos
 * 
 * Arquitectura simplificada v2.0 - Un solo hook, una sola responsabilidad
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { db } from '@/db';
import { useAppStore } from '@/stores';
import { genericSyncEngine } from '@/services/cloud/GenericSyncEngine';

// Tipos
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
}

export interface EventFilters {
  searchQuery: string;
  selectedEvents: string[];
  dateRange: { start: Date | null; end: Date | null };
}

interface UseEventsReturn {
  events: EventRecord[];
  filteredEvents: EventRecord[];
  pendingEvents: EventRecord[];
  destinedEvents: EventRecord[];
  adjustedEvents: EventRecord[];
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
    setSelectedEvents: (events: string[]) => void;
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
    selectedEvents: [],
    dateRange: { start: null, end: null }
  });

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await db.table('dynamic_data')
        .where('tableName')
        .equals(tableName)
        .toArray();
      
      const mapped: EventRecord[] = stored.map(item => ({
        id: item.id as string,
        barcode: (item.data as any)?.barcode || '',
        productName: (item.data as any)?.productName || '',
        destino: (item.data as any)?.destino || '',
        traspaso: (item.data as any)?.traspaso || '',
        observaciones: (item.data as any)?.observaciones || '',
        frc: (item.data as any)?.frc || '',
        isAdjusted: (item.data as any)?.isAdjusted || false,
        timestamp: (item.data as any)?.timestamp || Date.now(),
        syncStatus: item.syncStatus as 'synced' | 'pending' | 'error' || 'synced'
      }));

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

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch = 
          event.barcode?.toLowerCase().includes(query) ||
          event.productName?.toLowerCase().includes(query) ||
          event.destino?.toLowerCase().includes(query) ||
          event.frc?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (filters.selectedEvents.length > 0) {
        const eventType = event.isAdjusted ? 'adjusted' : 
                         event.destino ? 'destined' : 'pending';
        if (!filters.selectedEvents.includes(eventType)) return false;
      }

      if (filters.dateRange.start || filters.dateRange.end) {
        const eventDate = new Date(event.timestamp);
        if (filters.dateRange.start && eventDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && eventDate > filters.dateRange.end) return false;
      }

      return true;
    });
  }, [events, filters]);

  const pendingEvents = useMemo(() => 
    filteredEvents.filter(e => !e.isAdjusted && !e.destino),
    [filteredEvents]
  );

  const destinedEvents = useMemo(() => 
    filteredEvents.filter(e => !e.isAdjusted && !!e.destino),
    [filteredEvents]
  );

  const adjustedEvents = useMemo(() => 
    filteredEvents.filter(e => e.isAdjusted),
    [filteredEvents]
  );

  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setSelectedEvents = useCallback((selected: string[]) => {
    setFilters(prev => ({ ...prev, selectedEvents: selected }));
  }, []);

  const setDateRange = useCallback((range: { start: Date | null; end: Date | null }) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
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
      setSelectedEvents,
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
      setSelectedEvent
    }
  };
};
