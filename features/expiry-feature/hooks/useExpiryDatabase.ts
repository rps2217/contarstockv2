
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
import { SoundFX } from '../../../services/audio';
import { cloudApi } from '../../../services/cloud/apiClient';
import { resolveUnknownProducts } from '../../../services/productService';

export type { ExpiryStatus, ExpiryPreferences, ExpiryItem };

export const useExpiryDatabase = () => {
  const { addToast } = useToastStore.getState();
  const { settings } = useAppStore();
  const tableName = settings?.appSheetConfig?.inventoryRegistryTableName || 
                    settings?.appSheetConfig?.expiryTableName || 
                    'VENCIMIENTOS';
  
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
  
  // Monitoreo en tiempo real de operaciones pendientes en la nube
  const pendingOperations = useLiveQuery(
    () => db.dynamic_data.where('syncStatus').equals('pending').count(),
    []
  ) || 0;

  // Debounce search query - Aumentado a 400ms para mayor fluidez en búsquedas rápidas
  useEffect(() => {
    const timer = setTimeout(() => {
      // Solo actualizamos si el valor ha cambiado realmente
      if (debouncedSearch !== searchQuery) {
        setDebouncedSearch(searchQuery);
      }
    }, 400); 
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  // Clear statuses when a specific estado is selected to ensure visibility
  useEffect(() => {
    if (selectedEstado !== null) {
      setSelectedStatuses([]);
    }
  }, [selectedEstado]);

  const { scans, sessions, dynamicExpirations, productMap, providerMap } = useLiveQuery(async () => {
    const scansData = await db.scans.filter(s => !!s.expiryDate || (!!s.mm && !!s.yyyy)).toArray();
    const sessionsData = await db.sessions.filter(s => !!s.mm && !!s.yyyy).toArray();
    const dynamicExpirationsData = await db.dynamic_data.where('tableName').equals(tableName).toArray();
    
    // Extraer SKUs únicos para no cargar todo el catálogo de productos en memoria
    const skus = new Set<string>();
    scansData.forEach(s => skus.add(normalizeSku(s.barcode)));
    sessionsData.forEach(s => skus.add(normalizeSku(s.logisticsLabel)));
    
    const expiryMapping = settings?.appSheetConfig?.mappings?.expiry;
    dynamicExpirationsData.forEach(record => {
      const exp = record.data;
      const eventValue = exp[expiryMapping?.event || ''] || exp.EVENTO || exp.event;
      if (String(eventValue || "").toUpperCase() === 'VENCIMIENTOS') {
         const barcode = exp[expiryMapping?.barcode || ''] || exp.SKU || exp.COD_BARRAS || exp.barcode || '';
         skus.add(normalizeSku(barcode));
      }
    });

    // Cargar SOLO los productos necesarios
    const productsData = await db.products.where('barcode').anyOf(Array.from(skus)).toArray();
    const pMap = new Map<string, Product>();
    productsData.forEach(p => pMap.set(normalizeSku(p.barcode), p));

    // Extraer RUTs únicos de los productos cargados para no cargar todos los proveedores
    const ruts = new Set<string>();
    productsData.forEach(p => {
      if (p.supplierRut) ruts.add(normalizeSku(p.supplierRut));
    });
    
    // Cargar SOLO los proveedores necesarios
    const providersData = await db.providers.where('rut').anyOf(Array.from(ruts)).toArray();
    const provMap = new Map<string, Provider>();
    providersData.forEach(p => provMap.set(normalizeSku(p.rut), p));

    return { 
      scans: scansData, 
      sessions: sessionsData, 
      dynamicExpirations: dynamicExpirationsData, 
      productMap: pMap, 
      providerMap: provMap 
    };
  }, [tableName, settings?.appSheetConfig?.mappings?.expiry]) || { 
    scans: [], sessions: [], dynamicExpirations: [], productMap: new Map(), providerMap: new Map() 
  };

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
    
    const expiryMapping = settings?.appSheetConfig?.mappings?.expiry;
    const cloudItems = (dynamicExpirations || [])
      .filter(record => {
        const exp = record.data;
        const eventValue = exp[expiryMapping?.event || ''] || exp.EVENTO || exp.event;
        return String(eventValue || "").toUpperCase() === 'VENCIMIENTOS';
      })
      .map(record => {
        const exp = record.data;
        // FALLBACK ROBUSTO: Buscamos el nombre en todas las variantes posibles de tu Google Sheets
        const productName = exp[expiryMapping?.name || ''] || exp.DESCRIPTOR || exp.DESCRIPCION_PROD || exp.DESCRIPCION || exp.productName || '';
        const providerName = exp.PROVEEDOR || exp.proveedor || exp.supplier || '';
        
        return processExpiryItem({
          id: record.id,
          barcode: exp[expiryMapping?.barcode || ''] || exp.SKU || exp.COD_BARRAS || exp.barcode || '',
          productName,
          providerName,
          mm: exp[expiryMapping?.mm || ''] || exp.MM || exp.mm,
          yyyy: exp[expiryMapping?.yyyy || ''] || exp.YYYY || exp.yyyy,
          batch: exp[expiryMapping?.batch || ''] || exp.LOTE || exp.batch || 'N/A',
          type: 'Nube',
          timestamp: record.timestamp,
          quantity: exp[expiryMapping?.quantity || ''] || exp.CANTIDAD || exp.quantity || 0,
          location: exp[expiryMapping?.location || ''] || exp.UBICACION || exp.location || 'N/A',
          claveUnica: exp.claveUnica || exp.CLAVE_UNICA,
          syncStatus: record.syncStatus
        }, productMap, providerMap, now);
      });

    return [...individualItems, ...sessionItems, ...cloudItems];
  }, [scans, sessions, dynamicExpirations, productMap, providerMap, settings?.appSheetConfig?.mappings?.expiry]);

  // MOTOR DETECTIVE: Resuelve 'Productos Desconocidos' en segundo plano con alta prioridad
  useEffect(() => {
    if (!baseProcessedData || isSyncing || !settings?.appSheetConfig?.gasWebAppUrl) return;

    const unknownSkus = Array.from(new Set(
      baseProcessedData
        .filter(item => item.productName === 'Producto Desconocido')
        .map(item => normalizeSku(item.barcode))
    )).slice(0, 10); // Aumentado a 10 para mayor velocidad

    if (unknownSkus.length === 0) return;

    const timer = setTimeout(() => {
      resolveUnknownProducts(unknownSkus, settings.appSheetConfig);
    }, 800);
    return () => clearTimeout(timer);
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
      await dynamicSyncService.syncAllPending(undefined, tableName);
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
      const yearStr = String(data.yyyy);
      const mmPadded = String(data.mm).padStart(2, '0');
      
      // Cálculo preciso del último día del mes
      const lastDay = new Date(data.yyyy, data.mm, 0).getDate();
      const ddPadded = String(lastDay).padStart(2, '0');
      
      // Composición de clave FINAL: SKU + YYYY + MM + DD (Sin separadores)
      const claveUnica = `${sanitizedBarcode}${yearStr}${mmPadded}${ddPadded}`;

      // 1. VALIDACIÓN LOCAL (Búsqueda exacta por Clave Única)
      const existingLocal = await db.dynamic_data
        .where('tableName').equals(tableName)
        .and(r => r.data.claveUnica === claveUnica)
        .first();
        
      if (existingLocal) {
        addToast(`⚠️ Error: El producto ya tiene este vencimiento (${mmPadded}/${data.yyyy}) registrado localmente.`, 'error');
        SoundFX.play('error');
        return;
      }

      // 2. VALIDACIÓN EN NUBE (Preventiva y Exacta)
      try {
        const cloudCheck = await cloudApi.getSummary(tableName, 'claveUnica', claveUnica);
        // Validamos que el resultado no sea solo 'exitoso', sino que contenga exactamente la clave buscada
        const matchInCloud = cloudCheck.success && 
                             cloudCheck.rows && 
                             cloudCheck.rows.some(row => String(row.claveUnica || row.ID) === claveUnica);

        if (matchInCloud) {
          addToast(`⚠️ Aviso: Este vencimiento (${mmPadded}/${data.yyyy}) ya existe en Google Sheets.`, 'warning');
          SoundFX.play('error');
          return;
        }
      } catch (cloudErr) {
        console.warn("Consulta de duplicados en la nube omitida por error de conexión. Se continúa con validación local.");
      }

      // 3. CONSTRUIR REGISTRO ADAPTATIVO (Basado en la estructura de tu Imagen)
      const expiryMapping = settings?.appSheetConfig?.mappings?.expiry;
      const shortId = Math.random().toString(16).substring(2, 10); // Genera ID corto de 8 chars hex
      const now = new Date();
      const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      
      const rowData: Record<string, any> = {};

      // Mapear campos dinámicamente según la estructura de tu Google Sheets
      const setMappedField = (internalKey: string, value: any, fallbackKey: string) => {
        const cloudKey = (expiryMapping as any)?.[internalKey] || fallbackKey;
        rowData[cloudKey] = value;
      };

      // ALINEACIÓN CON IMAGEN:
      setMappedField('id', shortId, 'ID_REGISTRO'); // Columna A
      setMappedField('uniqueKey', claveUnica, 'CLAVE_UNICA'); // Columna B
      setMappedField('timestamp', formattedDate, 'FECHA_INGRESO'); // Columna C
      setMappedField('barcode', sanitizedBarcode, 'COD_BARRAS'); // Columna D
      setMappedField('productName', data.productName, 'DESCRIPCION_PROD'); // Columna E
      setMappedField('mm', data.mm, 'MM'); // Columna F
      setMappedField('yyyy', data.yyyy, 'YYYY'); // Columna G
      setMappedField('event', 'VENCIMIENTOS', 'EVENTO'); // Columna H
      
      // Metadatos adicionales
      setMappedField('location', 'MANUAL', 'UBICACION'); 
      setMappedField('origin', 'REGISTRO DIRECTO', 'ORIGEN');

      if (data.fechaCC) setMappedField('fechaCC', data.fechaCC, 'fechaCC');

      // GUARDADO LOCAL
      const recordId = await dynamicDataService.saveRecord(tableName, rowData, shortId);
      
      // INICIAR RESPALDO EN NUBE (Segundo plano)
      dynamicDataService.syncRecord(recordId).then(() => {
        addToast('✅ Respaldo en la nube OK', 'success');
        SoundFX.play('success');
      }).catch((err) => {
        console.warn("Cloud sync deferred:", err.message);
        addToast('Guardado localmente. El respaldo se completará pronto.', 'warning');
      });

      return recordId;

    } catch (error: any) {
      addToast(`Error crítico al registrar: ${error.message}`, 'error');
      SoundFX.play('error');
    }
  }, [tableName]);

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
