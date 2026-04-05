
import { useMemo, useEffect, useCallback, useState } from 'react';
import { db as firestoreDb } from '../../../lib/firebase';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { firebaseSyncService, handleFirestoreError, OperationType } from '../../../services/firebaseSyncService';
import { Product, Provider } from '../../../types';
import { useToastStore } from '../../../store/useToastStore';
import { useAppStore } from '@/store/mainAppStore';
import { useExpiryStore, ExpiryItem, ExpiryStatus, ExpiryPreferences } from '../../../store/useExpiryStore';
import { processExpiryItem, filterExpiryItems, calculateExpiryStats } from '../utils/expiryProcessor';
import { SoundFX } from '../../../services/audio';
import { normalizeSku } from '../../../services/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { db } from '../../../db';
import { expiryRepository } from '../../../repositories/ExpiryRepository';
import { expirySyncService } from '../../../services/expirySyncService';
import { useTaskStore } from '@/store/useTaskStore';

export type { ExpiryStatus, ExpiryPreferences, ExpiryItem };

export const useExpiryDatabase = () => {
  const { addToast } = useToastStore.getState();
  const { settings } = useAppStore();
  const { addTask, updateTask } = useTaskStore();
  const tableName = settings?.appSheetConfig?.inventoryRegistryTableName || 
                    settings?.appSheetConfig?.expiryTableName || 
                    'VENCIMIENTOS';
  
  const {
    preferences, setPreferences,
    searchQuery, setSearchQuery,
    selectedStatuses, setSelectedStatuses,
    selectedCategories, setSelectedCategories,
    selectedCanje, setSelectedCanje,
    actionPeriod, setActionPeriod,
    customDateRange, setCustomDateRange,
    selectedIds, setSelectedIds
  } = useExpiryStore();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Local data from Dexie
  const localItems = useLiveQuery(() => expiryRepository.getAll(), []) || [];
  const allProducts = useLiveQuery(() => productRepository.getAll(), []) || [];
  const allProviders = useLiveQuery(() => db.providers.toArray(), []) || [];
  
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    allProducts.forEach(p => {
      const sku = normalizeSku(p.barcode);
      if (sku) map.set(sku, p);
    });
    return map;
  }, [allProducts]);

  const providerMap = useMemo(() => {
    const map = new Map<string, Provider>();
    allProviders.forEach(p => {
      const rut = normalizeSku(p.rut);
      if (rut) map.set(rut, p);
    });
    return map;
  }, [allProviders]);

  // Start real-time sync with Firestore
  useEffect(() => {
    const unsubscribe = expirySyncService.startSync(tableName);
    return () => expirySyncService.stopSync();
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
    const expiryMapping = settings?.appSheetConfig?.mappings?.expiry;
    
    return (localItems || []).map(record => {
        const exp = record;
        const productName = exp[expiryMapping?.name || ''] || 
                            (exp as any).DESCRIPTOR || 
                            (exp as any).DESCRIPCION_PROD || 
                            (exp as any).DESCRIPCION || 
                            (exp as any).PRODUCTO ||
                            (exp as any).ITEM ||
                            exp.productName || '';
                            
        const providerName = exp[expiryMapping?.supplier || ''] ||
                             (exp as any).PROVEEDOR || 
                             (exp as any).PROV ||
                             (exp as any).proveedor || 
                             (exp as any).supplier || exp.providerName || '';
        
        return processExpiryItem({
          id: record.id,
          barcode: exp[expiryMapping?.barcode || ''] || (exp as any).SKU || (exp as any).COD_BARRAS || exp.barcode || '',
          productName,
          providerName,
          mm: exp[expiryMapping?.mm || ''] || (exp as any).MM || exp.mm,
          yyyy: exp[expiryMapping?.yyyy || ''] || (exp as any).YYYY || exp.yyyy,
          batch: exp[expiryMapping?.batch || ''] || (exp as any).LOTE || exp.batch || 'N/A',
          type: 'Nube',
          timestamp: record.timestamp || Date.now(),
          quantity: exp[expiryMapping?.quantity || ''] || (exp as any).CANTIDAD || exp.quantity || 0,
          location: exp[expiryMapping?.location || ''] || (exp as any).UBICACION || exp.location || 'N/A',
          claveUnica: exp.claveUnica || (exp as any).CLAVE_UNICA,
          syncStatus: record.syncStatus || 'synced'
        }, productMap, providerMap, now);
      });
  }, [localItems, settings?.appSheetConfig?.mappings?.expiry, productMap, providerMap]);

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
      customDateRange
    });
  }, [baseProcessedData, debouncedSearch, selectedCategories, selectedCanje, actionPeriod, customDateRange]);

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
      if (preferences.defaultSort === 'withdrawal') {
        if (!a.withdrawalDate) return 1;
        if (!b.withdrawalDate) return -1;
        return a.withdrawalDate.getTime() - b.withdrawalDate.getTime();
      }
      if (!a.expiryDateObj) return 1;
      if (!b.expiryDateObj) return -1;
      return a.expiryDateObj.getTime() - b.expiryDateObj.getTime();
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
      addToast(`Sincronización completa.`, 'success');
    } catch (error: any) {
      addToast(`Error al sincronizar: ${error.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleRemoveItem = useCallback(async (item: any) => {
    try {
      await firebaseSyncService.deleteRemote(tableName, item.id);
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
          await firebaseSyncService.deleteRemote(tableName, id);
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

      const shortId = Math.random().toString(16).substring(2, 10);
      const now = new Date();
      
      const rowData: Record<string, any> = {
        id: shortId,
        ID: shortId,
        claveUnica: claveUnica,
        timestamp: now.toISOString(),
        barcode: sanitizedBarcode,
        productName: data.productName,
        providerName: data.providerName || 'N/A',
        mm: data.mm,
        yyyy: data.yyyy,
        event: 'VENCIMIENTOS',
        quantity: data.quantity,
        location: '',
        origin: 'REGISTRO DIRECTO'
      };

      await firebaseSyncService.pushBatch(tableName, [rowData]);
      
      addToast('Guardado en la nube correctamente.', 'success');
      SoundFX.play('success');

      return shortId;

    } catch (error: any) {
      addToast(`Error crítico al registrar: ${error.message}`, 'error');
      SoundFX.play('error');
    }
  }, [tableName]);

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
    setSelectedIds(new Set());
  }, [setSearchQuery, setSelectedStatuses, setSelectedCategories, setSelectedCanje, setActionPeriod, setCustomDateRange, setSelectedIds]);

  return {
    state: {
      searchQuery,
      selectedStatuses,
      selectedCategories,
      selectedCanje,
      actionPeriod,
      customDateRange,
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
      setSelectedIds,
      handleSyncExpirations,
      handleRemoveItem,
      handleBulkRemove,
      handleAddItem,
      handleUpdatePreferences,
      clearLocalData
    }
  };
};

// Forced GitHub sync
