import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Product } from '../../../types';
import { normalizeSku } from '../../../services/utils';
import { useAppStore } from '../../../store/useAppStore';
import { addExpirationToCloud, removeExpirationFromCloud, bulkAddExpirationsToCloud } from '../../../services/expirySync';

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

  const cloudExpirations = useLiveQuery(() => db.cloudExpirations.toArray());
  const products = useLiveQuery(() => db.products.toArray());

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products?.forEach(p => map.set(normalizeSku(p.barcode), p));
    return map;
  }, [products]);

  const baseProcessedData = useMemo(() => {
    if (!cloudExpirations) return [];

    return cloudExpirations
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
          destino: exp.destino,
          traspaso: exp.traspaso,
          observaciones: exp.observaciones,
          mm: exp.mm,
          yyyy: exp.yyyy,
          syncStatus: exp.syncStatus || 'synced',
          syncError: exp.syncError
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [cloudExpirations, productMap]);

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
      const result = await addExpirationToCloud(payload);
      const syncStatus = (result as any).queued ? 'pending' : 'synced';
      await db.cloudExpirations.update(id, { syncStatus, syncError: undefined });
    } catch (error: any) {
      await db.cloudExpirations.update(id, { syncStatus: 'error', syncError: error.message });
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
      await db.cloudExpirations.update(id, { isAdjusted });
      const item = await db.cloudExpirations.get(id);
      if (item) {
        await syncToCloud(id, getSyncPayload(item));
      }
    },
    updateEventBulkFields: async (id: string, updates: { destino?: string; traspaso?: string; observaciones?: string }) => {
      const item = await db.cloudExpirations.get(id);
      if (!item) return;
      
      const newUpdates: any = { ...updates };
      if (updates.traspaso && updates.traspaso.trim() !== '') {
        newUpdates.isAdjusted = true;
      }
      
      await db.cloudExpirations.update(id, newUpdates);
      
      // Sincronizar a la nube
      const updated = await db.cloudExpirations.get(id);
      if (updated) {
        await syncToCloud(id, getSyncPayload(updated));
      }
    },
    updateEventBulkFieldsMany: async (ids: string[], updates: { destino?: string; traspaso?: string; observaciones?: string }) => {
      setPendingOperations(p => p + ids.length);
      try {
        const itemsToUpdate = [];
        for (const id of ids) {
          const item = await db.cloudExpirations.get(id);
          if (item) {
            const newUpdates: any = { ...updates };
            if (updates.traspaso && updates.traspaso.trim() !== '') {
              newUpdates.isAdjusted = true;
            }
            await db.cloudExpirations.update(id, newUpdates);
            const updated = await db.cloudExpirations.get(id);
            if (updated) {
              itemsToUpdate.push(getSyncPayload(updated));
            }
          }
        }
        
        if (itemsToUpdate.length > 0) {
          await bulkAddExpirationsToCloud(itemsToUpdate);
        }
      } finally {
        setPendingOperations(p => Math.max(0, p - ids.length));
      }
    },
    updateEventDestino: async (id: string, destino: string) => {
      const item = await db.cloudExpirations.get(id);
      if (!item) return;
      
      const updated = { ...item, destino };
      await db.cloudExpirations.put(updated);
      
      // Sincronizar a la nube
      await syncToCloud(id, getSyncPayload(updated));
    },
    updateEventTraspaso: async (id: string, traspaso: string) => {
      const item = await db.cloudExpirations.get(id);
      if (!item) return;
      
      const updates: any = { traspaso };
      if (traspaso && traspaso.trim() !== '') {
        updates.isAdjusted = true;
      }
      await db.cloudExpirations.update(id, updates);
      
      // Sincronizar a la nube
      const updated = await db.cloudExpirations.get(id);
      if (updated) {
        await syncToCloud(id, getSyncPayload(updated));
      }
    },
    updateEventObservaciones: async (id: string, observaciones: string) => {
      const item = await db.cloudExpirations.get(id);
      if (!item) return;
      await db.cloudExpirations.update(id, { observaciones });
      
      // Sincronizar a la nube
      const updated = await db.cloudExpirations.get(id);
      if (updated) {
        await syncToCloud(id, getSyncPayload(updated));
      }
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
      const oldEvent = await db.cloudExpirations.get(id);
      if (!oldEvent) throw new Error('Evento no encontrado');

      const claveUnica = `${normalizeSku(data.barcode)}${data.frc}`;
      const updatedEvent = {
        ...oldEvent,
        barcode: normalizeSku(data.barcode),
        productName: data.productName,
        event: data.event,
        quantity: data.quantity,
        frc: data.frc,
        nguia: data.nguia,
        destino: data.destino || '',
        traspaso: data.traspaso,
        observaciones: data.observaciones,
        isAdjusted: (data.traspaso && data.traspaso.trim() !== '') ? true : oldEvent.isAdjusted,
        claveUnica,
        timestamp: Date.now(), // Actualizamos timestamp para que suba en la lista
      };

      await db.cloudExpirations.put(updatedEvent);

      // Siempre intentamos eliminar la versión anterior en la nube si es una actualización
      // para evitar duplicados si el script de GAS solo hace append.
      if (oldEvent.claveUnica) {
        setPendingOperations(p => p + 1);
        removeExpirationFromCloud(oldEvent.claveUnica).finally(() => {
          // Después de eliminar (o intentar eliminar), enviamos la nueva versión
          syncToCloud(id, getSyncPayload(updatedEvent))
          .finally(() => {
            setPendingOperations(p => Math.max(0, p - 1));
          });
        });
      } else {
        // Si no tenía clave única previa, solo sincronizamos
        setPendingOperations(p => p + 1);
        syncToCloud(id, getSyncPayload(updatedEvent))
        .finally(() => {
          setPendingOperations(p => Math.max(0, p - 1));
        });
      }

      return updatedEvent;
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
      const newEvent = {
        id: crypto.randomUUID(),
        barcode: normalizeSku(data.barcode),
        productName: data.productName,
        event: data.event,
        quantity: data.quantity,
        frc: data.frc,
        nguia: data.nguia,
        destino: data.destino || '',
        traspaso: data.traspaso,
        observaciones: data.observaciones,
        isAdjusted: (data.traspaso && data.traspaso.trim() !== ''),
        claveUnica,
        timestamp: Date.now(),
        mm: new Date().getMonth() + 1,
        yyyy: new Date().getFullYear(),
        location: 'GENERAL',
        syncStatus: 'pending' as const
      };

      await db.cloudExpirations.add(newEvent);
      
      // Sync to cloud
      setPendingOperations(p => p + 1);
      syncToCloud(newEvent.id, getSyncPayload(newEvent))
      .finally(() => {
        setPendingOperations(p => Math.max(0, p - 1));
      });

      return newEvent;
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
