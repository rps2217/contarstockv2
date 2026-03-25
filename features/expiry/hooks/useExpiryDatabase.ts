
import { useMemo, useEffect, useCallback, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Product, Provider } from '../../../types';
import { format, differenceInDays, isPast, isBefore, addDays, parseISO, startOfMonth, addMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { importExpirationsFromCloud, importProvidersFromCloud } from '../../../services/syncManager';
import { addExpirationToCloud, removeExpirationFromCloud } from '../../../services/expirySync';
import { normalizeSku } from '../../../services/utils';
import { useToastStore } from '../../../store/useToastStore';
import { useExpiryStore, ExpiryItem, ExpiryStatus, ExpiryPreferences } from '../../../store/useExpiryStore';
import { SyncQueueService } from '../../../services/syncQueueService';

export type { ExpiryStatus, ExpiryPreferences };

export const useExpiryDatabase = () => {
  const { addToast } = useToastStore.getState();
  
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
  const cloudExpirations = useLiveQuery(() =>
    db.cloudExpirations.toArray()
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
    const criticalThreshold = addDays(now, 30);
    const startOfNextMonth = startOfMonth(addMonths(now, 1));
    const endOfFourMonths = endOfMonth(addMonths(now, 4));
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    const getStatus = (expiry: Date | null, withdrawalDate: Date | null): ExpiryStatus => {
      if (!expiry) return 'safe';
      if (isPast(expiry)) return 'expired';
      if (isBefore(expiry, criticalThreshold)) return 'critical';
      if (withdrawalDate && (isPast(withdrawalDate) || isWithinInterval(withdrawalDate, { start: currentMonthStart, end: currentMonthEnd }))) {
        return 'withdrawal';
      }
      if (isWithinInterval(expiry, { start: startOfNextMonth, end: endOfFourMonths })) {
        return 'next_expiry';
      }
      return 'safe';
    };

    const processItem = (item: any): ExpiryItem => {
      let expiry: Date | null = null;
      if (item.expiryDate) {
        expiry = parseISO(item.expiryDate);
      } else if (item.mm && item.yyyy) {
        expiry = new Date(item.yyyy, item.mm, 0);
      } else if (item.expiryDateObj) {
        expiry = item.expiryDateObj;
      }

      const product = productMap.get(normalizeSku(item.barcode));
      const productName = product?.name || item.productName || 'Producto Desconocido';
      const supplierRut = product?.supplierRut ? normalizeSku(product.supplierRut) : null;
      const provider = supplierRut ? providerMap.get(supplierRut) : null;
      
      let withdrawalDate: Date | null = null;
      // NUEVO ENFOQUE: 0 días en H -> SIN CANJE, > 0 días -> CON CANJE
      const hasCanje = provider ? (provider.withdrawalDays ?? 0) > 0 : false;
      
      if (item.fechaCC) {
        withdrawalDate = parseISO(item.fechaCC);
      } else if (expiry) {
        // Si el valor es 0, usamos 30 días de anticipación.
        // Si no hay proveedor o no hay días definidos, usamos 30 por defecto.
        const rawDays = provider?.withdrawalDays ?? 30;
        const days = rawDays === 0 ? 30 : rawDays;
        withdrawalDate = addDays(expiry, -days);
      }

      const status = getStatus(expiry, withdrawalDate);
      const daysLeft = expiry ? differenceInDays(expiry, now) : 0;
      const estado = !withdrawalDate 
        ? "" 
        : `${hasCanje ? "Canje" : "Merma"} ${format(withdrawalDate, 'MMM yyyy', { locale: es })}`;

      // CALCULAR RISK SCORE (0-100)
      let riskScore = 0;
      if (expiry) {
        // Factor Tiempo (60%): 0 días = 60 pts, 180+ días = 0 pts
        const timeScore = Math.max(0, 60 - (daysLeft / 3)); 
        
        // Factor Comercial (25%): Merma = 25 pts, Canje = 10 pts
        const commercialScore = hasCanje ? 10 : 25;
        
        // Factor Volumen (15%): 1 unidad = 1 pt, 50+ unidades = 15 pts
        const volumeScore = Math.min(15, (item.quantity || 1) * 0.3);
        
        riskScore = Math.round(timeScore + commercialScore + volumeScore);
        
        // Penalización por ya vencido
        if (isPast(expiry)) riskScore = 100;
      }

      return {
        ...item,
        productName,
        providerName: provider?.name || product?.supplier || 'N/A',
        category: product?.category || 'GENERAL',
        withdrawalDays: provider?.withdrawalDays || 0,
        hasCanje,
        status,
        daysLeft,
        expiryDateObj: expiry,
        withdrawalDate,
        location: item.location || 'N/A',
        estado,
        quantity: item.quantity || 1,
        riskScore,
        price: product?.price || 0
      };
    };

    const individualItems = scans.map(scan => processItem({ ...scan, type: 'Individual' }));
    const sessionItems = (sessions || []).map(session => processItem({
      id: session.id,
      barcode: session.logisticsLabel,
      mm: session.mm,
      yyyy: session.yyyy,
      batch: session.batch || 'N/A',
      type: 'Bulto/Caja',
      timestamp: session.createdAt,
      quantity: session.totalUnits || 0,
      location: session.logisticsLabel || 'N/A'
    }));
    const cloudItems = (cloudExpirations || [])
      .filter(exp => !exp.event || exp.event.toUpperCase() === 'VENCIMIENTOS' || exp.event.toUpperCase() === 'VENCIMIENTO')
      .map(exp => processItem({
      id: exp.id,
      barcode: exp.barcode,
      productName: exp.productName,
      mm: exp.mm,
      yyyy: exp.yyyy,
      batch: 'N/A',
      type: 'Nube',
      timestamp: exp.timestamp,
      quantity: exp.quantity || 0,
      location: exp.location || 'N/A',
      claveUnica: exp.claveUnica
    }));

    return [...individualItems, ...sessionItems, ...cloudItems];
  }, [scans, sessions, cloudExpirations, productMap, providerMap]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    baseProcessedData.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [baseProcessedData]);

  const contextFilteredData = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    
    return baseProcessedData.filter(item => {
      // 1. Search Query
      if (query) {
        const matchesSearch = 
          item.productName.toLowerCase().includes(query) ||
          item.barcode.includes(query) ||
          (item.batch && item.batch.toLowerCase().includes(query)) ||
          (item.providerName && item.providerName.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // 2. Categories
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
        return false;
      }

      // 3. Canje
      if (selectedCanje === 'canje' && !item.hasCanje) return false;
      if (selectedCanje === 'markdown' && item.hasCanje) return false;

      // 4. Estado
      if (selectedEstado && item.estado !== selectedEstado) return false;

      // 5. Date Range (Expiry)
      if (dateRange.start || dateRange.end) {
        if (!item.expiryDateObj) return false;
        const itemDate = item.expiryDateObj.getTime();
        
        if (dateRange.start) {
          const start = new Date(dateRange.start).setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (dateRange.end) {
          const end = new Date(dateRange.end).setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }

      // 6. Withdrawal Date Range
      if (withdrawalDateRange.start || withdrawalDateRange.end) {
        if (!item.withdrawalDate) return false;
        const itemDate = item.withdrawalDate.getTime();
        
        if (withdrawalDateRange.start) {
          const start = new Date(withdrawalDateRange.start).setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (withdrawalDateRange.end) {
          const end = new Date(withdrawalDateRange.end).setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }

      return true;
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

  const stats = useMemo(() => {
    const expiredCount = contextFilteredData.filter(s => s.status === 'expired').length;
    const criticalCount = contextFilteredData.filter(s => s.status === 'critical').length;
    const nextExpiryCount = contextFilteredData.filter(s => s.status === 'next_expiry').length;
    const withdrawalCount = contextFilteredData.filter(s => s.status === 'withdrawal').length;
    
    // Priority Items (Top 5 by risk score)
    const priorityItems = [...contextFilteredData]
      .filter(item => item.status !== 'safe')
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
      .slice(0, 5);

    // Volume Alerts (Categories with most items)
    const categoryCounts: Record<string, number> = {};
    contextFilteredData.forEach(item => {
      if (item.status !== 'safe') {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    });
    const volumeAlerts = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Potential Savings
    const potentialSavings = contextFilteredData.reduce((acc, item) => {
      return acc + ((item as any).price || 0) * item.quantity;
    }, 0);

    return {
      expired: expiredCount,
      critical: criticalCount,
      next_expiry: nextExpiryCount,
      withdrawal: withdrawalCount,
      total: contextFilteredData.length,
      priorityItems,
      volumeAlerts,
      potentialSavings
    };
  }, [contextFilteredData]);

  const handleSyncExpirations = useCallback(async () => {
    try {
      setIsSyncing(true);
      const [expCount, provCount] = await Promise.all([
        importExpirationsFromCloud(),
        importProvidersFromCloud()
      ]);
      addToast(`Sincronización completa: ${expCount} vencimientos y ${provCount} proveedores.`, 'success');
    } catch (error: any) {
      addToast(`Error al sincronizar: ${error.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleRemoveItem = useCallback(async (item: any) => {
    try {
      // 1. Borrado local inmediato (Optimistic UI)
      if (item.type === 'Individual') {
        await db.scans.delete(item.id);
      } else if (item.type === 'Bulto/Caja') {
        await db.sessions.delete(item.id);
        await db.scans.where('sessionId').equals(item.id).delete();
      } else if (item.type === 'Nube') {
        await db.cloudExpirations.delete(item.id);
      }
      addToast('Ítem retirado correctamente', 'success');

      // 2. Si es un ítem de la nube, borrarlo allá en segundo plano
      if (item.type === 'Nube' && item.claveUnica) {
        setPendingOperations(p => p + 1);
        removeExpirationFromCloud(item.claveUnica)
          .catch(e => {
            console.error('Error en borrado en segundo plano:', e);
            addToast(`Error de sincronización al borrar: ${item.productName}`, 'error');
            // Opcional: Podríamos reinsertar el ítem aquí si falla
          })
          .finally(() => {
            setPendingOperations(p => Math.max(0, p - 1));
          });
      }
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
          await db.cloudExpirations.delete(item.id);
        }
      }
      setSelectedIds(new Set());
      addToast(`${selectedItems.length} ítems retirados correctamente`, 'success');

      // 2. Borrado en nube en segundo plano
      const cloudItems = selectedItems.filter(i => i.type === 'Nube' && i.claveUnica);
      if (cloudItems.length > 0) {
        setPendingOperations(p => p + cloudItems.length);
        
        // Procesar en paralelo sin bloquear la UI
        Promise.allSettled(
          cloudItems.map(item => 
            removeExpirationFromCloud(item.claveUnica).finally(() => {
              setPendingOperations(p => Math.max(0, p - 1));
            })
          )
        ).then(results => {
          const failed = results.filter(r => r.status === 'rejected');
          if (failed.length > 0) {
            addToast(`Hubo errores al sincronizar ${failed.length} retiros en la nube.`, 'error');
          }
        });
      }
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
      const existingLocal = await db.cloudExpirations.where('claveUnica').equals(claveUnica).first();
      if (existingLocal) {
        addToast('Este producto ya está registrado para el mes y año seleccionados.', 'error');
        return;
      }

      // 2. Guardar localmente de inmediato (Optimistic UI)
      const localId = crypto.randomUUID();
      try {
        await db.cloudExpirations.add({
          id: localId,
          barcode: sanitizedBarcode,
          productName: data.productName,
          mm: data.mm,
          yyyy: data.yyyy,
          event: 'VENCIMIENTOS',
          quantity: data.quantity,
          location: 'MANUAL',
          timestamp: Date.now(),
          claveUnica: claveUnica,
          fechaCC: data.fechaCC
        });
        addToast('Producto registrado exitosamente', 'success');
      } catch (dbError: any) {
        const isConstraintError = 
          dbError.name === 'ConstraintError' || 
          (dbError.name === 'AbortError' && dbError.inner?.name === 'ConstraintError') ||
          dbError.message?.includes('ConstraintError') ||
          dbError.message?.includes('uniqueness requirements');
          
        if (isConstraintError) {
           addToast('Este producto ya está registrado para el mes y año seleccionados.', 'error');
           return;
        }
        throw dbError;
      }

      // 3. Guardar en la nube en segundo plano
      setPendingOperations(p => p + 1);
      addExpirationToCloud({
        ...data,
        barcode: sanitizedBarcode
      })
        .then(async (result: any) => {
          if (result.success) {
            if (result.queued) {
              addToast('Producto guardado localmente (pendiente de sincronización)', 'info');
              return;
            }
            if (result.message === "Ya existe") {
              addToast('Este producto ya está registrado en la nube.', 'error');
              await db.cloudExpirations.delete(localId);
            }
            // Actualizar el ID/clave si la nube devolvió algo diferente
            if (result.id && result.id !== localId) {
               await db.cloudExpirations.update(localId, { id: result.id, claveUnica: result.clave || claveUnica });
            }
          }
        })
        .catch(async (error) => {
          console.error('Error al guardar en la nube:', error);
          if (error.message.includes('Ya existe')) {
            addToast('Este producto ya está registrado en la nube.', 'error');
            await db.cloudExpirations.delete(localId);
          } else {
            addToast(`Error de sincronización al guardar: ${data.productName}`, 'error');
          }
          // Opcional: Revertir el cambio local si falla la nube
          // await db.cloudExpirations.delete(localId);
        })
        .finally(() => {
          setPendingOperations(p => Math.max(0, p - 1));
        });

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
