import { useState, useMemo, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
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
    
    // MEMORY OPTIMIZATION: Sliding Window
    // Si tenemos miles de registros, procesamos solo los 500 más recientes para la vista activa.
    const windowSize = 500;
    const items = (localEvents || []).length > windowSize
      ? [...(localEvents || [])].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, windowSize)
      : (localEvents || []);
      
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

  // Helper to map internal keys back to standard lowercase columns for Supabase
  const unmapData = useCallback((data: any) => {
    const idValue = data.id || data.claveUnica || data.CLAVE_UNICA;
    
    // Objeto definitivo para Supabase. 
    // Enviamos tanto 'id' como 'ID' para evitar el error de "not-null constraint".
    const unmapped: any = {
      id: idValue,
      ID: idValue,
      barcode: data.barcode || '',
      event: data.event || '',
      quantity: Number(data.quantity) || 0,
      frc: data.frc || '',
      destino: data.destino || '',
      traspaso: data.traspaso || '',
      observaciones: data.observaciones || '',
      claveUnica: data.claveUnica || idValue,
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
      productName: data.productName || '',
      providerName: data.providerName || '',
      nguia: data.nguia || ''
    };
    
    return unmapped;
  }, []);

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
      },
      handleBulkImport: async (items: any[]) => {
        try {
          const processed = items.map(item => {
            const sanitizedBarcode = normalizeSku(item.barcode || item.SKU || '');
            const frcValue = String(item.frc || item.FRC || '').trim();
            const claveUnica = item.claveUnica || item.CLAVE_UNICA || `${sanitizedBarcode}${frcValue}`;
            
            const rawTimestamp = item.timestamp || item.TIMESTAMP;
            let finalTimestamp = Date.now();
            
            if (rawTimestamp) {
              const parsed = new Date(rawTimestamp);
              if (!isNaN(parsed.getTime())) {
                finalTimestamp = parsed.getTime();
              }
            }
            
            return {
              ...item,
              id: claveUnica,
              barcode: sanitizedBarcode,
              frc: frcValue,
              claveUnica,
              timestamp: finalTimestamp,
              syncStatus: 'synced' as const
            };
          });

          // Guardado local masivo
          await eventRepository.bulkSave(processed);

          // Sincronización con la nube (por lotes para no saturar)
          const BATCH_SIZE = 50;
          for (let i = 0; i < processed.length; i += BATCH_SIZE) {
            const batch = processed.slice(i, i + BATCH_SIZE);
            const batchToPush = batch.map(item => unmapData(item));
            const result = await supabaseSyncService.pushBatch(tableName, batchToPush);
            if (!result.success) {
              console.error(`Sync error at batch ${i/BATCH_SIZE}:`, result.error);
              throw new Error(`Error en Supabase: ${result.error}. Asegúrate de que las columnas destino, traspaso y observaciones existan en la tabla ${tableName}.`);
            }
          }

          addToast(`${processed.length} registros importados correctamente`, 'success');
          return true;
        } catch (error: any) {
          addToast(`Error en importación masiva: ${error.message}`, 'error');
          return false;
        }
      },
      handleClearAllEvents: async () => {
        const taskId = `clear-events-${Date.now()}`;
        addToast('Iniciando limpieza total...', 'info');

        try {
          // 1. Borrado masivo en Supabase (Nube)
          await supabaseSyncService.clearTable(tableName);
          
          // 2. Borrado local en el repositorio corporativo
          await eventRepository.clear();
          
          addToast('Base de datos de eventos limpiada correctamente (Nube y Local)', 'success');
          
          // Opcional: recargar después de una limpieza total para estado limpio
          setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
          console.error('Clear DB Error:', error);
          addToast(`Error al resetear la base de datos: ${error.message}`, 'error');
        }
      }
    }
  };
};

