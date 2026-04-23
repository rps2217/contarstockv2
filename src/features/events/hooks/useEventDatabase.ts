import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { useAppStore } from '@/store/mainAppStore';
import { useToastStore } from '../../../store/useToastStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { eventRepository } from '../../../repositories/EventRepository';
import { normalizeSku } from '../../../services/utils';
import { Product } from '../../../types';
import { logger } from '../../../services/logger';

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
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [isSyncing, setIsSyncing] = useState(false);

  const tableName = settings?.cloudConfig?.eventsTableName || 'EVENTOS';

  const allProducts = useLiveQuery(() => productRepository.getAll(), []) || [];
  const localEvents = useLiveQuery(() => eventRepository.getAll(), []) || [];
  
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    if (!allProducts) return map;
    for (let i = 0; i < allProducts.length; i++) {
      const p = allProducts[i];
      const sku = normalizeSku(p.barcode);
      if (sku) map.set(sku, p);
    }
    return map;
  }, [allProducts]);

  // Start real-time sync with Supabase
  useEffect(() => {
    // 1. Initial Pull - Fetch existing data
    const fetchInitialData = async () => {
      try {
        setIsSyncing(true);
        const { rows, error } = await supabaseSyncService.pullBatch(tableName);
        if (error) throw new Error(error);
        if (rows && rows.length > 0) {
          await eventRepository.bulkSave(rows.map((i: any) => ({ ...i, syncStatus: 'synced' })));
          logger.info('SYNC_INITIAL_EVENTS', `Cargados ${rows.length} eventos desde Supabase`);
        }
      } catch (err) {
        logger.error('SYNC_INITIAL_EVENTS_FAIL', err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchInitialData();

    // 2. Real-time Subscription
    const unsubscribe = supabaseSyncService.startSync(tableName, eventRepository);
    return () => {
      unsubscribe();
    };
  }, [tableName]);

  const baseProcessedData = useMemo(() => {
    const eventMapping = settings?.cloudConfig?.mappings?.events;
    const items = localEvents || [];
    const result = [];

    for (let i = 0; i < items.length; i++) {
      const record = items[i];
      const exp = record;
      
      // Helper to find field in record with multiple fallbacks
      // Prioritizes non-empty values to avoid issues with duplicate fields (e.g. NGUIA vs nguia)
      const getField = (mappingKey: string | undefined, fallbacks: string[]) => {
        // 1. Try mapping key first (non-empty)
        if (mappingKey && exp[mappingKey] !== undefined && String(exp[mappingKey]).trim() !== '') {
          return exp[mappingKey];
        }
        
        // 2. Try fallbacks (non-empty)
        for (const key of fallbacks) {
          if (exp[key] !== undefined && String(exp[key]).trim() !== '') {
            return exp[key];
          }
        }

        // 3. Fallback to mapping key even if empty
        if (mappingKey && exp[mappingKey] !== undefined) {
          return exp[mappingKey];
        }

        // 4. Fallback to first existing key even if empty
        for (const key of fallbacks) {
          if (exp[key] !== undefined) return exp[key];
        }
        
        return undefined;
      };

      const eventValue = getField(eventMapping?.event, ['EVENTO', 'evento', 'event', 'EVENT', 'Tipo', 'TIPO', 'MOTIVO', 'motivo']) || 'OTRO';
      
      if (String(eventValue || "").toUpperCase() === 'VENCIMIENTOS') continue;

      const barcode = String(getField(eventMapping?.barcode, ['SKU', 'sku', 'barcode', 'BARCODE', 'codigo', 'CODIGO', 'Codigo', 'EAN', 'ean', 'UPC', 'upc']) || '').trim();
      const product = productMap.get(normalizeSku(barcode));
      
      const productName = product?.name || 
        getField(eventMapping?.name, ['DESCRIPTOR', 'descriptor', 'productName', 'PRODUCTO', 'producto', 'Name', 'name', 'DESCRIPCION', 'descripcion']) || 
        'Producto Desconocido';
        
      const providerName = product?.supplier || 
        getField(eventMapping?.supplier, ['PROVEEDOR', 'proveedor', 'supplier', 'SUPPLIER', 'Proveedor', 'Provider', 'FABRICANTE', 'fabricante']) || 
        'N/A';
      
      const quantityValue = getField(eventMapping?.quantity, ['CANTIDAD', 'cantidad', 'quantity', 'QUANTITY', 'Cant', 'CANT', 'QTY', 'qty']) || 0;
      const locationValue = getField(eventMapping?.location, ['UBICACION', 'ubicacion', 'location', 'LOCATION', 'Ubic', 'UBIC', 'SITIO', 'sitio']) || 'GENERAL';
      const frcValue = getField(eventMapping?.frc, ['FRC', 'frc', 'folio', 'FOLIO', 'folio_frc', 'FOLIO_FRC', 'Folio', 'FRC_FOLIO', 'folio_frc']) || '';
      const nguiaValue = getField(eventMapping?.nguia, ['nguia', 'NGUIA', 'guia', 'GUIA', 'n_guia', 'N_GUIA', 'GUIA_NUM', 'guia_num']) || '';
      const destinoValue = getField(eventMapping?.destino, ['DESTINO', 'destino', 'Destino', 'BODEGA', 'bodega']) || '';
      const traspasoValue = getField(eventMapping?.traspaso, ['DOC-TRAS-INTER', 'TRASPASO', 'traspaso', 'Traspaso', 'N_TRASPASO', 'n_traspaso']) || '';
      const observacionesValue = getField(eventMapping?.observaciones, ['OBSERVACIONES', 'observaciones', 'Observaciones', 'OBS', 'obs', 'NOTAS', 'notas']) || '';
      
      const hasTraspaso = !!(traspasoValue && String(traspasoValue).trim() !== '');

      result.push({
        id: record.id,
        barcode,
        productName,
        providerName,
        event: eventValue,
        quantity: quantityValue,
        location: locationValue,
        frc: frcValue,
        nguia: nguiaValue,
        destino: destinoValue,
        traspaso: traspasoValue,
        observaciones: observacionesValue,
        timestamp: record.timestamp || Date.now(),
        claveUnica: exp.claveUnica || record.id,
        category: product?.category || 'GENERAL',
        isAdjusted: hasTraspaso,
        syncStatus: record.syncStatus || 'synced',
      });
    }

    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [localEvents, settings?.cloudConfig?.mappings?.events, productMap]);

  const handleRemoveItem = useCallback(async (item: any) => {
    try {
      // Delete locally first for immediate feedback
      await eventRepository.delete(item.id);
      
      // Then delete remotely
      await supabaseSyncService.deleteRemote(tableName, item.id);
      addToast('Ítem retirado correctamente', 'success');
    } catch (error: any) {
      addToast(`Error al retirar el ítem: ${error.message}`, 'error');
    }
  }, [tableName]);

  const handleBulkRemove = useCallback(async (ids: Set<string>) => {
    try {
      for (const id of ids) {
        // Delete locally first
        await eventRepository.delete(id);
        
        // Then delete remotely
        await supabaseSyncService.deleteRemote(tableName, id);
      }
      setSelectedIds(new Set());
      addToast(`${ids.size} ítems retirados correctamente`, 'success');
    } catch (error) {
      addToast('Error al retirar los ítems', 'error');
    }
  }, [tableName]);

  // Helper to map internal keys back to configured mapping keys before saving to Firestore
  const unmapData = useCallback((data: any) => {
    const eventMapping = settings?.cloudConfig?.mappings?.events;
    
    // Default mapping based on user's Firestore structure
    const defaultMapping = {
      barcode: 'SKU',
      event: 'EVENTO',
      quantity: 'CANTIDAD',
      frc: 'FRC',
      destino: 'DESTINO',
      traspaso: 'DOC-TRAS-INTER',
      observaciones: 'OBSERVACIONES',
      uniqueKey: 'CLAVE_UNICA',
      timestamp: 'TIMESTAMP'
    };

    const finalMapping = { ...defaultMapping, ...eventMapping };
    const unmapped: any = { ...data };
    
    const mapKey = (internalKey: string, mappingKey: string | undefined) => {
      if (mappingKey) {
        unmapped[mappingKey] = data[internalKey];
      }
    };

    if (data.barcode !== undefined) {
      mapKey('barcode', finalMapping.barcode);
      unmapped.barcode = data.barcode; // Keep both for safety
    }
    if (data.event !== undefined) {
      mapKey('event', finalMapping.event);
      unmapped.event = data.event;
    }
    if (data.quantity !== undefined) {
      mapKey('quantity', finalMapping.quantity);
      unmapped.quantity = data.quantity;
    }
    if (data.frc !== undefined) {
      mapKey('frc', finalMapping.frc);
      unmapped.frc = data.frc;
    }
    if (data.destino !== undefined) {
      mapKey('destino', finalMapping.destino);
      unmapped.destino = data.destino;
    }
    if (data.traspaso !== undefined) {
      mapKey('traspaso', finalMapping.traspaso);
      unmapped.traspaso = data.traspaso;
      unmapped['DOC-TRAS-INTER'] = data.traspaso; // Explicit support
    }
    if (data.observaciones !== undefined) {
      mapKey('observaciones', finalMapping.observaciones);
      unmapped.observaciones = data.observaciones;
    }
    if (data.claveUnica !== undefined) {
      mapKey('claveUnica', finalMapping.uniqueKey);
      unmapped.claveUnica = data.claveUnica;
      unmapped.CLAVE_UNICA = data.claveUnica;
    }
    
    // Additional fields from user's list
    if (data.nguia !== undefined) unmapped.nguia = data.nguia;
    if (data.productName !== undefined) unmapped.productName = data.productName;
    if (data.providerName !== undefined) unmapped.providerName = data.providerName;
    
    // Ensure ID is sent in all required cases
    const idValue = data.id || data.claveUnica;
    unmapped.ID = idValue;
    unmapped.id = idValue;
    unmapped.Id = idValue;
    
    if (data.timestamp) {
      const isoTimestamp = typeof data.timestamp === 'number' ? new Date(data.timestamp).toISOString() : data.timestamp;
      unmapped.TIMESTAMP = isoTimestamp;
      unmapped.timestamp = isoTimestamp;
    }

    return unmapped;
  }, [settings?.cloudConfig?.mappings?.events]);

  const handleAddItem = useCallback(async (data: any) => {
    try {
      const sanitizedBarcode = normalizeSku(data.barcode);
      const frcValue = String(data.frc || '').trim();
      const claveUnica = `${sanitizedBarcode}${frcValue}`;

      // Verificar duplicados antes de agregar
      const isDuplicate = baseProcessedData.some(e => e.claveUnica === claveUnica);
      if (isDuplicate) {
        addToast(`Ya existe un registro para ${sanitizedBarcode} con el FRC ${frcValue}`, 'error');
        return null;
      }

      const now = Date.now();
      
      const rowData = {
        id: claveUnica, 
        timestamp: now,
        ...data,
        barcode: sanitizedBarcode,
        claveUnica: claveUnica,
        event: data.event || 'OTRO'
      };

      const finalData = unmapData(rowData);
      
      // Update local repository immediately for better UX
      await eventRepository.save({ ...rowData, syncStatus: 'synced' });
      
      await supabaseSyncService.pushChange(tableName, claveUnica, finalData);
      addToast('Guardado en la nube correctamente.', 'success');
      return claveUnica;
    } catch (error: any) {
      addToast(`Error al registrar: ${error.message}`, 'error');
    }
  }, [tableName, unmapData]);

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
        String(e.frc || '').toLowerCase().includes(q) ||
        String(e.destino || '').toLowerCase().includes(q) ||
        String(e.traspaso || '').toLowerCase().includes(q)
      );
    }
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
  }, [baseProcessedData, searchQuery, selectedEvents, dateRange]);

  return {
    state: {
      searchQuery,
      selectedEvents,
      selectedIds,
      dateRange,
      allItems: baseProcessedData,
      preferences,
      processedEvents: processedEvents,
      pendingEvents: processedEvents.filter(e => !e.isAdjusted && (!e.destino || String(e.destino).trim() === '')),
      destinedEvents: processedEvents.filter(e => !e.isAdjusted && e.destino && String(e.destino).trim() !== ''),
      adjustedEvents: processedEvents.filter(e => e.isAdjusted),
      totalCount: baseProcessedData.length,
      filteredCount: processedEvents.length,
      pendingCount: processedEvents.filter(i => !i.isAdjusted && (!i.destino || String(i.destino).trim() === '')).length,
      destinedCount: processedEvents.filter(i => !i.isAdjusted && i.destino && String(i.destino).trim() !== '').length,
      adjustedCount: processedEvents.filter(i => i.isAdjusted).length,
      priorityStats: { priorityItems: [], eventAlerts: [], suggestedActions: [] },
      eventTypes: Array.from(new Set(baseProcessedData.map(i => i.event))),
      pendingOperations: 0
    },
    actions: {
      setSearchQuery,
      setSelectedEvents,
      setSelectedIds,
      setDateRange,
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
          const finalData = unmapData(updates);
          for (const id of ids) {
            const item = baseProcessedData.find(e => e.id === id);
            if (item) {
              // Actualización local inmediata
              await eventRepository.save({ ...item, ...updates, syncStatus: 'synced' });
              // Actualización remota
              await supabaseSyncService.pushChange(tableName, id, finalData);
            }
          }
          addToast(`${ids.length} eventos actualizados`, 'success');
        } catch (error: any) {
          addToast(`Error al actualizar eventos: ${error.message}`, 'error');
        }
      },
      clearSelection: () => setSelectedIds(new Set()),
      updateEvent: async (id: string, data: any) => {
        try {
          const item = baseProcessedData.find(e => e.id === id);
          if (!item) throw new Error('Evento no encontrado localmente');

          const updates = { ...data };
          let newId = id;

          if (data.barcode || data.frc) {
            const barcode = normalizeSku(data.barcode || item.barcode || '');
            const frc = String(data.frc || item.frc || '').trim();
            newId = `${barcode}${frc}`;
            updates.claveUnica = newId;
            updates.barcode = barcode;
          }

          const finalData = unmapData({ 
            ...item, 
            ...updates, 
            id: newId, 
            timestamp: Date.now() 
          });

          // Si el ID cambió, debemos borrar el antiguo y crear el nuevo en Supabase
          if (newId !== id) {
            await supabaseSyncService.deleteRemote(tableName, id);
            await eventRepository.delete(id);
          }

          // Actualización local inmediata
          await eventRepository.save({ ...finalData, id: newId, syncStatus: 'synced' });

          // Actualización remota
          await supabaseSyncService.pushChange(tableName, newId, finalData);
          
          addToast('Evento actualizado correctamente', 'success');
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
          // Delete locally first
          await eventRepository.delete(id);
          
          // Then delete remotely
          await supabaseSyncService.deleteRemote(tableName, id);
          addToast('Evento eliminado', 'success');
        } catch (error: any) {
          addToast(`Error al eliminar evento: ${error.message}`, 'error');
        }
      },
      updateEventStatus: async (id: string, isAdjusted: boolean) => {
        try {
          const item = baseProcessedData.find(e => e.id === id);
          if (item) {
            await eventRepository.save({ ...item, isAdjusted, syncStatus: 'synced' });
          }
          await supabaseSyncService.pushChange(tableName, id, { isAdjusted });
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
          const item = baseProcessedData.find(e => e.id === id);
          if (item) {
            await eventRepository.save({ ...item, destino, syncStatus: 'synced' });
          }
          await supabaseSyncService.pushChange(tableName, id, { destino });
          addToast('Destino actualizado', 'success');
        } catch (error: any) {
          addToast(`Error al actualizar destino: ${error.message}`, 'error');
        }
      },
      togglePreference: (prefs: Partial<EventPreferences>) => {
        setPreferences(prev => ({ ...prev, ...prefs }));
      },
      handleFullRefresh: () => {
        localStorage.removeItem(`last_sync_${tableName}`);
        window.location.reload();
      }
    }
  };
};

// Forced GitHub sync
