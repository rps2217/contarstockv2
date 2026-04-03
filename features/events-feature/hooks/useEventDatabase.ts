import { useState, useMemo, useEffect, useCallback } from 'react';
import { db as firebaseDb } from '../../../src/lib/firebase';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { firebaseSyncService, handleFirestoreError, OperationType } from '../../../services/firebaseSyncService';
import { useAppStore } from '../../../store/useAppStore';
import { useToastStore } from '../../../store/useToastStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { normalizeSku } from '../../../services/utils';
import { Product } from '../../../types';

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
  const { addToast } = useToastStore.getState();

  const [preferences, setPreferences] = useState<EventPreferences>(() => {
    const saved = localStorage.getItem('event_preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cloudItems, setCloudItems] = useState<any[]>([]);

  const tableName = settings?.appSheetConfig?.eventsTableName || 'EVENTOS';

  const allProducts = useLiveQuery(() => productRepository.getAll(), []) || [];
  
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    allProducts.forEach(p => {
      const sku = normalizeSku(p.barcode);
      if (sku) map.set(sku, p);
    });
    return map;
  }, [allProducts]);

  useEffect(() => {
    const colRef = collection(firebaseDb, tableName);
    // Limitamos a 3000 registros para evitar saturar el SDK de Firestore
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(3000));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCloudItems(items);
    }, (error) => {
      console.error("Error en onSnapshot de Firestore:", error);
      try {
        handleFirestoreError(error, OperationType.GET, tableName);
      } catch (e) {
        addToast("Error al conectar con la base de datos en tiempo real", "error");
      }
    });

    return () => unsubscribe();
  }, [tableName]);

  const baseProcessedData = useMemo(() => {
    const eventMapping = settings?.appSheetConfig?.mappings?.events;
    return (cloudItems || [])
      .filter(record => {
        const exp = record;
        const eventValue = eventMapping?.event ? exp[eventMapping.event] : (exp.EVENTO || exp.event);
        return String(eventValue || "").toUpperCase() !== 'VENCIMIENTOS';
      })
      .map(record => {
        const exp = record;
        const barcode = eventMapping?.barcode ? exp[eventMapping.barcode] : (exp.SKU || exp.barcode);
        const product = productMap.get(normalizeSku(barcode || ''));
        const productName = product?.name || (eventMapping?.name ? exp[eventMapping.name] : (exp.DESCRIPTOR || exp.productName)) || 'Producto Desconocido';
        const providerName = product?.supplier || (eventMapping?.supplier ? exp[eventMapping.supplier] : (exp.PROVEEDOR || exp.supplier)) || 'N/A';
        
        return {
          id: record.id,
          barcode,
          productName,
          providerName,
          event: eventMapping?.event ? exp[eventMapping.event] : (exp.EVENTO || exp.event || 'OTRO'),
          quantity: eventMapping?.quantity ? exp[eventMapping.quantity] : (exp.CANTIDAD || exp.quantity || 0),
          location: eventMapping?.location ? exp[eventMapping.location] : (exp.UBICACION || exp.location || 'GENERAL'),
          frc: eventMapping?.frc ? exp[eventMapping.frc] : (exp.FRC || exp.frc || ''),
          nguia: eventMapping?.nguia ? exp[eventMapping.nguia] : (exp.NGUIA || exp.nguia || ''),
          timestamp: record.timestamp || Date.now(),
          claveUnica: exp.claveUnica,
          category: product?.category || 'GENERAL',
          isAdjusted: !!(exp.traspaso && exp.traspaso.trim() !== ''),
          mm: exp.MM,
          yyyy: exp.YYYY,
          syncStatus: 'synced',
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [cloudItems, settings?.appSheetConfig?.mappings?.events, productMap]);

  const handleRemoveItem = useCallback(async (item: any) => {
    try {
      await firebaseSyncService.deleteRemote(tableName, item.id);
      addToast('Ítem retirado correctamente', 'success');
    } catch (error: any) {
      addToast(`Error al retirar el ítem: ${error.message}`, 'error');
    }
  }, [tableName]);

  const handleBulkRemove = useCallback(async (ids: Set<string>) => {
    try {
      for (const id of ids) {
        await firebaseSyncService.deleteRemote(tableName, id);
      }
      setSelectedIds(new Set());
      addToast(`${ids.size} ítems retirados correctamente`, 'success');
    } catch (error) {
      addToast('Error al retirar los ítems', 'error');
    }
  }, [tableName]);

  const handleAddItem = useCallback(async (data: any) => {
    try {
      const shortId = Math.random().toString(16).substring(2, 10);
      const now = new Date();
      
      const rowData = {
        id: shortId,
        timestamp: now.toISOString(),
        ...data,
        event: data.event || 'OTRO'
      };

      await firebaseSyncService.pushChange(tableName, shortId, rowData);
      addToast('Guardado en la nube correctamente.', 'success');
      return shortId;
    } catch (error: any) {
      addToast(`Error al registrar: ${error.message}`, 'error');
    }
  }, [tableName]);

  const handleUpdatePreferences = useCallback((newPrefs: Partial<EventPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }));
    localStorage.setItem('event_preferences', JSON.stringify({ ...preferences, ...newPrefs }));
  }, [preferences]);

  const processedEvents = useMemo(() => {
    let filtered = baseProcessedData;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.productName.toLowerCase().includes(q) || 
        e.barcode.toLowerCase().includes(q) ||
        e.providerName.toLowerCase().includes(q)
      );
    }
    if (selectedEvents.length > 0) {
      filtered = filtered.filter(e => selectedEvents.includes(e.event));
    }
    return filtered;
  }, [baseProcessedData, searchQuery, selectedEvents]);

  return {
    state: {
      searchQuery,
      selectedEvents,
      selectedIds,
      allItems: baseProcessedData,
      preferences,
      processedEvents: processedEvents,
      pendingEvents: processedEvents.filter(e => !e.isAdjusted),
      adjustedEvents: processedEvents.filter(e => e.isAdjusted),
      totalCount: baseProcessedData.length,
      filteredCount: processedEvents.length,
      pendingCount: processedEvents.filter(i => !i.isAdjusted).length,
      adjustedCount: processedEvents.filter(i => i.isAdjusted).length,
      priorityStats: { priorityItems: [], eventAlerts: [], suggestedActions: [] },
      eventTypes: Array.from(new Set(baseProcessedData.map(i => i.event))),
      pendingOperations: 0
    },
    actions: {
      setSearchQuery,
      setSelectedEvents,
      setSelectedIds,
      handleRemoveItem,
      handleBulkRemove,
      handleAddItem,
      handleUpdatePreferences,
      clearLocalData: async () => {
        setSearchQuery('');
        setSelectedEvents([]);
        setSelectedIds(new Set());
      },
      updateEventBulkFieldsMany: async (ids: string[], updates: any) => {
        try {
          for (const id of ids) {
            await firebaseSyncService.pushChange(tableName, id, updates);
          }
          addToast(`${ids.length} eventos actualizados`, 'success');
        } catch (error: any) {
          addToast(`Error al actualizar eventos: ${error.message}`, 'error');
        }
      },
      clearSelection: () => setSelectedIds(new Set()),
      updateEvent: async (id: string, data: any) => {
        try {
          await firebaseSyncService.pushChange(tableName, id, data);
          addToast('Evento actualizado', 'success');
        } catch (error: any) {
          addToast(`Error al actualizar evento: ${error.message}`, 'error');
        }
      },
      createEvent: async (data: any) => {
        return handleAddItem(data);
      },
      setPendingOperations: (op: any) => {},
      deleteEvent: async (id: string) => {
        try {
          await firebaseSyncService.deleteRemote(tableName, id);
          addToast('Evento eliminado', 'success');
        } catch (error: any) {
          addToast(`Error al eliminar evento: ${error.message}`, 'error');
        }
      },
      updateEventStatus: async (id: string, isAdjusted: boolean) => {
        try {
          await firebaseSyncService.pushChange(tableName, id, { isAdjusted });
          addToast('Estado actualizado', 'success');
        } catch (error: any) {
          addToast(`Error al actualizar estado: ${error.message}`, 'error');
        }
      },
      handleToggleSelect: (id: string) => {
        setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      handleSelectAll: () => {
        if (selectedIds.size === processedEvents.length) {
          setSelectedIds(new Set());
        } else {
          setSelectedIds(new Set(processedEvents.map(e => e.id)));
        }
      },
      updateEventDestino: async (id: string, destino: string) => {
        try {
          await firebaseSyncService.pushChange(tableName, id, { destino });
          addToast('Destino actualizado', 'success');
        } catch (error: any) {
          addToast(`Error al actualizar destino: ${error.message}`, 'error');
        }
      },
      togglePreference: (prefs: Partial<EventPreferences>) => {
        setPreferences(prev => ({ ...prev, ...prefs }));
      }
    }
  };
};
