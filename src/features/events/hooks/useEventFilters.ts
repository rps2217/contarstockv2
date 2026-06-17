/**
 * useEventFilters - Hook para filtros y búsqueda de eventos
 * 
 * Maneja búsqueda global, filtros por tipo de evento, rango de fechas,
 * y selección de items.
 */

import { useState, useMemo, useCallback } from 'react';
import { useGlobalSearch } from '../../../hooks/useGlobalSearch';

export interface EventPreferences {
  compactView: boolean;
  showPriorityAssistant: boolean;
}

const DEFAULT_PREFERENCES: EventPreferences = {
  compactView: false,
  showPriorityAssistant: true
};

interface ProcessedEvent {
  id: string;
  barcode: string;
  productName: string;
  providerName: string;
  event: string;
  quantity: number;
  location: string;
  frc: string;
  nguia: string;
  destino: string;
  traspaso: string;
  observaciones: string;
  timestamp: number;
  claveUnica: string;
  category: string;
  isAdjusted: boolean;
  syncStatus: string;
}

interface UseEventFiltersProps {
  baseProcessedData: ProcessedEvent[];
}

interface UseEventFiltersReturn {
  // Estado de filtros
  searchQuery: string;
  selectedEvents: string[];
  selectedIds: Set<string>;
  dateRange: { start: string | null; end: string | null };
  preferences: EventPreferences;
  
  // Acciones de filtros
  setSearchQuery: (query: string) => void;
  setSelectedEvents: (events: string[]) => void;
  setSelectedIds: (ids: Set<string>) => void;
  setDateRange: (range: { start: string | null; end: string | null }) => void;
  setPreferences: (prefs: Partial<EventPreferences>) => void;
  togglePreference: (prefs: Partial<EventPreferences>) => void;
  
  // Acciones de selección
  handleToggleSelect: (id: string) => void;
  handleSelectAll: (allEvents: ProcessedEvent[]) => void;
  clearSelection: () => void;
  clearLocalData: () => void;
  
  // Datos filtrados
  processedEvents: ProcessedEvent[];
  pendingEvents: ProcessedEvent[];
  destinedEvents: ProcessedEvent[];
  adjustedEvents: ProcessedEvent[];
  
  // Stats
  totalCount: number;
  filteredCount: number;
  pendingCount: number;
  destinedCount: number;
  adjustedCount: number;
  eventTypes: string[];
}

export function useEventFilters({ baseProcessedData }: UseEventFiltersProps): UseEventFiltersReturn {
  // Estado de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ 
    start: null, 
    end: null 
  });
  
  const [preferences, setPreferencesState] = useState<EventPreferences>(() => {
    const saved = localStorage.getItem('event_preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });

  // Búsqueda global
  const searchResults = useGlobalSearch(baseProcessedData, [
    'productName',
    'barcode',
    'providerName',
    'event',
    'location',
    'frc',
    'nguia',
    'destino',
    'traspaso',
    'observaciones',
    'category'
  ], searchQuery);

  // Aplicar filtros adicionales
  const processedEvents = useMemo(() => {
    let filtered = searchResults;

    if (selectedEvents.length > 0) {
      filtered = filtered.filter(e => selectedEvents.includes(e.event));
    }
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(e => {
        const itemDate = new Date(e.timestamp);
        if (dateRange.start && itemDate < new Date(dateRange.start)) return false;
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          if (itemDate > endDate) return false;
        }
        return true;
      });
    }
    return filtered;
  }, [searchResults, selectedEvents, dateRange]);

  // Eventos pendientes (sin destino)
  const pendingEvents = useMemo(() => 
    processedEvents.filter(e => 
      !e.isAdjusted && (!e.destino || String(e.destino).trim() === '')
    ), 
  [processedEvents]);

  // Eventos con destino asignado
  const destinedEvents = useMemo(() => 
    processedEvents.filter(e => 
      !e.isAdjusted && e.destino && String(e.destino).trim() !== ''
    ), 
  [processedEvents]);

  // Eventos ajustados (traspasados)
  const adjustedEvents = useMemo(() => 
    processedEvents.filter(e => e.isAdjusted), 
  [processedEvents]);

  // Actualizar preferencias con persistencia
  const setPreferences = useCallback((newPrefs: Partial<EventPreferences>) => {
    setPreferencesState(prev => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('event_preferences', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const togglePreference = useCallback((prefs: Partial<EventPreferences>) => {
    setPreferences(prefs);
  }, [setPreferences]);

  // Acciones de selección
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((allEvents: ProcessedEvent[]) => {
    if (selectedIds.size === allEvents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allEvents.map(e => e.id)));
    }
  }, [selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const clearLocalData = useCallback(() => {
    setSearchQuery('');
    setSelectedEvents([]);
    setSelectedIds(new Set());
  }, []);

  // Stats
  const totalCount = baseProcessedData.length;
  const filteredCount = processedEvents.length;
  const pendingCount = processedEvents.filter(i => 
    !i.isAdjusted && (!i.destino || String(i.destino).trim() === '')
  ).length;
  const destinedCount = processedEvents.filter(i => 
    !i.isAdjusted && i.destino && String(i.destino).trim() !== ''
  ).length;
  const adjustedCount = processedEvents.filter(i => i.isAdjusted).length;
  const eventTypes = Array.from(new Set(baseProcessedData.map(i => i.event)));

  return {
    // Estado
    searchQuery,
    selectedEvents,
    selectedIds,
    dateRange,
    preferences,
    
    // Acciones de filtros
    setSearchQuery,
    setSelectedEvents,
    setSelectedIds,
    setDateRange,
    setPreferences,
    togglePreference,
    
    // Acciones de selección
    handleToggleSelect,
    handleSelectAll: (events: ProcessedEvent[]) => handleSelectAll(events),
    clearSelection,
    clearLocalData,
    
    // Datos filtrados
    processedEvents,
    pendingEvents,
    destinedEvents,
    adjustedEvents,
    
    // Stats
    totalCount,
    filteredCount,
    pendingCount,
    destinedCount,
    adjustedCount,
    eventTypes,
  };
}
