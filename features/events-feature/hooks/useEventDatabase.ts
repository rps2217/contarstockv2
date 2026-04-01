import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Product } from '../../../types';
import { normalizeSku } from '../../../services/utils';
import { useAppStore } from '../../../store/useAppStore';
import { useToastStore } from '../../../store/useToastStore';
import { cloudApi } from '../../../services/cloud/apiClient';
import { dynamicSyncService } from '../../../services/dynamicSync';
import { dynamicDataService } from '../../../services/dynamicDataService';

export interface EventPreferences {
  compactView: boolean;
  showPriorityAssistant: boolean;
}

const DEFAULT_PREFERENCES: EventPreferences = {
  compactView: false,
  showPriorityAssistant: true
};

import { resolveUnknownProducts } from '../../../services/productService';

export const useEventDatabase = () => {
  const { settings } = useAppStore();
  const { addToast } = useToastStore.getState();
  const [isSyncing, setIsSyncing] = useState(false);

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

  const { dynamicEvents, productMap, providerMap } = useLiveQuery(async () => {
    const dynamicEventsData = await db.dynamic_data.where('tableName').equals(tableName).toArray();
    
    const eventMapping = settings?.appSheetConfig?.mappings?.events;
    const skus = new Set<string>();
    const ruts = new Set<string>();
    
    dynamicEventsData.forEach(record => {
      const exp = record.data;
      const eventValue = eventMapping?.event ? exp[eventMapping.event] : (exp.EVENTO || exp.event);
      if (String(eventValue || "").toUpperCase() !== 'VENCIMIENTOS') {
        const barcode = eventMapping?.barcode ? exp[eventMapping.barcode] : (exp.SKU || exp.barcode);
        if (barcode) {
          skus.add(normalizeSku(barcode));
        }
        const rut = eventMapping?.supplierRut ? exp[eventMapping.supplierRut] : (exp.RUT_PROVEEDOR || exp.supplierRut);
        if (rut) ruts.add(normalizeSku(rut));
      }
    });

    const [productsData, providersData] = await Promise.all([
      db.products.where('barcode').anyOf(Array.from(skus)).toArray(),
      db.providers.where('rut').anyOf(Array.from(ruts)).toArray()
    ]);

    const pMap = new Map<string, Product>();
    productsData.forEach(p => pMap.set(normalizeSku(p.barcode), p));

    const provMap = new Map<string, any>();
    providersData.forEach(p => provMap.set(normalizeSku(p.rut), p));

    return { dynamicEvents: dynamicEventsData, productMap: pMap, providerMap: provMap };
  }, [tableName, settings?.appSheetConfig?.mappings?.events]) || { dynamicEvents: [], productMap: new Map(), providerMap: new Map() };

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
        
        const rut = eventMapping?.supplierRut ? exp[eventMapping.supplierRut] : (exp.RUT_PROVEEDOR || exp.supplierRut);
        const provider = providerMap.get(normalizeSku(rut || ''));
        const providerName = provider?.name || 
                             product?.supplier || 
                             (eventMapping?.supplier ? exp[eventMapping.supplier] : (exp.PROVEEDOR || exp.supplier)) || 
                             'N/A';

        return {
          id: record.id,
          barcode,
          productName,
          providerName,
          event: eventMapping?.event ? exp[eventMapping.event] : (exp.EVENTO || exp.event || 'OTRO'),
          quantity: eventMapping?.quantity ? exp[eventMapping.quantity] : (exp.CANTIDAD || exp.quantity || 0),
          location: eventMapping?.location ? exp[eventMapping.location] : (exp.UBICACION || exp.location || 'GENERAL'),
          timestamp: record.timestamp,
          claveUnica: exp.claveUnica,
          category: product?.category || 'GENERAL',
          isAdjusted: !!(eventMapping?.traspaso ? exp[eventMapping.traspaso] : (exp.TRASPASO || exp.traspaso || exp['DOC-TRAS-INTER'])),
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

  // MOTOR DETECTIVE: Resuelve 'Productos Desconocidos' en segundo plano para eventos
  useEffect(() => {
    if (!baseProcessedData || isSyncing || !settings?.appSheetConfig?.gasWebAppUrl) return;

    const unknownSkus = Array.from(new Set(
      baseProcessedData
        .filter(item => (item.productName === 'Producto Desconocido' || !item.productName))
        .map(item => normalizeSku(item.barcode))
    )).slice(0, 10);

    if (unknownSkus.length === 0) return;

    const timer = setTimeout(() => {
      resolveUnknownProducts(unknownSkus, settings.appSheetConfig);
    }, 1000);
    return () => clearTimeout(timer);
  }, [baseProcessedData, isSyncing, settings]);

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
      if (item.event) types.add(String(item.event).toUpperCase());
    });
    return Array.from(types).sort();
  }, [baseProcessedData]);

  const processedEvents = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    
    return baseProcessedData.filter(item => {
      const eventStr = String(item.event || '');
      const matchesSearch = 
        item.productName.toLowerCase().includes(query) ||
        item.barcode.includes(query) ||
        eventStr.toLowerCase().includes(query) ||
        (item.frc && item.frc.toLowerCase().includes(query)) ||
        (item.erp && item.erp.toLowerCase().includes(query));
      
      const matchesEvent = selectedEvents.length === 0 || selectedEvents.includes(eventStr.toUpperCase());

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
      const type = String(item.event || '').toUpperCase();
      eventCounts[type] = (eventCounts[type] || 0) + 1;
    });

    const eventAlerts = Object.entries(eventCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Suggested actions based on event types
    const suggestedActions = [];
    
    const diffInv = pendingItems.filter(i => String(i.event || '').toUpperCase().includes('DIF.'));
    if (diffInv.length > 0) {
      suggestedActions.push({
        title: 'Conciliación de Inventario',
        description: `Hay ${diffInv.length} diferencias en pedidos que requieren ajuste.`,
        count: diffInv.length,
        type: 'inventory_diff'
      });
    }

    const calidad = pendingItems.filter(i => String(i.event || '').toUpperCase().includes('CALIDAD'));
    if (calidad.length > 0) {
      suggestedActions.push({
        title: 'Control de Calidad',
        description: `Se detectaron ${calidad.length} registros de deterioro de calidad pendientes.`,
        count: calidad.length,
        type: 'quality'
      });
    }

    const vence = pendingItems.filter(i => String(i.event || '').toUpperCase().includes('VENCE'));
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
        const eventMapping = settings?.appSheetConfig?.mappings?.events;
        const isAdjustedKey = eventMapping?.isAdjusted || 'isAdjusted';
        const updatedData = { ...record.data, [isAdjustedKey]: isAdjusted };
        await dynamicDataService.saveRecord(tableName, updatedData, id);
      }
    },
    updateEventBulkFields: async (id: string, updates: { destino?: string; traspaso?: string; observaciones?: string }) => {
      const record = await db.dynamic_data.get(id);
      if (!record) return;
      
      const eventMapping = settings?.appSheetConfig?.mappings?.events;
      const mappedUpdates: any = {};
      
      if (updates.destino !== undefined) {
        mappedUpdates[eventMapping?.destino || 'DESTINO'] = updates.destino;
      }
      if (updates.traspaso !== undefined) {
        mappedUpdates[eventMapping?.traspaso || 'TRASPASO'] = updates.traspaso;
        mappedUpdates[eventMapping?.isAdjusted || 'isAdjusted'] = !!(updates.traspaso && updates.traspaso.trim() !== '');
      }
      if (updates.observaciones !== undefined) {
        mappedUpdates[eventMapping?.observaciones || 'OBSERVACIONES'] = updates.observaciones;
      }
      
      const updatedData = { ...record.data, ...mappedUpdates };
      await dynamicDataService.saveRecord(tableName, updatedData, id);
    },
    updateEventBulkFieldsMany: async (ids: string[], updates: { destino?: string; traspaso?: string; observaciones?: string }) => {
      setPendingOperations(p => p + ids.length);
      try {
        const eventMapping = settings?.appSheetConfig?.mappings?.events;
        for (const id of ids) {
          const record = await db.dynamic_data.get(id);
          if (record) {
            const mappedUpdates: any = {};
            
            if (updates.destino !== undefined) {
              mappedUpdates[eventMapping?.destino || 'DESTINO'] = updates.destino;
            }
            if (updates.traspaso !== undefined) {
              mappedUpdates[eventMapping?.traspaso || 'TRASPASO'] = updates.traspaso;
              mappedUpdates[eventMapping?.isAdjusted || 'isAdjusted'] = !!(updates.traspaso && updates.traspaso.trim() !== '');
            }
            if (updates.observaciones !== undefined) {
              mappedUpdates[eventMapping?.observaciones || 'OBSERVACIONES'] = updates.observaciones;
            }

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
      const eventMapping = settings?.appSheetConfig?.mappings?.events;
      const updatedData = { ...record.data, [eventMapping?.destino || 'DESTINO']: destino };
      await dynamicDataService.saveRecord(tableName, updatedData, id);
    },
    updateEventTraspaso: async (id: string, traspaso: string) => {
      const record = await db.dynamic_data.get(id);
      if (!record) return;
      
      const eventMapping = settings?.appSheetConfig?.mappings?.events;
      const traspasoKey = eventMapping?.traspaso || 'TRASPASO';
      const isAdjustedKey = eventMapping?.isAdjusted || 'isAdjusted';

      const updates: any = { 
        [traspasoKey]: traspaso,
        [isAdjustedKey]: !!(traspaso && traspaso.trim() !== '')
      };
      
      const updatedData = { ...record.data, ...updates };
      await dynamicDataService.saveRecord(tableName, updatedData, id);
    },
    updateEventObservaciones: async (id: string, observaciones: string) => {
      const record = await db.dynamic_data.get(id);
      if (!record) return;
      const eventMapping = settings?.appSheetConfig?.mappings?.events;
      const updatedData = { ...record.data, [eventMapping?.observaciones || 'OBSERVACIONES']: observaciones };
      await dynamicDataService.saveRecord(tableName, updatedData, id);
    },
    updateEvent: async (id: string, data: {
      barcode: string;
      productName: string;
      providerName?: string;
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

      const eventMapping = settings?.appSheetConfig?.mappings?.events;
      const claveUnica = `${normalizeSku(data.barcode)}${data.frc}`;
      const updatedData = {
        ...record.data,
        [eventMapping?.barcode || 'SKU']: normalizeSku(data.barcode),
        [eventMapping?.name || 'DESCRIPTOR']: data.productName,
        [eventMapping?.supplier || 'PROVEEDOR']: data.providerName || record.data[eventMapping?.supplier || 'PROVEEDOR'] || 'N/A',
        [eventMapping?.event || 'EVENTO']: data.event,
        [eventMapping?.quantity || 'CANTIDAD']: data.quantity,
        [eventMapping?.frc || 'FRC']: data.frc,
        [eventMapping?.nguia || 'NGUIA']: data.nguia,
        [eventMapping?.destino || 'DESTINO']: data.destino || '',
        [eventMapping?.traspaso || 'TRASPASO']: data.traspaso,
        [eventMapping?.observaciones || 'OBSERVACIONES']: data.observaciones,
        [eventMapping?.isAdjusted || 'isAdjusted']: !!(data.traspaso && data.traspaso.trim() !== ''),
        claveUnica,
        TIMESTAMP: Date.now(),
      };

      await dynamicDataService.saveRecord(tableName, updatedData, id);
      return { id, ...updatedData };
    },
    createEvent: async (data: {
      barcode: string;
      productName: string;
      providerName?: string;
      event: string;
      quantity: number;
      frc: string;
      nguia: string;
      destino?: string;
      traspaso?: string;
      observaciones?: string;
    }) => {
      const eventMapping = settings?.appSheetConfig?.mappings?.events;
      const claveUnica = `${normalizeSku(data.barcode)}${data.frc}`;
      const newEventData = {
        [eventMapping?.barcode || 'SKU']: normalizeSku(data.barcode),
        [eventMapping?.name || 'DESCRIPTOR']: data.productName,
        [eventMapping?.supplier || 'PROVEEDOR']: data.providerName || 'N/A',
        [eventMapping?.event || 'EVENTO']: data.event,
        [eventMapping?.quantity || 'CANTIDAD']: data.quantity,
        [eventMapping?.frc || 'FRC']: data.frc,
        [eventMapping?.nguia || 'NGUIA']: data.nguia,
        [eventMapping?.destino || 'DESTINO']: data.destino || '',
        [eventMapping?.traspaso || 'TRASPASO']: data.traspaso,
        [eventMapping?.observaciones || 'OBSERVACIONES']: data.observaciones,
        [eventMapping?.isAdjusted || 'isAdjusted']: !!(data.traspaso && data.traspaso.trim() !== ''),
        claveUnica,
        TIMESTAMP: Date.now(),
        MM: new Date().getMonth() + 1,
        YYYY: new Date().getFullYear(),
        UBICACION: 'GENERAL'
      };

      const id = await dynamicDataService.saveRecord(tableName, newEventData, claveUnica);
      return { id, ...newEventData };
    },
    clearLocalData: async () => {
      await db.dynamic_data.where('tableName').equals(tableName).delete();
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
