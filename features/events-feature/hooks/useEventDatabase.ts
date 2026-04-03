import { useState, useMemo, useEffect, useCallback } from 'react';
import { db as firebaseDb } from '../../../src/lib/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cloudItems, setCloudItems] = useState<any[]>([]);
  const [pendingOperations, setPendingOperations] = useState(0);

  const tableName = settings?.appSheetConfig?.eventsTableName || 'EVENTOS';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== searchQuery) {
        setDebouncedSearch(searchQuery);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  // Firestore real-time subscription
  useEffect(() => {
    if (!tableName || tableName === 'undefined') return;

    try {
      const colRef = collection(firebaseDb, tableName);
      const q = query(colRef, limit(3000));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCloudItems(items);
      }, (error) => {
        console.error(`[Firestore Event Error] Tabla: ${tableName}`, error);
        
        if (error.message.includes('permission-denied')) {
          addToast("Error de permisos en Eventos. Revisa Firestore.", "error");
        } else {
          addToast("Reintentando conexión con Eventos...", "error");
        }

        try {
          handleFirestoreError(error, OperationType.GET, tableName);
        } catch (e) {
          // Fallback silencioso
        }
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Fallo al suscribir eventos:", e);
    }
  }, [tableName]);

  // Datos base procesados (sin filtros de UI)
  const baseProcessedData = useMemo(() => {
    const eventMapping = settings?.appSheetConfig?.mappings?.events;
    return (cloudItems || [])
      .sort((a, b) => {
        const timeA = a.timestamp ? (typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp) : 0;
        const timeB = b.timestamp ? (typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp) : 0;
        return (timeB || 0) - (timeA || 0);
      })
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
          destino: exp.destino || exp.DESTINO || '',
          traspaso: exp.traspaso || exp.TRASPASO || '',
          observaciones: exp.observaciones || exp.OBSERVACIONES || '',
          timestamp: record.timestamp || Date.now(),
          claveUnica: exp.claveUnica,
          category: 'GENERAL',
          isAdjusted: !!(exp.traspaso && String(exp.traspaso).trim() !== ''),
          mm: exp.MM,
          yyyy: exp.YYYY,
          syncStatus: 'synced',
        };
      });
  }, [cloudItems, settings?.appSheetConfig?.mappings?.events]);

  // Datos filtrados por búsqueda y tipo de evento
  const filteredData = useMemo(() => {
    let data = baseProcessedData;

    // Filtro por tipo de evento
    if (selectedEvents.length > 0) {
      data = data.filter(item => selectedEvents.includes(item.event));
    }

    // Filtro por búsqueda de texto
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter(item =>
        (item.barcode || '').toLowerCase().includes(q) ||
        (item.productName || '').toLowerCase().includes(q) ||
        (item.providerName || '').toLowerCase().includes(q) ||
        (item.frc || '').toLowerCase().includes(q) ||
        (item.nguia || '').toLowerCase().includes(q) ||
        (item.event || '').toLowerCase().includes(q) ||
        (item.destino || '').toLowerCase().includes(q)
      );
    }

    return data;
  }, [baseProcessedData, selectedEvents, debouncedSearch]);

  // Estadísticas de prioridad
  const priorityStats = useMemo(() => {
    const eventCounts: Record<string, number> = {};
    filteredData.forEach(item => {
      eventCounts[item.event] = (eventCounts[item.event] || 0) + 1;
    });

    const eventAlerts = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([event, count]) => ({ name: event, count }));

    return { priorityItems: [], eventAlerts, suggestedActions: [] };
  }, [filteredData]);

  // --- ACCIONES CRUD ---

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

  const createEvent = useCallback(async (data: any) => {
    return handleAddItem(data);
  }, [handleAddItem]);

  const updateEvent = useCallback(async (id: string, data: any) => {
    try {
      await firebaseSyncService.pushChange(tableName, id, { ...data, id });
      addToast('Evento actualizado correctamente', 'success');
    } catch (error: any) {
      addToast(`Error al actualizar: ${error.message}`, 'error');
    }
  }, [tableName]);

  const deleteEvent = useCallback(async (id: string) => {
    try {
      await firebaseSyncService.deleteRemote(tableName, id);
      addToast('Evento eliminado', 'success');
    } catch (error: any) {
      addToast(`Error al eliminar: ${error.message}`, 'error');
    }
  }, [tableName]);

  const updateEventStatus = useCallback(async (id: string, isAdjusted: boolean) => {
    try {
      await firebaseSyncService.pushChange(tableName, id, {
        id,
        traspaso: isAdjusted ? 'AJUSTADO' : '',
      });
    } catch (error: any) {
      addToast(`Error al actualizar estado: ${error.message}`, 'error');
    }
  }, [tableName]);

  const updateEventDestino = useCallback(async (id: string, destino: string) => {
    try {
      await firebaseSyncService.pushChange(tableName, id, {
        id,
        destino,
      });
    } catch (error: any) {
      addToast(`Error al actualizar destino: ${error.message}`, 'error');
    }
  }, [tableName]);

  const updateEventBulkFieldsMany = useCallback(async (ids: string[], updates: any) => {
    try {
      const rows = ids.map(id => ({ id, ...updates }));
      await firebaseSyncService.pushBatch(tableName, rows);
      addToast(`${ids.length} registros actualizados`, 'success');
    } catch (error: any) {
      addToast(`Error en actualización masiva: ${error.message}`, 'error');
    }
  }, [tableName]);

  const clearLocalData = useCallback(async () => {
    setCloudItems([]);
    addToast('Datos locales limpiados. La suscripción en tiempo real los restaurará.', 'info');
  }, []);

  const handleUpdatePreferences = useCallback((newPrefs: Partial<EventPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }));
    localStorage.setItem('event_preferences', JSON.stringify({ ...preferences, ...newPrefs }));
  }, [preferences]);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredData.map(i => i.id));
    setSelectedIds(allIds);
  }, [filteredData]);

  return {
    state: {
      searchQuery,
      selectedEvents,
      selectedIds,
      allItems: baseProcessedData,
      preferences,
      processedEvents: filteredData,
      pendingEvents: filteredData.filter(e => !e.isAdjusted),
      adjustedEvents: filteredData.filter(e => e.isAdjusted),
      totalCount: baseProcessedData.length,
      filteredCount: filteredData.length,
      pendingCount: filteredData.filter(i => !i.isAdjusted).length,
      adjustedCount: filteredData.filter(i => i.isAdjusted).length,
      priorityStats,
      eventTypes: Array.from(new Set(baseProcessedData.map(i => i.event))),
      pendingOperations
    },
    actions: {
      setSearchQuery,
      setSelectedEvents,
      setSelectedIds,
      handleRemoveItem,
      handleBulkRemove,
      handleAddItem,
      handleUpdatePreferences,
      clearLocalData,
      updateEventBulkFieldsMany,
      clearSelection: () => setSelectedIds(new Set()),
      updateEvent,
      createEvent,
      setPendingOperations,
      deleteEvent,
      updateEventStatus,
      handleToggleSelect: (id: string) => {
        setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      handleSelectAll,
      updateEventDestino,
      togglePreference: (prefs: Partial<EventPreferences>) => {
        const updated = { ...preferences, ...prefs };
        setPreferences(updated);
        localStorage.setItem('event_preferences', JSON.stringify(updated));
      }
    }
  };
};
