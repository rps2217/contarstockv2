
import { useMemo, useEffect, useCallback, useState } from 'react';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { Product, Provider } from '../../../types';
import { useToastStore } from '../../../store/useToastStore';
import { useAppStore } from '@/store/mainAppStore';
import { useExpiryStore, ExpiryItem, ExpiryStatus, ExpiryPreferences } from '../../../store/useExpiryStore';
import { processExpiryItem, filterExpiryItems, calculateExpiryStats } from '../utils/expiryProcessor';
import { SoundFX } from '../../../services/audio';
import { normalizeSku, normalizeIdentity } from '../../../services/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { db } from '../../../db';
import { expiryRepository } from '../../../repositories/ExpiryRepository';
// import { expirySyncService } from '../../../services/expirySyncService'; // YA NO SE USA
import { dynamicSyncService } from '../../../services/dynamicSync';
import { useTaskStore } from '@/store/useTaskStore';
import { logger } from '../../../services/logger';
import { normalizeExpiryRecord, NormalizedExpiry } from '../../../services/normalizationService';

export type { ExpiryStatus, ExpiryPreferences, ExpiryItem };

export const useExpiryDatabase = () => {
  const { addToast } = useToastStore.getState();
  const { settings } = useAppStore();
  const { addTask, updateTask } = useTaskStore();
  const expiryMapping = settings?.cloudConfig?.mappings?.expiry;
  const tableName = settings?.cloudConfig?.inventoryRegistryTableName || 
                    settings?.cloudConfig?.expiryTableName || 
                    'VENCIMIENTOS';
  
    const {
    preferences, setPreferences,
    searchQuery, setSearchQuery,
    selectedStatuses, setSelectedStatuses,
    selectedCategories, setSelectedCategories,
    selectedCanje, setSelectedCanje,
    actionPeriod, setActionPeriod,
    customDateRange, setCustomDateRange,
    creationDateRange, setCreationDateRange,
    selectedIds, setSelectedIds
  } = useExpiryStore();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Local data from Dexie - reactive to tableName
  const localItems = useLiveQuery(() => expiryRepository.getAll(tableName), [tableName]) || [];
  const allProducts = useLiveQuery(() => productRepository.getAll(), []) || [];
  const allProviders = useLiveQuery(() => db.providers.toArray(), []) || [];
  
  const productMap = useMemo(() => {
    if (!allProducts.length) return new Map<string, Product>();
    const map = new Map<string, Product>();
    allProducts.forEach(p => {
      const sku = normalizeSku(p.barcode);
      if (sku) map.set(sku, p);
    });
    return map;
  }, [allProducts]);

  const providerMap = useMemo(() => {
    if (!allProviders.length) return new Map<string, Provider>();
    const map = new Map<string, Provider>();
    allProviders.forEach(p => {
      const rut = normalizeIdentity(p.rut);
      if (rut) map.set(rut, p);
    });
    return map;
  }, [allProviders]);

  // Start real-time sync with Supabase
  useEffect(() => {
    if (!tableName) return;

    // Sincronizar nombre de tabla en el repositorio
    expiryRepository.setTableName(tableName);

    // 1. Initial Pull - Fetch existing data using the robust sync service
    const fetchInitialData = async () => {
      try {
        setIsSyncing(true);
        const { added, updated } = await dynamicSyncService.pullSync(tableName);
        if (added > 0 || updated > 0) {
          logger.info('SYNC_INITIAL', `Sincronizados ${added + updated} registros de ${tableName}`);
        }
      } catch (err) {
        logger.error('SYNC_INITIAL_FAIL', err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchInitialData();

    // 2. Real-time Subscription
    const unsubscribe = supabaseSyncService.startSync(tableName, expiryRepository);
    return () => {
      unsubscribe();
    };
  }, [tableName]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== searchQuery) {
        setDebouncedSearch(searchQuery);
      }
    }, 400); 
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  const baseProcessedData = useMemo(() => {
    const now = new Date();
    
    // Usar un Map para deduplicar por claveUnica
    const dedupMap = new Map<string, ExpiryItem>();

    // MEMORY OPTIMIZATION: Sliding Window
    // Si tenemos miles de registros, procesamos solo los 500 más recientes para la vista activa.
    // Los datos antiguos siguen en IndexedDB y accesible mediante filtros específicos.
    const windowSize = 500;
    const itemsToProcess = (localItems || []).length > windowSize 
      ? [...(localItems || [])].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, windowSize)
      : (localItems || []);

    itemsToProcess.forEach(record => {
        // NORMALIZACIÓN RÍGIDA: Único lugar de transformación
        const normalized = normalizeExpiryRecord(record, expiryMapping);
        
        const processed = processExpiryItem(
          normalized, 
          productMap, 
          providerMap, 
          now
        );

        const key = processed.claveUnica || processed.id;
        const existing = dedupMap.get(key);
        
        if (existing) {
          // MULTI-USER MERGE: Sumamos cantidades si hay colisión concurrente (diferentes IDs con misma clave)
          if (existing.id !== processed.id) {
             existing.quantity += processed.quantity;
             if (processed.observaciones && processed.observaciones !== existing.observaciones) {
                 existing.observaciones = existing.observaciones ? `${existing.observaciones} | ${processed.observaciones}` : processed.observaciones;
             }
             if (processed.timestamp > (existing.timestamp || 0)) {
               existing.timestamp = processed.timestamp;
             }
          } else {
             if (processed.timestamp > (existing.timestamp || 0)) {
               dedupMap.set(key, processed);
             }
          }
        } else {
          // Clone purely because we might mutate it in the lines above for grouping
          dedupMap.set(key, { ...processed });
        }
      });

    return Array.from(dedupMap.values());
  }, [localItems, settings?.cloudConfig?.mappings?.expiry, productMap, providerMap]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    baseProcessedData.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [baseProcessedData]);

  const contextFilteredData = useMemo(() => {
    return filterExpiryItems(baseProcessedData, {
      query: debouncedSearch.toLowerCase(),
      selectedCategories,
      selectedCanje,
      actionPeriod,
      customDateRange,
      creationDateRange
    });
  }, [baseProcessedData, debouncedSearch, selectedCategories, selectedCanje, actionPeriod, customDateRange, creationDateRange]);

  const processedData = useMemo((): ExpiryItem[] => {
    const filtered = contextFilteredData.filter(item => {
      // Status filter
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(item.status)) return false;
      } else {
        // If no status is selected, apply hideExpiredByDefault
        if (preferences.hideExpiredByDefault && item.status === 'expired') return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      // 1. Prioritize Withdrawal Date sorting as requested
      if (preferences.defaultSort === 'withdrawal') {
        const dateA = a.withdrawalDate?.getTime() || Infinity;
        const dateB = b.withdrawalDate?.getTime() || Infinity;
        
        if (dateA !== dateB) {
          return dateA - dateB;
        }
      } else {
        // Fallback or Expiry Sort
        const dateA = a.expiryDateObj?.getTime() || Infinity;
        const dateB = b.expiryDateObj?.getTime() || Infinity;
        
        if (dateA !== dateB) {
          return dateA - dateB;
        }
      }

      // 2. Stable sorting by Barcode then ID if dates are identical
      if (a.barcode !== b.barcode) {
        return a.barcode.localeCompare(b.barcode);
      }
      return a.id.localeCompare(b.id);
    }).map(item => {
      const maxLifeDays = 730; 
      const percent = Math.max(0, Math.min(100, (item.daysLeft / maxLifeDays) * 100));
      return { ...item, lifePercent: percent };
    });
  }, [contextFilteredData, selectedStatuses, preferences.hideExpiredByDefault, preferences.defaultSort]);

  const stats = useMemo(() => calculateExpiryStats(contextFilteredData), [contextFilteredData]);

  const handleSyncExpirations = useCallback(async () => {
    try {
      setIsSyncing(true);
      const items = await expiryRepository.getAll(tableName);
      if (items.length === 0) {
        addToast('No hay registros locales para sincronizar.', 'info');
        return;
      }

      // Preparar el lote para Supabase
      const rows = items.map(item => ({
        id: item.id,
        ...item,
        syncStatus: 'synced'
      }));

      const result = await supabaseSyncService.pushBatch(tableName, rows);
      
      if (result.success) {
        // Actualizar estado local a synced
        await expiryRepository.bulkSave(items.map(i => ({ ...i, syncStatus: 'synced' })), tableName);
        addToast(`Sincronización completa: ${items.length} registros subidos.`, 'success');
        SoundFX.play('success');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      addToast(`Error al sincronizar: ${error.message}`, 'error');
      SoundFX.play('error');
    } finally {
      setIsSyncing(false);
    }
  }, [tableName, addToast]);

  const handleRemoveItem = useCallback(async (item: any) => {
    try {
      // Delete locally first for immediate feedback
      await expiryRepository.delete(item.id);
      
      // Then delete remotely
      await supabaseSyncService.deleteRemote(tableName, item.id);
      addToast('Ítem retirado correctamente', 'success');
    } catch (error: any) {
      addToast(`Error al retirar el ítem: ${error.message}`, 'error');
    }
  }, [tableName]);

  const handleBulkRemove = useCallback(async (ids: Set<string>) => {
    const taskId = `bulk-remove-expiry-${Date.now()}`;
    const idArray = Array.from(ids);
    
    addTask({
      id: taskId,
      name: `Retirando ${idArray.length} vencimientos`,
      progress: 0,
      status: 'running'
    });

    try {
      let successCount = 0;
      for (let i = 0; i < idArray.length; i++) {
        const id = idArray[i];
        try {
          // Delete locally first
          await expiryRepository.delete(id);
          
          // Then delete remotely
          await supabaseSyncService.deleteRemote(tableName, id);
          successCount++;
        } catch (e) {
          console.error(`Error al eliminar ${id}:`, e);
        }
        updateTask(taskId, { progress: Math.round(((i + 1) / idArray.length) * 100) });
      }
      
      updateTask(taskId, { status: 'completed', progress: 100 });
      setSelectedIds(new Set());
      addToast(`${successCount} ítems retirados correctamente`, 'success');
    } catch (error) {
      updateTask(taskId, { status: 'error', error: 'Error en operación masiva' });
      addToast('Error al retirar los ítems', 'error');
    }
  }, [tableName, addTask, updateTask, setSelectedIds]);

  const handleAddItem = useCallback(async (data: {
    barcode: string;
    productName: string;
    providerName?: string;
    mm: number;
    yyyy: number;
    quantity: number;
    location?: string;
    observaciones?: string;
    fechaCC?: string;
  }) => {
    try {
      const sanitizedBarcode = normalizeSku(data.barcode);
      
      if (!sanitizedBarcode) {
        addToast('El código de barras es obligatorio', 'error');
        return;
      }

      const yearStr = String(data.yyyy);
      const mmPadded = String(data.mm).padStart(2, '0');
      const lastDay = new Date(data.yyyy, data.mm, 0).getDate();
      const ddPadded = String(lastDay).padStart(2, '0');
      const claveUnica = `${sanitizedBarcode}${yearStr}${mmPadded}${ddPadded}`;
      const uniqueId = crypto.randomUUID();

      const now = new Date();
      
      // BUSCAR SI YA EXISTE PARA ACTUALIZAR (Por claveUnica o por ID)
      const existing = localItems.find(item => item.claveUnica === claveUnica || item.id === claveUnica);
      
      // BLOQUEAR DUPLICADOS LOGICOS CREADOS POR EL MISMO USUARIO
      if (existing) {
        addToast(`Ya existe un registro para ${data.productName} con vencimiento ${mmPadded}/${yearStr}. No se permiten duplicados.`, 'error');
        SoundFX.play('error');
        return null;
      }

      const rowData: NormalizedExpiry = normalizeExpiryRecord({
        id: uniqueId, 
        claveUnica: claveUnica,
        timestamp: now.getTime(), 
        barcode: sanitizedBarcode,
        productName: data.productName,
        providerName: data.providerName || 'N/A',
        mm: data.mm,
        yyyy: data.yyyy,
        quantity: data.quantity,
        location: data.location || '',
        observaciones: data.observaciones || '',
        syncStatus: 'synced'
      }, expiryMapping);

      // GUARDADO LOCAL INMEDIATO
      await expiryRepository.save(rowData, tableName);
      
      // SINCRONIZACIÓN ASÍNCRONA CON LA NUBE
      supabaseSyncService.pushChange(tableName, uniqueId, rowData).catch(err => {
        console.error("[ExpiryCloudSync] Error:", err);
        expiryRepository.save({ ...rowData, syncStatus: 'pending' }, tableName);
      });
      
      addToast('Guardado correctamente.', 'success');
      SoundFX.play('success');
      return claveUnica;

    } catch (error: any) {
      addToast(`Error crítico al registrar: ${error.message}`, 'error');
      SoundFX.play('error');
    }
  }, [tableName, localItems, addToast]);

  const handleUpdatePreferences = useCallback((newPrefs: Partial<ExpiryPreferences>) => {
    setPreferences(newPrefs);
  }, [setPreferences]);

  const clearLocalData = useCallback(async () => {
    // Ya no se usa base de datos local, pero vaciamos el store
    setSearchQuery('');
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedCanje('all');
    setActionPeriod('all');
    setCustomDateRange({ start: null, end: null });
    setCreationDateRange({ start: null, end: null });
    setSelectedIds(new Set());
  }, [setSearchQuery, setSelectedStatuses, setSelectedCategories, setSelectedCanje, setActionPeriod, setCustomDateRange, setCreationDateRange, setSelectedIds]);

  const handleUpdateItem = useCallback(async (id: string, updates: Partial<any>) => {
    try {
      const existing = localItems.find(item => item.id === id);
      if (!existing) throw new Error("Producto no encontrado");

      const now = new Date();
      
      // Si cambian campos que afectan a la claveUnica, debemos regenerar la clave
      let newId = id;
      let newClaveUnica = existing.claveUnica || existing.id;
      
      if (updates.mm !== undefined || updates.yyyy !== undefined || updates.barcode !== undefined) {
        const barcode = updates.barcode || existing.barcode;
        const mm = updates.mm !== undefined ? updates.mm : existing.mm;
        const yyyy = updates.yyyy !== undefined ? updates.yyyy : existing.yyyy;
        
        const sanitizedBarcode = normalizeSku(barcode);
        const mmPadded = String(mm).padStart(2, '0');
        const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
        const ddPadded = String(lastDay).padStart(2, '0');
        newClaveUnica = `${sanitizedBarcode}${yyyy}${mmPadded}${ddPadded}`;
        
        // Si la claveUnica cambió (y antes el ID era la clave única legacy)
        if (newClaveUnica !== existing.claveUnica && id === existing.claveUnica) {
           newId = crypto.randomUUID();
           logger.info('EXPIRY_DB', `Actualizando clave única migrando a UUID: ${id} -> ${newId}`);
           await expiryRepository.delete(id);
           supabaseSyncService.deleteRemote(tableName, id).catch(() => {});
        }
      }

      // MULTI-USER CONSOLIDATION:
      // Si la UI envía una edición total (ej. cantidad), debemos asegurarnos de que la actualización
      // sea la cantidad FINAL consolidada, y eliminar los fragmentos concurrentes para evitar re-sumar.
      const matchingFragments = localItems.filter(item => (item.claveUnica || item.id) === newClaveUnica);
      if (matchingFragments.length > 1) {
         for (const frag of matchingFragments) {
            if (frag.id !== newId) {
               await expiryRepository.delete(frag.id);
               supabaseSyncService.deleteRemote(tableName, frag.id).catch(()=>{});
            }
         }
      }

      const updatedData = normalizeExpiryRecord({
        ...existing,
        ...updates,
        id: newId,
        claveUnica: newClaveUnica,
        timestamp: now.getTime(),
        syncStatus: 'synced'
      }, settings?.cloudConfig?.mappings?.expiry);

      // 1. Local update
      await expiryRepository.save(updatedData, tableName);

      // 2. Cloud update (silent)
      supabaseSyncService.pushChange(tableName, newId, updatedData).catch(err => {
        expiryRepository.save({ ...updatedData, syncStatus: 'pending' }, tableName);
      });

      addToast('Cambios guardados', 'success');
    } catch (error: any) {
      addToast(`Error al actualizar: ${error.message}`, 'error');
    }
  }, [tableName, localItems, addToast]);

  return {
    state: {
      searchQuery,
      selectedStatuses,
      selectedCategories,
      selectedCanje,
      actionPeriod,
      customDateRange,
      creationDateRange,
      isSyncing,
      selectedIds,
      allItems: baseProcessedData,
      processedScans: processedData,
      categories,
      stats,
      preferences
    },
    actions: {
      setSearchQuery,
      setSelectedStatuses,
      setSelectedCategories,
      setSelectedCanje,
      setActionPeriod,
      setCustomDateRange,
      setCreationDateRange,
      setSelectedIds,
      handleSyncExpirations,
      handleRemoveItem,
      handleBulkRemove,
      handleAddItem,
      handleUpdateItem,
      handleUpdatePreferences,
      handleFullRefresh: () => {
        localStorage.removeItem(`last_sync_${tableName}`);
        window.location.reload();
      },
      clearLocalData
    }
  };
};

// Forced GitHub sync
