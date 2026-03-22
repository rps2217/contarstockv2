import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Product } from '../../../types';
import { normalizeSku } from '../../../services/utils';

export interface EventPreferences {
  compactView: boolean;
}

const DEFAULT_PREFERENCES: EventPreferences = {
  compactView: false
};

export const useEventDatabase = () => {
  const [preferences, setPreferences] = useState<EventPreferences>(() => {
    const saved = localStorage.getItem('event_preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setDisplayLimit(50);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset limit on filter change
  useEffect(() => {
    setDisplayLimit(50);
  }, [selectedEvents]);

  const cloudExpirations = useLiveQuery(() => db.cloudExpirations.toArray());
  const products = useLiveQuery(() => db.products.toArray());

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products?.forEach(p => map.set(normalizeSku(p.barcode), p));
    return map;
  }, [products]);

  const baseProcessedData = useMemo(() => {
    if (!cloudExpirations) return [];

    const cloudItems = cloudExpirations
      .filter(exp => {
        const ev = exp.event?.toUpperCase() || '';
        return ev && ev !== 'VENCIMIENTOS' && ev !== 'VENCIMIENTO';
      })
      .map(exp => {
        const product = productMap.get(normalizeSku(exp.barcode));
        const productName = product?.name || exp.productName || 'Producto Desconocido';
        
        return {
          id: exp.id,
          barcode: exp.barcode,
          productName,
          event: exp.event || 'OTRO',
          quantity: exp.quantity || 0,
          location: exp.location || 'N/A',
          timestamp: exp.timestamp,
          claveUnica: exp.claveUnica,
          category: product?.category || 'GENERAL'
        };
      });

    return cloudItems.sort((a, b) => b.timestamp - a.timestamp);
  }, [cloudExpirations, productMap]);

  const eventTypes = useMemo(() => {
    const types = new Set<string>();
    baseProcessedData.forEach(item => {
      if (item.event) types.add(item.event.toUpperCase());
    });
    return Array.from(types).sort();
  }, [baseProcessedData]);

  const processedEvents = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    
    return baseProcessedData.filter(item => {
      const matchesSearch = 
        item.productName.toLowerCase().includes(query) ||
        item.barcode.includes(query) ||
        item.event.toLowerCase().includes(query);
      
      const matchesEvent = selectedEvents.length === 0 || selectedEvents.includes(item.event.toUpperCase());

      return matchesSearch && matchesEvent;
    });
  }, [baseProcessedData, debouncedSearch, selectedEvents]);

  const togglePreference = (key: keyof EventPreferences) => {
    setPreferences(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('event_preferences', JSON.stringify(next));
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === processedEvents.slice(0, displayLimit).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedEvents.slice(0, displayLimit).map(i => i.id)));
    }
  };

  return {
    state: {
      preferences,
      searchQuery,
      selectedEvents,
      displayLimit,
      selectedIds,
      processedEvents,
      eventTypes,
      totalCount: baseProcessedData.length,
      filteredCount: processedEvents.length
    },
    actions: {
      setSearchQuery,
      setSelectedEvents,
      setDisplayLimit,
      togglePreference,
      handleToggleSelect,
      handleSelectAll,
      clearSelection: () => setSelectedIds(new Set())
    }
  };
};
