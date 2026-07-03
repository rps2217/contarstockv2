/**
 * useExpiry - Hook centralizado para gestión de vencimientos
 * 
 * Arquitectura simplificada v2.0 - Un solo hook, una sola responsabilidad
 * Usa cache centralizado para evitar recargas excesivas
 * Usa validación Zod para garantizar integridad de datos
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { db } from '@/db';
import { useAppStore } from '@/stores';
import { genericSyncEngine } from '@/services/cloud/GenericSyncEngine';
import { logger } from '@/services/logger';
import { ExpiryStatus, evaluateExpiry } from '../domain/expiryDomain';
import { formatExpiryDate, getStatusLabel } from '../domain/expiryDomain';
import { useCloudCache, clearCache } from '@/shared/hooks/useCloudCache';
import { validateExpiry, ExpiryRecordSchema, type ValidatedExpiryRecord } from '@/lib/schemas';

// Cache key para vencimientos
const EXPIRY_CACHE_KEY = 'expiry-records';

// ============================================================================
// TIPOS
// ============================================================================

// Re-exportar desde domain
export { ExpiryStatus } from '../domain/expiryDomain';
export { formatExpiryDate, getStatusLabel } from '../domain/expiryDomain';

export type ExpiryType = 'Individual' | 'Bulto/Caja' | 'Nube';

export interface ExpiryRecord {
  id: string;
  barcode: string;
  productName: string;
  providerName: string;
  providerRut?: string;
  mm: number;
  yyyy: number;
  quantity: number;
  location: string;
  observaciones: string;
  claveUnica: string;
  withdrawalDays: number;
  hasCanje: boolean;
  timestamp: number;
  syncStatus?: 'synced' | 'pending' | 'error';
  status: ExpiryStatus;
  daysLeft: number;
  expiryDate?: string;
  expiryDateObj: Date;
  withdrawalDate: Date;
  category: string;
  estado: string;
  type: ExpiryType;
}

export interface ExpiryFilters {
  searchQuery: string;
  selectedStatuses: ExpiryStatus[];
  selectedCategories: string[];
  dateRange: { start: Date | null; end: Date | null };
  onlyCanje: boolean | null;
}

export interface ExpiryStats {
  total: number;
  expired: number;
  critical: number;
  withdrawal: number;
  nextExpiry: number;
  safe: number;
}

/** Datos de entrada para crear un nuevo vencimiento (campos del formulario) */
export interface CreateExpiryData {
  barcode: string;
  productName: string;
  mm: number;
  yyyy: number;
  quantity: number;
  location: string;
  observaciones: string;
  providerName?: string;
  providerRut?: string;
  // Políticas del proveedor
  hasCanje?: boolean;
  withdrawalDays?: number;
}

