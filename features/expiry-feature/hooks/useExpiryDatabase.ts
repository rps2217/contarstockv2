
import { useMemo, useEffect, useCallback, useState } from 'react';
import { db as firestoreDb } from '../../../src/lib/firebase';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { firebaseSyncService, handleFirestoreError, OperationType } from '../../../services/firebaseSyncService';
import { Product, Provider } from '../../../types';
import { useToastStore } from '../../../store/useToastStore';
import { useAppStore } from '../../../store/useAppStore';
import { useExpiryStore, ExpiryItem, ExpiryStatus, ExpiryPreferences } from '../../../store/useExpiryStore';
import { processExpiryItem, filterExpiryItems, calculateExpiryStats } from '../utils/expiryProcessor';
import { SoundFX } from '../../../services/audio';
import { normalizeSku } from '../../../services/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { db } from '../../../db';

export type { ExpiryStatus, ExpiryPreferences, ExpiryItem };

export const useExpiryDatabase = () => {
  const { addToast } = useToastStore.getState();
  const { settings } = useAppStore();
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
    selectedIds, setSelectedIds,
    verifiedIds, setVerifiedIds
  } = useExpiryStore();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudItems, setCloudItems] = useState<any[]>([]);

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

  // Monitoreo en tiempo real de Firestore
  useEffect(() => {
    const colRef = collection(firestoreDb, tableName);
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
    
    return (cloudItems || []).map(record => {
        const exp = record;
        const productName = exp[expiryMapping?.name || ''] || 
                            exp.DESCRIPTOR || 
                            exp.DESCRIPCION_PROD || 
                            exp.DESCRIPCION || 
                            exp.PRODUCTO ||
                            exp.ITEM ||
                            exp.productName || '';
                            
        const providerName = exp[expiryMapping?.supplier || ''] ||
                             exp.PROVEEDOR || 
                             exp.PROV ||
                             exp.proveedor || 
                             exp.supplier || '';
        
        return processExpiryItem({
          id: record.id,
          barcode: exp[expiryMapping?.barcode || ''] || exp.SKU || exp.COD_BARRAS || exp.barcode || '',
          productName,
          providerName,
          mm: exp[expiryMapping?.mm || ''] || exp.MM || exp.mm,
          yyyy: exp[expiryMapping?.yyyy || ''] || exp.YYYY || exp.yyyy,
          batch: exp[expiryMapping?.batch || ''] || exp.LOTE || exp.batch || 'N/A',
          type: 'Nube',
          timestamp: record.timestamp || Date.now(),
          quantity: exp[expiryMapping?.quantity || ''] || exp.CANTIDAD || exp.quantity || 0,
          location: exp[expiryMapping?.location || ''] || exp.UBICACION || exp.location || 'N/A',
          claveUnica: exp.claveUnica || exp.CLAVE_UNICA,
          syncStatus: 'synced'
        }, productMap, providerMap, now);
      });
  }, [cloudItems, settings?.appSheetConfig?.mappings?.expiry, productMap, providerMap]);

  // MOTOR DETECTIVE: Resuelve 'Productos Desconocidos' en segundo plano con alta prioridad
  useEffect(() => {
    // Pendiente de migración a Firebase
  }, [baseProcessedData, isSyncing, settings]);

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
    setVerifiedIds(new Set());
  }, [setSearchQuery, setSelectedStatuses, setSelectedCategories, setSelectedCanje, setActionPeriod, setCustomDateRange, setSelectedIds, setVerifiedIds]);

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
      verifiedIds,
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
      setVerifiedIds,
      handleSyncExpirations,
      handleRemoveItem,
      handleBulkRemove,
      handleAddItem,
      handleUpdatePreferences,
      clearLocalData
    }
  };
};
