import { useState, useMemo, useEffect, useCallback } from 'react';
import { db as firebaseDb } from '../../../lib/firebase';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { firebaseSyncService, handleFirestoreError, OperationType } from '../../../services/firebaseSyncService';
import { useAppStore } from '@/store/mainAppStore';
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
        
        // Helper to find field in record with multiple fallbacks
        const getField = (mappingKey: string | undefined, fallbacks: string[]) => {
          if (mappingKey && exp[mappingKey] !== undefined) return exp[mappingKey];
          for (const key of fallbacks) {
            if (exp[key] !== undefined) return exp[key];
          }
          return undefined;
        };

        const barcode = String(getField(eventMapping?.barcode, ['SKU', 'sku', 'barcode', 'BARCODE', 'codigo', 'CODIGO', 'Codigo', 'EAN', 'ean', 'UPC', 'upc']) || '').trim();
        const product = productMap.get(normalizeSku(barcode));
        
        const productName = product?.name || 
          getField(eventMapping?.name, ['DESCRIPTOR', 'descriptor', 'productName', 'PRODUCTO', 'producto', 'Name', 'name', 'DESCRIPCION', 'descripcion']) || 
          'Producto Desconocido';
          
        const providerName = product?.supplier || 
          getField(eventMapping?.supplier, ['PROVEEDOR', 'proveedor', 'supplier', 'SUPPLIER', 'Proveedor', 'Provider', 'FABRICANTE', 'fabricante']) || 
          'N/A';
        
        const eventValue = getField(eventMapping?.event, ['EVENTO', 'evento', 'event', 'EVENT', 'Tipo', 'TIPO', 'MOTIVO', 'motivo']) || 'OTRO';
        const quantityValue = getField(eventMapping?.quantity, ['CANTIDAD', 'cantidad', 'quantity', 'QUANTITY', 'Cant', 'CANT', 'QTY', 'qty']) || 0;
        const locationValue = getField(eventMapping?.location, ['UBICACION', 'ubicacion', 'location', 'LOCATION', 'Ubic', 'UBIC', 'SITIO', 'sitio']) || 'GENERAL';
        const frcValue = getField(eventMapping?.frc, ['FRC', 'frc', 'folio', 'FOLIO', 'folio_frc', 'FOLIO_FRC', 'Folio', 'FRC_FOLIO', 'folio_frc']) || '';
        const nguiaValue = getField(eventMapping?.nguia, ['NGUIA', 'nguia', 'guia', 'GUIA', 'n_guia', 'N_GUIA', 'GUIA_NUM', 'guia_num']) || '';

        return {
          id: record.id,
          barcode,
          productName,
          providerName,
          event: eventValue,
          quantity: quantityValue,
          location: locationValue,
          frc: frcValue,
          nguia: nguiaValue,
          timestamp: record.timestamp || Date.now(),
          claveUnica: exp.claveUnica,
          category: product?.category || 'GENERAL',
          isAdjusted: !!(exp.traspaso && String(exp.traspaso).trim() !== ''),
          mm: exp.MM || exp.mm,
          yyyy: exp.YYYY || exp.yyyy,
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
      const normalizedQ = normalizeSku(searchQuery);
      
      filtered = filtered.filter(e => 
        String(e.productName || '').toLowerCase().includes(q) || 
        String(e.barcode || '').toLowerCase().includes(q) ||
        (normalizedQ && String(e.barcode || '').includes(normalizedQ)) ||
        String(e.providerName || '').toLowerCase().includes(q) ||
        String(e.frc || '').toLowerCase().includes(q)
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

// Forced GitHub sync
