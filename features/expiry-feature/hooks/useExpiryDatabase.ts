
import { useMemo, useEffect, useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Product, Provider } from '../../../types';
import { importExpirationsFromCloud, importProvidersFromCloud } from '../../../services/syncManager';
import { dynamicDataService } from '../../../services/dynamicDataService';
import { dynamicSyncService } from '../../../services/dynamicSync';
import { normalizeSku } from '../../../services/utils';
import { useToastStore } from '../../../store/useToastStore';
import { useAppStore } from '../../../store/useAppStore';
import { useExpiryStore, ExpiryItem, ExpiryStatus, ExpiryPreferences } from '../../../store/useExpiryStore';
import { SyncQueueService } from '../../../services/syncQueueService';
import { processExpiryItem, filterExpiryItems, calculateExpiryStats } from '../utils/expiryProcessor';

export type { ExpiryStatus, ExpiryPreferences, ExpiryItem };

export const useExpiryDatabase = () => {
  const { addToast } = useToastStore.getState();
  const { settings } = useAppStore();
  const tableName = settings?.appSheetConfig?.expiryTableName || 'VENCIMIENTOS';
  
  // Procesar cola de sincronización al iniciar
  useEffect(() => {
    SyncQueueService.processQueue();
  }, []);

  const {
    preferences, setPreferences,
    searchQuery, setSearchQuery,
    selectedStatuses, setSelectedStatuses,
    selectedCategories, setSelectedCategories,
    selectedCanje, setSelectedCanje,
    selectedEstado, setSelectedEstado,
    dateRange, setDateRange,
    withdrawalDateRange, setWithdrawalDateRange,
    selectedIds, setSelectedIds,
    verifiedIds, setVerifiedIds
  } = useExpiryStore();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Clear statuses when a specific estado is selected to ensure visibility
  useEffect(() => {
    if (selectedEstado !== null) {
      setSelectedStatuses([]);
    }
  }, [selectedEstado]);

  const scans = useLiveQuery(() => 
    db.scans.filter(s => !!s.expiryDate || (!!s.mm && !!s.yyyy)).toArray()
  );
  const sessions = useLiveQuery(() =>
    db.sessions.filter(s => !!s.mm && !!s.yyyy).toArray()
  );
  
  // Nuevo Motor: Leer de dynamic_data en lugar de cloudExpirations
  const dynamicExpirations = useLiveQuery(() =>
    db.dynamic_data.where('tableName').equals(tableName).toArray(),
    [tableName]
  );

  const products = useLiveQuery(() => db.products.toArray());
  const providers = useLiveQuery(() => db.providers.toArray());

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products?.forEach(p => map.set(normalizeSku(p.barcode), p));
    return map;
  }, [products]);

  const providerMap = useMemo(() => {
    const map = new Map<string, Provider>();
    providers?.forEach(p => map.set(normalizeSku(p.rut), p));
    return map;
  }, [providers]);

  const baseProcessedData = useMemo(() => {
    if (!scans) return [];

    const now = new Date();

    const individualItems = scans.map(scan => processExpiryItem({ ...scan, type: 'Individual' }, productMap, providerMap, now));
    const sessionItems = (sessions || []).map(session => processExpiryItem({
      id: session.id,
      barcode: session.logisticsLabel,
      mm: session.mm,
      yyyy: session.yyyy,
      batch: session.batch || 'N/A',
      type: 'Bulto/Caja',
      timestamp: session.createdAt,
      quantity: session.totalUnits || 0,
      location: session.logisticsLabel || 'N/A'
    }, productMap, providerMap, now));
    
    // Mapeo del Nuevo Motor al formato esperado por la UI
    const cloudItems = (dynamicExpirations || [])
      .map(record => {
        const exp = record.data;
        return processExpiryItem({
          id: record.id,
          barcode: exp.SKU || exp.barcode,
          productName: exp.DESCRIPTOR || exp.productName,
          mm: exp.MM || exp.mm,
          yyyy: exp.YYYY || exp.yyyy,
          batch: exp.LOTE || 'N/A',
          type: 'Nube',
          timestamp: record.timestamp,
          quantity: exp.CANTIDAD || exp.quantity || 0,
          location: exp.UBICACION || exp.location || 'N/A',
          claveUnica: exp.claveUnica,
          syncStatus: record.syncStatus
        }, productMap, providerMap, now);
      });

    return [...individualItems, ...sessionItems, ...cloudItems];
  }, [scans, sessions, dynamicExpirations, productMap, providerMap]);

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
      selectedEstado,
      dateRange,
      withdrawalDateRange
    });
  }, [baseProcessedData, debouncedSearch, selectedCategories, selectedCanje, selectedEstado, dateRange, withdrawalDateRange]);

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
      // Usar el nuevo motor de sincronización
      await dynamicSyncService.pullSync(tableName);
      await importProvidersFromCloud();
      addToast(`Sincronización completa.`, 'success');
    } catch (error: any) {
      addToast(`Error al sincronizar: ${error.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [tableName]);

  const handleRemoveItem = useCallback(async (item: any) => {
    try {
      // 1. Borrado local inmediato (Optimistic UI)
      if (item.type === 'Individual') {
        await db.scans.delete(item.id);
      } else if (item.type === 'Bulto/Caja') {
        await db.sessions.delete(item.id);
        await db.scans.where('sessionId').equals(item.id).delete();
      } else if (item.type === 'Nube') {
        await dynamicDataService.deleteRecord(item.id);
      }
      addToast('Ítem retirado correctamente', 'success');
    } catch (error: any) {
      addToast(`Error al retirar el ítem: ${error.message}`, 'error');
    }
  }, []);

  const handleBulkRemove = useCallback(async (ids: Set<string>) => {
    try {
      const selectedItems = baseProcessedData.filter(s => ids.has(s.id));
      
      // 1. Borrado local inmediato
      for (const item of selectedItems) {
        if (item.type === 'Individual') {
          await db.scans.delete(item.id);
        } else if (item.type === 'Bulto/Caja') {
          await db.sessions.delete(item.id);
          await db.scans.where('sessionId').equals(item.id).delete();
        } else if (item.type === 'Nube') {
          await dynamicDataService.deleteRecord(item.id);
        }
      }
      setSelectedIds(new Set());
      addToast(`${selectedItems.length} ítems retirados correctamente`, 'success');
    } catch (error) {
      addToast('Error al retirar los ítems localmente', 'error');
    }
  }, [baseProcessedData]);

  const handleAddItem = useCallback(async (data: {
    barcode: string;
    productName: string;
    mm: number;
    yyyy: number;
    quantity: number;
    fechaCC?: string;
  }) => {
    try {
      // 0. Sanitizar y validar datos básicos
      const sanitizedBarcode = normalizeSku(data.barcode);
      
      if (!sanitizedBarcode) {
        addToast('El código de barras es obligatorio', 'error');
        return;
      }

      // Generar clave única localmente para validación previa
      const mmPadded = String(data.mm).padStart(2, '0');
      const lastDay = new Date(data.yyyy, data.mm, 0).getDate();
      const ddPadded = String(lastDay).padStart(2, '0');
      const claveUnica = `${sanitizedBarcode}${data.yyyy}${mmPadded}${ddPadded}`;

      // 1. Validar duplicado localmente antes de ir a la nube
      const existingLocal = await db.dynamic_data
        .where('tableName').equals(tableName)
        .filter(r => r.data.claveUnica === claveUnica)
        .first();
        
      if (existingLocal) {
        addToast('Este producto ya está registrado para el mes y año seleccionados.', 'error');
        return;
      }

      // 2. Guardar usando el nuevo motor dinámico
      try {
        await dynamicDataService.saveRecord(tableName, {
          SKU: sanitizedBarcode,
          DESCRIPTOR: data.productName,
          MM: data.mm,
          YYYY: data.yyyy,
          CANTIDAD: data.quantity,
          UBICACION: 'MANUAL',
          claveUnica: claveUnica,
          fechaCC: data.fechaCC,
          TIMESTAMP: Date.now()
        }, claveUnica);
        
        addToast('Producto registrado exitosamente', 'success');
      } catch (dbError: any) {
        throw dbError;
      }

    } catch (error: any) {
      addToast(`Error al agregar localmente: ${error.message}`, 'error');
    }
  }, []);

  const handleUpdatePreferences = useCallback((newPrefs: Partial<ExpiryPreferences>) => {
    setPreferences(newPrefs);
  }, [setPreferences]);

  return {
    state: {
      searchQuery,
      selectedStatuses,
      selectedCategories,
      selectedCanje,
      selectedEstado,
      dateRange,
      withdrawalDateRange,
      isSyncing,
      pendingOperations,
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
      setSelectedEstado,
      setDateRange,
      setWithdrawalDateRange,
      setSelectedIds,
      setVerifiedIds,
      handleSyncExpirations,
      handleRemoveItem,
      handleBulkRemove,
      handleAddItem,
      handleUpdatePreferences
    }
  };
};
