import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Product } from '../../../types';
import { normalizeSku } from '../../../services/utils';
import { useAppStore } from '../../../store/useAppStore';
import { dynamicDataService } from '../../../services/dynamicDataService';
import { dynamicSyncService } from '../../../services/dynamicSync';

export interface EventPreferences {
  compactView: boolean;
  showPriorityAssistant: boolean;
}

const DEFAULT_PREFERENCES: EventPreferences = {
  compactView: false,
  showPriorityAssistant: true
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

  const tableName = settings?.appSheetConfig?.eventsTableName || 'EVENTOS';

  // Nuevo Motor: Leer de dynamic_data en lugar de cloudExpirations
  const dynamicEvents = useLiveQuery(() => 
    db.dynamic_data.where('tableName').equals(tableName).toArray(),
    [tableName]
  );
  
  const products = useLiveQuery(() => db.products.toArray());

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products?.forEach(p => map.set(normalizeSku(p.barcode), p));
    return map;
  }, [products]);

  const baseProcessedData = useMemo(() => {
    if (!dynamicEvents) return [];

    const eventMapping = settings?.appSheetConfig?.mappings?.events;
    return dynamicEvents
      .filter(record => {
        const exp = record.data;
        const eventValue = eventMapping?.event ? exp[eventMapping.event] : (exp.EVENTO || exp.event);
        return String(eventValue || "").toUpperCase() !== 'VENCIMIENTOS';
      })
      .map(record => {
        const exp = record.data;
        const barcode = eventMapping?.barcode ? exp[eventMapping.barcode] : (exp.SKU || exp.barcode);
        const product = productMap.get(normalizeSku(barcode));
        const productName = product?.name || (eventMapping?.name ? exp[eventMapping.name] : (exp.DESCRIPTOR || exp.productName)) || 'Producto Desconocido';
        
        return {
          id: record.id,
          barcode,
          productName,
          event: eventMapping?.event ? exp[eventMapping.event] : (exp.EVENTO || exp.event || 'OTRO'),
          quantity: eventMapping?.quantity ? exp[eventMapping.quantity] : (exp.CANTIDAD || exp.quantity || 0),
          location: eventMapping?.location ? exp[eventMapping.location] : (exp.UBICACION || exp.location || 'GENERAL'),
          timestamp: record.timestamp,
          claveUnica: exp.claveUnica,
          category: product?.category || 'GENERAL',
          isAdjusted: !!(eventMapping?.traspaso ? exp[eventMapping.traspaso] : exp.TRASPASO) || !!(exp.isAdjusted || exp.AJUSTADO),
          frc: eventMapping?.frc ? exp[eventMapping.frc] : (exp.FRC || exp.frc),
          erp: eventMapping?.erp ? exp[eventMapping.erp] : (exp.ERP || exp.erp),
          nguia: eventMapping?.nguia ? exp[eventMapping.nguia] : (exp.NGUIA || exp.nguia),
          destino: eventMapping?.destino ? exp[eventMapping.destino] : (exp.DESTINO || exp.destino),
          traspaso: eventMapping?.traspaso ? exp[eventMapping.traspaso] : (exp.TRASPASO || exp.traspaso),
          observaciones: eventMapping?.observaciones ? exp[eventMapping.observaciones] : (exp.OBSERVACIONES || exp.observaciones),
          mm: eventMapping?.mm ? exp[eventMapping.mm] : (exp.MM || exp.mm),
          yyyy: eventMapping?.yyyy ? exp[eventMapping.yyyy] : (exp.YYYY || exp.yyyy),
          syncStatus: record.syncStatus || 'synced',
          syncError: record.syncError
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [dynamicEvents, productMap]);

  const getSyncPayload = (item: any) => ({
    id: item.id,
    barcode: item.barcode,
    productName: item.productName,
    mm: item.mm,
    yyyy: item.yyyy,
    quantity: item.quantity,
    event: item.event,
    frc: item.frc,
    nguia: item.nguia,
    claveUnica: item.claveUnica,
    destino: item.destino,
    traspaso: item.traspaso,
    observaciones: item.observaciones
  });

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

  const togglePreference = (prefs: Partial<EventPreferences>) => {
    setPreferences(prev => {
      const next = { ...prev, ...prefs };
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

  const syncToCloud = async (id: string, payload: any) => {
    try {
      await dynamicDataService.syncRecord(id);
    } catch (error: any) {
      console.error('Error syncing event:', error);
    }
  };

  const actions = {
    setSearchQuery,
    setSelectedEvents,
    togglePreference,
    handleToggleSelect,
    handleSelectAll,
    clearSelection: () => setSelectedIds(new Set()),
    setPendingOperations,
    updateEventStatus: async (id: string, isAdjusted: boolean) => {
      const record = await db.dynamic_data.get(id);
      if (record) {
        const updatedData = { ...record.data, isAdjusted };
        await dynamicDataService.saveRecord(tableName, updatedData, id);
      }
    },
    updateEventBulkFields: async (id: string, updates: { destino?: string; traspaso?: string; observaciones?: string }) => {
      const record = await db.dynamic_data.get(id);
      if (!record) return;
      
      const newUpdates: any = { ...updates };
      if (updates.traspaso && updates.traspaso.trim() !== '') {
        newUpdates.isAdjusted = true;
      }
      
      // Mapear campos a nombres del nuevo motor
      const mappedUpdates: any = {};
      if (updates.destino) mappedUpdates.DESTINO = updates.destino;
      if (updates.traspaso) mappedUpdates.TRASPASO = updates.traspaso;
      if (updates.observaciones) mappedUpdates.OBSERVACIONES = updates.observaciones;
      if (newUpdates.isAdjusted) mappedUpdates.isAdjusted = true;

      const updatedData = { ...record.data, ...mappedUpdates };
      await dynamicDataService.saveRecord(tableName, updatedData, id);
    },
    updateEventBulkFieldsMany: async (ids: string[], updates: { destino?: string; traspaso?: string; observaciones?: string }) => {
      setPendingOperations(p => p + ids.length);
      try {
        for (const id of ids) {
          const record = await db.dynamic_data.get(id);
          if (record) {
            const newUpdates: any = { ...updates };
            if (updates.traspaso && updates.traspaso.trim() !== '') {
              newUpdates.isAdjusted = true;
            }
            
            const mappedUpdates: any = {};
            if (updates.destino) mappedUpdates.DESTINO = updates.destino;
            if (updates.traspaso) mappedUpdates.TRASPASO = updates.traspaso;
            if (updates.observaciones) mappedUpdates.OBSERVACIONES = updates.observaciones;
            if (newUpdates.isAdjusted) mappedUpdates.isAdjusted = true;

            const updatedData = { ...record.data, ...mappedUpdates };
            await dynamicDataService.saveRecord(tableName, updatedData, id);
          }
        }
      } finally {
        setPendingOperations(p => Math.max(0, p - ids.length));
      }
    },
    updateEventDestino: async (id: string, destino: string) => {
      const record = await db.dynamic_data.get(id);
      if (!record) return;
      const updatedData = { ...record.data, DESTINO: destino };
      await dynamicDataService.saveRecord(tableName, updatedData, id);
    },
    updateEventTraspaso: async (id: string, traspaso: string) => {
      const record = await db.dynamic_data.get(id);
      if (!record) return;
      
      const updates: any = { TRASPASO: traspaso };
      if (traspaso && traspaso.trim() !== '') {
        updates.isAdjusted = true;
      }
      const updatedData = { ...record.data, ...updates };
      await dynamicDataService.saveRecord(tableName, updatedData, id);
    },
    updateEventObservaciones: async (id: string, observaciones: string) => {
      const record = await db.dynamic_data.get(id);
      if (!record) return;
      const updatedData = { ...record.data, OBSERVACIONES: observaciones };
      await dynamicDataService.saveRecord(tableName, updatedData, id);
    },
    updateEvent: async (id: string, data: {
      barcode: string;
      productName: string;
      event: string;
      quantity: number;
      frc: string;
      nguia: string;
      destino?: string;
      traspaso?: string;
      observaciones?: string;
    }) => {
      const record = await db.dynamic_data.get(id);
      if (!record) throw new Error('Evento no encontrado');

      const claveUnica = `${normalizeSku(data.barcode)}${data.frc}`;
      const updatedData = {
        ...record.data,
        SKU: normalizeSku(data.barcode),
        DESCRIPTOR: data.productName,
        EVENTO: data.event,
        CANTIDAD: data.quantity,
        FRC: data.frc,
        NGUIA: data.nguia,
        DESTINO: data.destino || '',
        TRASPASO: data.traspaso,
        OBSERVACIONES: data.observaciones,
        isAdjusted: (data.traspaso && data.traspaso.trim() !== '') ? true : record.data.isAdjusted,
        claveUnica,
        TIMESTAMP: Date.now(),
      };

      await dynamicDataService.saveRecord(tableName, updatedData, id);
      return { id, ...updatedData };
    },
    createEvent: async (data: {
      barcode: string;
      productName: string;
      event: string;
      quantity: number;
      frc: string;
      nguia: string;
      destino?: string;
      traspaso?: string;
      observaciones?: string;
    }) => {
      const claveUnica = `${normalizeSku(data.barcode)}${data.frc}`;
      const newEventData = {
        SKU: normalizeSku(data.barcode),
        DESCRIPTOR: data.productName,
        EVENTO: data.event,
        CANTIDAD: data.quantity,
        FRC: data.frc,
        NGUIA: data.nguia,
        DESTINO: data.destino || '',
        TRASPASO: data.traspaso,
        OBSERVACIONES: data.observaciones,
        isAdjusted: (data.traspaso && data.traspaso.trim() !== ''),
        claveUnica,
        TIMESTAMP: Date.now(),
        MM: new Date().getMonth() + 1,
        YYYY: new Date().getFullYear(),
        UBICACION: 'GENERAL'
      };

      const id = await dynamicDataService.saveRecord(tableName, newEventData, claveUnica);
      return { id, ...newEventData };
    }
  };

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
    actions
  };
};
