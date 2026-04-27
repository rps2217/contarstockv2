
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

export type { ExpiryStatus, ExpiryPreferences, ExpiryItem };

export const useExpiryDatabase = () => {
  const { addToast } = useToastStore.getState();
  const { settings } = useAppStore();
  const { addTask, updateTask } = useTaskStore();
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
    const expiryMapping = settings?.cloudConfig?.mappings?.expiry;
    
    const getVal = (obj: any, keys: string[]) => {
      for (const k of keys) {
        if (k && obj[k] !== undefined && obj[k] !== null) {
          const val = String(obj[k]).trim();
          if (val) return val;
        }
      }
      return '';
    };

    // Usar un Map para deduplicar por claveUnica (siendo la más reciente la que prevalece)
    const dedupMap = new Map<string, ExpiryItem>();

    (localItems || []).forEach(record => {
        const exp = record;
        const productName = getVal(exp, [expiryMapping?.name || '', 'DESCRIPTOR', 'DESCRIPCION_PROD', 'DESCRIPCION', 'PRODUCTO', 'ITEM', 'productName', 'name', 'nombre']);
        const providerName = getVal(exp, [expiryMapping?.supplier || '', 'PROVEEDOR', 'PROV', 'supplier', 'providerName', 'proveedor', 'Proveedor', 'LABORATORIO', 'LAB', 'MARCA']);
        const observaciones = getVal(exp, [expiryMapping?.observaciones || '', 'OBSERVACIONES', 'OBSERVACION', 'OBS', 'COMENTARIO', 'NOTAS', 'description', 'descripción', 'descripcion']);
        
        const rawTimestamp = getVal(exp, [expiryMapping?.timestamp || '', 'TIMESTAMP', 'timestamp', 'createdAt', 'fecha_creacion', 'FECHA_CREACION']);
        const finalTimestamp = rawTimestamp 
          ? (typeof rawTimestamp === 'number' ? rawTimestamp : new Date(rawTimestamp).getTime())
          : (record.timestamp || Date.now());

        const processed = processExpiryItem({
          id: record.id,
          barcode: exp[expiryMapping?.barcode || ''] || (exp as any).SKU || (exp as any).COD_BARRAS || exp.barcode || '',
          productName,
          providerName,
          mm: exp[expiryMapping?.mm || ''] || (exp as any).MM || exp.mm,
          yyyy: exp[expiryMapping?.yyyy || ''] || (exp as any).YYYY || exp.yyyy,
          batch: exp[expiryMapping?.batch || ''] || (exp as any).LOTE || exp.batch || 'N/A',
          type: 'Nube',
          timestamp: finalTimestamp,
          quantity: exp[expiryMapping?.quantity || ''] || (exp as any).CANTIDAD || exp.quantity || 0,
          location: exp[expiryMapping?.location || ''] || (exp as any).UBICACION || exp.location || 'N/A',
          observaciones,
          claveUnica: exp.claveUnica || (exp as any).CLAVE_UNICA || record.id, // Fallback al id si no hay claveUnica
          syncStatus: record.syncStatus || 'synced'
        }, productMap, providerMap, now);

        const key = processed.claveUnica;
        const existing = dedupMap.get(key);
        
        // Mantener el más reciente si hay duplicados
        if (!existing || (processed.timestamp > (existing.timestamp || 0))) {
          dedupMap.set(key, processed);
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

      const now = new Date();
      
      // BUSCAR SI YA EXISTE PARA ACTUALIZAR (Por claveUnica o por ID)
      const existing = localItems.find(item => item.claveUnica === claveUnica || item.id === claveUnica);
      
      // BLOQUEAR DUPLICADOS SEGÚN SOLICITUD DEL USUARIO
      if (existing) {
        addToast(`Ya existe un registro para ${data.productName} con vencimiento ${mmPadded}/${yearStr}. No se permiten duplicados.`, 'error');
        SoundFX.play('error');
        return null;
      }

      const rowData: any = {
        id: claveUnica, 
        ID: claveUnica,
        claveUnica: claveUnica,
        timestamp: now.getTime(), 
        barcode: sanitizedBarcode,
        productName: data.productName,
        providerName: data.providerName || 'N/A',
        mm: data.mm,
        yyyy: data.yyyy,
        event: 'VENCIMIENTOS',
        quantity: data.quantity,
        location: data.location || '',
        observaciones: data.observaciones || '',
        origin: 'REGISTRO DIRECTO',
        syncStatus: 'synced' as const
      };

      // GUARDADO LOCAL INMEDIATO (Cero Latencia)
      await expiryRepository.save(rowData, tableName);
      
      // SINCRONIZACIÓN ASÍNCRONA CON LA NUBE
      supabaseSyncService.pushChange(tableName, claveUnica, rowData).catch(err => {
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
      
      // Si cambian campos que afectan a la claveUnica, debemos regenerar el ID
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
        newId = newClaveUnica;
        
        // Si el ID cambió, debemos eliminar el registro antiguo
        if (newId !== id) {
          logger.info('EXPIRY_DB', `Actualizando ID de registro por cambio en fecha/sku: ${id} -> ${newId}`);
          await expiryRepository.delete(id);
          supabaseSyncService.deleteRemote(tableName, id).catch(() => {});
          
          // Verificar si el nuevo ID ya existe (colisión) y decidir si sobreescribir o sumar
          const collision = localItems.find(item => item.id === newId || item.claveUnica === newClaveUnica);
          if (collision) {
             // Si hay colisión, podríamos sumar cantidades o simplemente sobreescribir.
             // Para consistencia con handleAddItem, usaremos la lógica de sobreescritura/merge parcial
             updates.quantity = (updates.quantity || 0) + (collision.quantity || 0);
          }
        }
      }

      const updatedData: any = {
        ...existing,
        ...updates,
        id: newId,
        ID: newId,
        claveUnica: newClaveUnica,
        timestamp: now.getTime(),
        syncStatus: 'synced' as const
      };

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