interface UseExpiryReturn {
  records: ExpiryRecord[];
  filteredRecords: ExpiryRecord[];
  stats: ExpiryStats;
  filters: ExpiryFilters;
  isLoading: boolean;
  isSyncing: boolean;
  selectedIds: Set<string>;
  isDetailModalOpen: boolean;
  selectedRecord: ExpiryRecord | null;
  categories: string[];
  actions: {
    setSearchQuery: (query: string) => void;
    setSelectedStatuses: (statuses: ExpiryStatus[]) => void;
    setSelectedCategories: (categories: string[]) => void;
    setDateRange: (range: { start: Date | null; end: Date | null }) => void;
    setOnlyCanje: (value: boolean | null) => void;
    toggleSelection: (id: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
    deleteRecord: (id: string) => Promise<void>;
    bulkDelete: (ids: string[]) => Promise<void>;
    updateRecord: (id: string, data: Partial<ExpiryRecord>) => Promise<void>;
    createRecord: (data: CreateExpiryData) => Promise<string | null>;
    syncRecords: () => Promise<void>;
    setIsDetailModalOpen: (open: boolean) => void;
    setSelectedRecord: (record: ExpiryRecord | null) => void;
    clearFilters: () => void;
  };
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_WITHDRAWAL_DAYS = 30;

const normalizeText = (s: string): string => 
  (s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useExpiry = (): UseExpiryReturn => {
  const settings = useAppStore(state => state.settings);
  const tableName = settings?.cloudConfig?.expiryTableName || 'VENCIMIENTOS';

  const [records, setRecords] = useState<ExpiryRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ExpiryRecord | null>(null);

  const [filters, setFilters] = useState<ExpiryFilters>({
    searchQuery: '',
    selectedStatuses: [],
    selectedCategories: [],
    dateRange: { start: null, end: null },
    onlyCanje: null
  });

  // ============================================================================
  // CARGA DE DATOS CON CACHE CENTRALIZADO
  // ============================================================================

  // Fetcher para cache
  const fetchExpiryRecords = useCallback(async () => {
    const stored = await db.table('expirations').toArray();
    const nowDate = new Date();
    
    const processed: ExpiryRecord[] = stored.map(item => {
      const expiryDate = new Date(Number(item.yyyy), Number(item.mm) - 1, 1);
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      expiryDate.setDate(0);

      const evaluation = evaluateExpiry(
        expiryDate,
        { withdrawalDays: item.withdrawalDays ?? DEFAULT_WITHDRAWAL_DAYS, hasCanje: item.hasCanje ?? false },
        nowDate,
        item.quantity || 1
      );

      return {
        id: item.id as string,
        barcode: item.barcode as string || '',
        productName: (item.productName as string || '').toUpperCase(),
        providerName: (item.providerName as string || 'N/A').toUpperCase(),
        providerRut: item.providerRut as string | undefined,
        mm: Number(item.mm) || 1,
        yyyy: Number(item.yyyy) || new Date().getFullYear(),
        quantity: Number(item.quantity) || 1,
        location: (item.location as string || 'N/A').toUpperCase(),
        observaciones: item.observaciones as string || '',
        claveUnica: item.claveUnica as string || item.id as string,
        withdrawalDays: item.withdrawalDays as number ?? DEFAULT_WITHDRAWAL_DAYS,
        hasCanje: item.hasCanje as boolean ?? false,
        timestamp: Number(item.timestamp) || Date.now(),
        syncStatus: (item.syncStatus as 'synced' | 'pending' | 'error') || 'synced',
        status: evaluation.status,
        daysLeft: evaluation.daysLeft,
        expiryDate: expiryDate.toISOString(),
        expiryDateObj: expiryDate,
        withdrawalDate: evaluation.withdrawalDate ?? new Date(),
        category: (item.category as string) || 'GENERAL',
        estado: evaluation.label,
        type: (item.type as ExpiryType) || 'Individual'
      };
    });

    return processed;
  }, []);

  // Usar cache centralizado
  const { data: cachedRecords, isLoading: isCacheLoading, invalidate } = useCloudCache(
    EXPIRY_CACHE_KEY,
    fetchExpiryRecords,
    { ttl: 2 * 60 * 1000 } // 2 minutos
  );

  // Sincronizar cache con estado local
  useEffect(() => {
    if (cachedRecords) {
      setRecords(cachedRecords);
    }
  }, [cachedRecords]);

  // Refrescar manualmente
  const refreshRecords = useCallback(() => {
    invalidate();
  }, [invalidate]);

  // ============================================================================
  // COMPUTED: FILTRADO Y ESTADÍSTICAS
  // ============================================================================

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Filtro de búsqueda
      if (filters.searchQuery) {
        const query = normalizeText(filters.searchQuery);
        const terms = query.split(/\s+/).filter(Boolean);
        const searchIndex = normalizeText(`${record.barcode} ${record.productName} ${record.providerName} ${record.location}`);
        if (!terms.every(term => searchIndex.includes(term))) return false;
      }

      // Filtro por estado
      if (filters.selectedStatuses.length > 0) {
        if (!record.status || !filters.selectedStatuses.includes(record.status)) return false;
      }

      // Filtro por fecha de vencimiento
      if (filters.dateRange.start || filters.dateRange.end) {
        const recordDate = record.expiryDateObj;
        if (!recordDate) return false;
        if (filters.dateRange.start && recordDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && recordDate > filters.dateRange.end) return false;
      }

      // Filtro por canje
      if (filters.onlyCanje !== null) {
        if (record.hasCanje !== filters.onlyCanje) return false;
      }

      return true;
    });
  }, [records, filters]);

  const stats = useMemo((): ExpiryStats => {
    const result: ExpiryStats = { total: 0, expired: 0, critical: 0, withdrawal: 0, nextExpiry: 0, safe: 0 };
    records.forEach(r => {
      result.total++;
      switch (r.status) {
        case ExpiryStatus.EXPIRED: result.expired++; break;
        case ExpiryStatus.CRITICAL: result.critical++; break;
        case ExpiryStatus.WITHDRAWAL: result.withdrawal++; break;
        case ExpiryStatus.NEXT_EXPIRY: result.nextExpiry++; break;
        default: result.safe++;
      }
    });
    return result;
  }, [records]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    records.forEach(r => {
      if (r.location) cats.add(r.location);
    });
    return Array.from(cats).sort();
  }, [records]);

  // ============================================================================
  // ACCIONES
  // ============================================================================

  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setSelectedStatuses = useCallback((statuses: ExpiryStatus[]) => {
    setFilters(prev => ({ ...prev, selectedStatuses: statuses }));
  }, []);

  const setSelectedCategories = useCallback((categories: string[]) => {
    setFilters(prev => ({ ...prev, selectedCategories: categories }));
  }, []);

  const setDateRange = useCallback((range: { start: Date | null; end: Date | null }) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  }, []);

  const setOnlyCanje = useCallback((value: boolean | null) => {
    setFilters(prev => ({ ...prev, onlyCanje: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      selectedStatuses: [],
      selectedCategories: [],
      dateRange: { start: null, end: null },
      onlyCanje: null
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredRecords.map(r => r.id)));
  }, [filteredRecords]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    try {
      // Soft delete: marcar como pending_delete
      await db.table('expirations').update(id, { 
        syncStatus: 'pending_delete' as any,
        timestamp: Date.now()
      });
      clearCache(EXPIRY_CACHE_KEY);
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success('Registro eliminado', {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            await db.table('expirations').update(id, { syncStatus: 'synced' as any });
            refreshRecords();
          },
        },
      });
    } catch (error) {
      logger.error('useExpiry', 'Error deleting record', String(error));
      toast.error('Error al eliminar registro');
      throw error;
    }
  }, [refreshRecords]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    try {
      // Soft delete en masa
      await Promise.all(
        ids.map(id => db.table('expirations').update(id, { 
          syncStatus: 'pending_delete' as any,
          timestamp: Date.now()
        }))
      );
      clearCache(EXPIRY_CACHE_KEY);
      setRecords(prev => prev.filter(r => !ids.includes(r.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} registros eliminados`, {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            await Promise.all(
              ids.map(id => db.table('expirations').update(id, { syncStatus: 'synced' as any }))
            );
            refreshRecords();
          },
        },
      });
    } catch (error) {
      logger.error('useExpiry', 'Error bulk deleting', String(error));
      toast.error('Error al eliminar registros');
      throw error;
    }
  }, [refreshRecords]);

  const createRecord = useCallback(async (data: CreateExpiryData): Promise<string | null> => {
    try {
      // ========== VALIDACION ZOD ==========
      const validationResult = ExpiryRecordSchema.safeParse({
        barcode: data.barcode,
        productName: data.productName,
        providerName: data.providerName,
        providerRut: data.providerRut,
        mm: data.mm,
        yyyy: data.yyyy,
        quantity: data.quantity,
        location: data.location,
        observaciones: data.observaciones,
        withdrawalDays: data.withdrawalDays ?? 30,
        hasCanje: data.hasCanje ?? false,
      });
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        logger.warn('useExpiry', 'Validation failed', errors);
        toast.error(`Datos inválidos: ${errors}`);
        return null;
      }
      // ====================================
      
      const lastDay = new Date(data.yyyy, data.mm, 0).getDate();
      const claveUnica = `${data.barcode}${data.yyyy}${String(data.mm).padStart(2, '0')}${String(lastDay).padStart(2, '0')}`;
      
      // Verificar duplicado
      const existingRecord = await db.table('expirations')
        .where('claveUnica')
        .equals(claveUnica)
        .first();
      
      if (existingRecord) {
        toast.error('Ya existe un vencimiento para este producto y fecha');
        return null;
      }
      
      const id = crypto.randomUUID();
      const timestamp = Date.now();
      const expiryDateObj = new Date(data.yyyy, data.mm - 1, lastDay);
      const daysLeft = Math.ceil((expiryDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const withdrawalDays = data.withdrawalDays ?? 30;
      const hasCanje = data.hasCanje ?? false;
      
      let status: ExpiryStatus;
      if (daysLeft < 0) status = ExpiryStatus.EXPIRED;
      else if (daysLeft <= 15) status = ExpiryStatus.CRITICAL;
      else if (daysLeft <= withdrawalDays) status = ExpiryStatus.WITHDRAWAL;
      else if (daysLeft <= 90) status = ExpiryStatus.NEXT_EXPIRY;
      else status = ExpiryStatus.SAFE;
      
      const record: ExpiryRecord = {
        id,
        barcode: data.barcode,
        productName: data.productName,
        providerName: data.providerName || 'SIN PROVEEDOR',
        providerRut: data.providerRut,
        mm: data.mm,
        yyyy: data.yyyy,
        quantity: data.quantity,
        location: data.location,
        observaciones: data.observaciones,
        claveUnica,
        withdrawalDays,
        hasCanje,
        timestamp,
        syncStatus: 'pending',
        status,
        daysLeft,
        expiryDate: expiryDateObj.toISOString(),
        expiryDateObj,
        withdrawalDate: new Date(expiryDateObj.getTime() - withdrawalDays * 24 * 60 * 60 * 1000),
        category: 'GENERAL',
        estado: getStatusLabel(status),
        type: 'Individual'
      };
      
      await db.table('expirations').add(record);
      clearCache(EXPIRY_CACHE_KEY);
      setRecords(prev => [...prev, record]);
      toast.success('Vencimiento registrado');
      return id;
    } catch (error) {
      logger.error('useExpiry', 'Error creating record', String(error));
      toast.error('Error al crear vencimiento');
      return null;
    }
  }, []);

  const updateRecord = useCallback(async (id: string, data: Partial<ExpiryRecord>) => {
    try {
      const existing = await db.table('expirations').get(id);
      if (!existing) throw new Error('Registro no encontrado');

      const updated = {
        ...existing,
        ...data,
        timestamp: Date.now(),
        syncStatus: 'pending' as const
      };

      await db.table('expirations').put(updated as any);
      clearCache(EXPIRY_CACHE_KEY);
      setRecords(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      toast.success('Registro actualizado');
    } catch (error) {
      logger.error('useExpiry', 'Error updating record', String(error));
      toast.error('Error al actualizar registro');
      throw error;
    }
  }, []);

  const syncRecords = useCallback(async () => {
    try {
      setIsSyncing(true);
      await genericSyncEngine.sync('expirations');
      refreshRecords(); // Refresca el cache
      toast.success('Sincronización completada');
    } catch (error: any) {
      logger.error('useExpiry', 'Sync error', error.message || String(error));
      toast.error(error.message || 'Error al sincronizar');
    } finally {
      setIsSyncing(false);
    }
  }, [refreshRecords]);

  return {
    records,
    filteredRecords,
    stats,
    filters,
    isLoading: isCacheLoading,
    isSyncing,
    selectedIds,
    isDetailModalOpen,
    selectedRecord,
    categories,
    actions: {
      setSearchQuery,
      setSelectedStatuses,
      setSelectedCategories,
      setDateRange,
      setOnlyCanje,
      toggleSelection,
      selectAll,
      clearSelection,
      deleteRecord,
      bulkDelete,
      updateRecord,
      createRecord,
      syncRecords,
      setIsDetailModalOpen,
      setSelectedRecord,
      clearFilters
    }
  };
};
