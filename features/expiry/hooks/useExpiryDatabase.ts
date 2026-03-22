
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db';
import { Product, Provider } from '../../../types';
import { format, differenceInDays, isPast, isBefore, addDays, parseISO, startOfMonth, addMonths, endOfMonth, isWithinInterval } from 'date-fns';
import { importExpirationsFromCloud, importProvidersFromCloud } from '../../../services/syncManager';
import { addExpirationToCloud, removeExpirationFromCloud } from '../../../services/expirySync';
import { normalizeSku } from '../../../services/utils';
import { toast } from 'sonner';

export type ExpiryStatus = 'expired' | 'critical' | 'next_expiry' | 'safe' | 'withdrawal';

export interface ExpiryPreferences {
  hideExpiredByDefault: boolean;
  defaultSort: 'expiry' | 'withdrawal';
  compactView: boolean;
}

const DEFAULT_PREFERENCES: ExpiryPreferences = {
  hideExpiredByDefault: false,
  defaultSort: 'withdrawal',
  compactView: false
};

export const useExpiryDatabase = () => {
  const [preferences, setPreferences] = useState<ExpiryPreferences>(() => {
    const saved = localStorage.getItem('expiry_preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<ExpiryStatus[]>(() => {
    if (preferences.hideExpiredByDefault) {
      return ['critical', 'next_expiry', 'safe', 'withdrawal'];
    }
    return [];
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCanje, setSelectedCanje] = useState<'all' | 'canje' | 'markdown'>('all');
  const [displayLimit, setDisplayLimit] = useState(50);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setDisplayLimit(50);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset limit on filter change
  useEffect(() => {
    setDisplayLimit(50);
  }, [selectedStatuses, selectedCategories, selectedCanje]);

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

    const processItem = (item: any) => {
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
      
      if (expiry) {
        // Si el valor es 0, usamos 30 días de anticipación.
        // Si no hay proveedor o no hay días definidos, usamos 30 por defecto.
        const rawDays = provider?.withdrawalDays ?? 30;
        const days = rawDays === 0 ? 30 : rawDays;
        withdrawalDate = addDays(expiry, -days);
      }

      const status = getStatus(expiry, withdrawalDate);
      const daysLeft = expiry ? differenceInDays(expiry, now) : 0;

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
        location: item.location || 'N/A'
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
    const cloudItems = (cloudExpirations || []).map(exp => processItem({
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

  const processedScans = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    
    return baseProcessedData.filter(item => {
      const matchesSearch = 
        item.productName.toLowerCase().includes(query) ||
        item.barcode.includes(query) ||
        (item.batch && item.batch.toLowerCase().includes(query));
      
      const matchesFilter = selectedStatuses.length === 0 || selectedStatuses.includes(item.status);
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const matchesCanje = selectedCanje === 'all' || 
        (selectedCanje === 'canje' && item.hasCanje) ||
        (selectedCanje === 'markdown' && !item.hasCanje);

      return matchesSearch && matchesFilter && matchesCategory && matchesCanje;
    }).sort((a, b) => {
      // Priority 1: Expired items (if not filtered out)
      if (a.status === 'expired' && b.status !== 'expired') return -1;
      if (a.status !== 'expired' && b.status === 'expired') return 1;

      // Priority 2: User preference sort
      if (preferences.defaultSort === 'withdrawal') {
        if (!a.withdrawalDate) return 1;
        if (!b.withdrawalDate) return -1;
        return a.withdrawalDate.getTime() - b.withdrawalDate.getTime();
      }

      // Default: Expiry date sort
      if (!a.expiryDateObj) return 1;
      if (!b.expiryDateObj) return -1;
      return a.expiryDateObj.getTime() - b.expiryDateObj.getTime();
    }).map(item => {
      const maxLifeDays = 730; 
      const percent = Math.max(0, Math.min(100, (item.daysLeft / maxLifeDays) * 100));
      return { ...item, lifePercent: percent };
    });
  }, [baseProcessedData, debouncedSearch, selectedStatuses, selectedCategories, selectedCanje]);

  const stats = useMemo(() => {
    const filteredByFilters = baseProcessedData.filter(item => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      const matchesCanje = selectedCanje === 'all' || 
        (selectedCanje === 'canje' && item.hasCanje) ||
        (selectedCanje === 'markdown' && !item.hasCanje);
      return matchesCategory && matchesCanje;
    });

    return {
      expired: filteredByFilters.filter(s => s.status === 'expired').length,
      critical: filteredByFilters.filter(s => s.status === 'critical').length,
      next_expiry: filteredByFilters.filter(s => s.status === 'next_expiry').length,
      withdrawal: filteredByFilters.filter(s => s.status === 'withdrawal').length,
      total: filteredByFilters.length
    };
  }, [baseProcessedData, selectedCategories, selectedCanje]);

  const handleSyncExpirations = useCallback(async () => {
    try {
      setIsSyncing(true);
      const [expCount, provCount] = await Promise.all([
        importExpirationsFromCloud(),
        importProvidersFromCloud()
      ]);
      toast.success(`Sincronización completa: ${expCount} vencimientos y ${provCount} proveedores.`);
    } catch (error: any) {
      toast.error(`Error al sincronizar: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleRemoveItem = useCallback(async (item: any) => {
    try {
      // 1. Si es un ítem de la nube, intentar borrarlo allá primero
      if (item.type === 'Nube' && item.claveUnica) {
        await removeExpirationFromCloud(item.claveUnica);
      }

      // 2. Borrado local
      if (item.type === 'Individual') {
        await db.scans.delete(item.id);
      } else if (item.type === 'Bulto/Caja') {
        await db.sessions.delete(item.id);
        await db.scans.where('sessionId').equals(item.id).delete();
      } else if (item.type === 'Nube') {
        await db.cloudExpirations.delete(item.id);
      }
      toast.success('Ítem retirado correctamente');
    } catch (error: any) {
      toast.error(`Error al retirar el ítem: ${error.message}`);
    }
  }, []);

  const handleBulkRemove = useCallback(async (ids: Set<string>) => {
    try {
      const selectedItems = processedScans.filter(s => ids.has(s.id));
      for (const item of selectedItems) {
        // Borrado en nube si aplica
        if (item.type === 'Nube' && item.claveUnica) {
          try {
            await removeExpirationFromCloud(item.claveUnica);
          } catch (e) {
            console.warn(`Fallo al borrar ${item.claveUnica} en nube, continuando con local...`);
          }
        }

        // Borrado local
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
      toast.success(`${selectedItems.length} ítems retirados correctamente`);
    } catch (error) {
      toast.error('Error al retirar los ítems');
    }
  }, [processedScans]);

  const handleAddItem = useCallback(async (data: {
    barcode: string;
    productName: string;
    mm: number;
    yyyy: number;
    quantity: number;
  }) => {
    try {
      setIsSyncing(true);
      
      // Generar clave única localmente para validación previa
      const mmPadded = String(data.mm).padStart(2, '0');
      const lastDay = new Date(data.yyyy, data.mm, 0).getDate();
      const ddPadded = String(lastDay).padStart(2, '0');
      const claveUnica = `${data.barcode}${data.yyyy}${mmPadded}${ddPadded}`;

      // 0. Validar duplicado localmente antes de ir a la nube
      const existingLocal = await db.cloudExpirations.where('claveUnica').equals(claveUnica).first();
      if (existingLocal) {
        toast.error('Este producto ya está registrado para el mes y año seleccionados.');
        return;
      }

      // 1. Guardar en la nube (GAS validará duplicados)
      const result = await addExpirationToCloud(data);
      
      // 2. Guardar localmente en cloudExpirations para reflejo inmediato
      if (result.success) {
        if (result.message === "Ya existe") {
          toast.info('El producto ya existía en la nube. Se ha actualizado la vista local.');
        } else {
          toast.success('Producto registrado exitosamente');
        }

        // Intentar agregar localmente (el índice único &claveUnica protegerá si hay carreras)
        try {
          await db.cloudExpirations.add({
            id: result.id || crypto.randomUUID(),
            barcode: data.barcode,
            productName: data.productName,
            mm: data.mm,
            yyyy: data.yyyy,
            event: 'VENCIMIENTOS',
            quantity: data.quantity,
            location: 'MANUAL',
            timestamp: Date.now(),
            claveUnica: result.clave || claveUnica
          });
        } catch (dbError: any) {
          // Si falla por duplicado aquí, simplemente ignoramos ya que ya informamos al usuario
          // Dexie puede envolver ConstraintError en AbortError
          const isConstraintError = 
            dbError.name === 'ConstraintError' || 
            (dbError.name === 'AbortError' && dbError.inner?.name === 'ConstraintError') ||
            dbError.message?.includes('ConstraintError') ||
            dbError.message?.includes('uniqueness requirements');
            
          if (!isConstraintError) throw dbError;
        }
      }
    } catch (error: any) {
      toast.error(`Error al agregar: ${error.message}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleUpdatePreferences = useCallback((newPrefs: Partial<ExpiryPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('expiry_preferences', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    state: {
      searchQuery,
      selectedStatuses,
      selectedCategories,
      selectedCanje,
      displayLimit,
      isSyncing,
      selectedIds,
      verifiedIds,
      processedScans,
      categories,
      stats,
      preferences
    },
    actions: {
      setSearchQuery,
      setSelectedStatuses,
      setSelectedCategories,
      setSelectedCanje,
      setDisplayLimit,
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
