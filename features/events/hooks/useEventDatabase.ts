import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Product } from '../../../types';
import { normalizeSku } from '../../../services/utils';
import { useAppStore } from '../../../store/useAppStore';
import { addExpirationToCloud } from '../../../services/expirySync';

export interface EventPreferences {
  compactView: boolean;
}

const DEFAULT_PREFERENCES: EventPreferences = {
  compactView: false
};

export const useEventDatabase = () => {
  const { settings } = useAppStore();

  const [preferences, setPreferences] = useState<EventPreferences>(() => {
    const saved = localStorage.getItem('event_preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingOperations, setPendingOperations] = useState(0);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
          category: product?.category || 'GENERAL',
          isAdjusted: exp.isAdjusted || false,
          frc: exp.frc,
          erp: exp.erp,
          nguia: exp.nguia,
          destino: exp.destino
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
        item.event.toLowerCase().includes(query) ||
        (item.frc && item.frc.toLowerCase().includes(query)) ||
        (item.erp && item.erp.toLowerCase().includes(query));
      
      const matchesEvent = selectedEvents.length === 0 || selectedEvents.includes(item.event.toUpperCase());

      return matchesSearch && matchesEvent;
    });
  }, [baseProcessedData, debouncedSearch, selectedEvents]);

  const pendingEvents = useMemo(() => 
    processedEvents.filter(e => !e.isAdjusted),
    [processedEvents]
  );

  const adjustedEvents = useMemo(() => 
    processedEvents.filter(e => e.isAdjusted),
    [processedEvents]
  );

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
    const allIds = processedEvents.map(i => i.id);
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const priorityStats = useMemo(() => {
    if (!baseProcessedData) return { priorityItems: [], eventAlerts: [], suggestedActions: [] };

    const pendingItems = baseProcessedData.filter(i => !i.isAdjusted);
    
    // Priority items: highest quantity pending items
    const priorityItems = [...pendingItems]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Event alerts: count per event type for pending items
    const eventCounts: Record<string, number> = {};
    pendingItems.forEach(item => {
      const type = item.event.toUpperCase();
      eventCounts[type] = (eventCounts[type] || 0) + 1;
    });

    const eventAlerts = Object.entries(eventCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Suggested actions based on event types
    const suggestedActions = [];
    
    const diffInv = pendingItems.filter(i => i.event.toUpperCase().includes('DIF.'));
    if (diffInv.length > 0) {
      suggestedActions.push({
        title: 'Conciliación de Inventario',
        description: `Hay ${diffInv.length} diferencias en pedidos que requieren ajuste.`,
        count: diffInv.length,
        type: 'inventory_diff'
      });
    }

    const calidad = pendingItems.filter(i => i.event.toUpperCase().includes('CALIDAD'));
    if (calidad.length > 0) {
      suggestedActions.push({
        title: 'Control de Calidad',
        description: `Se detectaron ${calidad.length} registros de deterioro de calidad pendientes.`,
        count: calidad.length,
        type: 'quality'
      });
    }

    const vence = pendingItems.filter(i => i.event.toUpperCase().includes('VENCE'));
    if (vence.length > 0) {
      suggestedActions.push({
        title: 'Vencimientos Cercanos',
        description: `Existen ${vence.length} productos con vencimiento cercano para gestionar.`,
        count: vence.length,
        type: 'expiry'
      });
    }

    return {
      priorityItems,
      eventAlerts,
      suggestedActions
    };
  }, [baseProcessedData]);

  return {
    state: {
      preferences,
      searchQuery,
      selectedEvents,
      selectedIds,
      processedEvents,
      pendingEvents,
      adjustedEvents,
      eventTypes,
      totalCount: baseProcessedData.length,
      filteredCount: processedEvents.length,
      pendingCount: baseProcessedData.filter(i => !i.isAdjusted).length,
      adjustedCount: baseProcessedData.filter(i => i.isAdjusted).length,
      priorityStats,
      pendingOperations
    },
    actions: {
      setSearchQuery,
      setSelectedEvents,
      togglePreference,
      handleToggleSelect,
      handleSelectAll,
      clearSelection: () => setSelectedIds(new Set()),
      setPendingOperations,
      updateEventStatus: async (id: string, isAdjusted: boolean) => {
        await db.cloudExpirations.update(id, { isAdjusted });
      },
      updateEventDestino: async (id: string, destino: string) => {
        await db.cloudExpirations.update(id, { destino });
      },
      createEvent: async (data: {
        barcode: string;
        productName: string;
        event: string;
        quantity: number;
        frc: string;
        nguia: string;
        destino?: string;
      }) => {
        const claveUnica = `${normalizeSku(data.barcode)}${data.frc}`;
        const newEvent = {
          id: crypto.randomUUID(),
          barcode: normalizeSku(data.barcode),
          productName: data.productName,
          event: data.event,
          quantity: data.quantity,
          frc: data.frc,
          nguia: data.nguia,
          destino: data.destino || settings.selectedDestino,
          claveUnica,
          timestamp: Date.now(),
          isAdjusted: false,
          mm: new Date().getMonth() + 1,
          yyyy: new Date().getFullYear(),
          location: 'GENERAL'
        };

        await db.cloudExpirations.add(newEvent);
        
        // Sync to cloud
        setPendingOperations(p => p + 1);
        addExpirationToCloud({
          barcode: newEvent.barcode,
          productName: newEvent.productName,
          mm: newEvent.mm,
          yyyy: newEvent.yyyy,
          quantity: newEvent.quantity,
          event: newEvent.event,
          frc: newEvent.frc,
          nguia: newEvent.nguia,
          claveUnica: newEvent.claveUnica,
          destino: newEvent.destino
        })
        .finally(() => {
          setPendingOperations(p => Math.max(0, p - 1));
        });

        return newEvent;
      }
    }
  };
};
