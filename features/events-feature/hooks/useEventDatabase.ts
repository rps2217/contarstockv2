import { useState, useMemo, useEffect, useCallback } from 'react';
import { db as firebaseDb } from '../../../src/lib/firebase';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { firebaseSyncService, handleFirestoreError, OperationType } from '../../../services/firebaseSyncService';
import { useAppStore } from '../../../store/useAppStore';
import { useToastStore } from '../../../store/useToastStore';

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
        const productName = (eventMapping?.name ? exp[eventMapping.name] : (exp.DESCRIPTOR || exp.productName)) || 'Producto Desconocido';
        
        return {
          id: record.id,
          barcode,
          productName,
          providerName: (eventMapping?.supplier ? exp[eventMapping.supplier] : (exp.PROVEEDOR || exp.supplier)) || 'N/A',
          event: eventMapping?.event ? exp[eventMapping.event] : (exp.EVENTO || exp.event || 'OTRO'),
          quantity: eventMapping?.quantity ? exp[eventMapping.quantity] : (exp.CANTIDAD || exp.quantity || 0),
          location: eventMapping?.location ? exp[eventMapping.location] : (exp.UBICACION || exp.location || 'GENERAL'),
          frc: eventMapping?.frc ? exp[eventMapping.frc] : (exp.FRC || exp.frc || ''),
          nguia: eventMapping?.nguia ? exp[eventMapping.nguia] : (exp.NGUIA || exp.nguia || ''),
          timestamp: record.timestamp || Date.now(),
          claveUnica: exp.claveUnica,
          category: 'GENERAL',
          isAdjusted: !!(exp.traspaso && exp.traspaso.trim() !== ''),
          mm: exp.MM,
          yyyy: exp.YYYY,
          syncStatus: 'synced',
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [cloudItems, settings?.appSheetConfig?.mappings?.events]);

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

  return {
    state: {
      searchQuery,
      selectedEvents,
      selectedIds,
      allItems: baseProcessedData,
      preferences,
      processedEvents: baseProcessedData,
      pendingEvents: baseProcessedData.filter(e => !e.isAdjusted),
      adjustedEvents: baseProcessedData.filter(e => e.isAdjusted),
      totalCount: baseProcessedData.length,
      filteredCount: baseProcessedData.length,
      pendingCount: baseProcessedData.filter(i => !i.isAdjusted).length,
      adjustedCount: baseProcessedData.filter(i => i.isAdjusted).length,
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
      clearLocalData: async () => {},
      updateEventBulkFieldsMany: async (ids: string[], updates: any) => {},
      clearSelection: () => setSelectedIds(new Set()),
      updateEvent: async (id: string, data: any) => ({}),
      createEvent: async (data: any) => ({}),
      setPendingOperations: (op: any) => {},
      deleteEvent: async (id: string) => {},
      updateEventStatus: async (id: string, isAdjusted: boolean) => {},
      handleToggleSelect: (id: string) => {
        setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      handleSelectAll: () => {},
      updateEventDestino: async (id: string, destino: string) => {},
      togglePreference: (prefs: Partial<EventPreferences>) => {
        setPreferences(prev => ({ ...prev, ...prefs }));
      }
    }
  };
};
