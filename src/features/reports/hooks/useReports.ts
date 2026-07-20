import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { logger } from '@/services/logger';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import * as sessionService from '../../../services/sessionService';
import { useLocation } from 'react-router-dom';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ScanRepository } from '../../../repositories/ScanRepository';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { useAppStore } from '@/stores';

// Tipo para item consolidado en reportes
export interface ConsolidatedItem {
  barcode: string;
  productName: string;
  totalQuantity: number;
  locations: Set<string>;
  sources: Set<string>;
  locationsList: string;
  source: string;
  lastUpdated: number;
}

// Cache para consolidación en vivo (TTL: 2 minutos)
const LIVE_CACHE_TTL = 2 * 60 * 1000;
let liveCache: { data: ConsolidatedItem[]; timestamp: number } | null = null;

export const useReports = () => {
  const location = useLocation();
  const { isStartSessionModalOpen, setStartSessionModalOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialFilterType =
    (searchParams.get('type') as 'all' | 'standard' | 'hammer' | 'reception') || 'all';
  const [filterType, setFilterType] = useState<'all' | 'standard' | 'hammer' | 'reception'>(
    initialFilterType
  );

  const [limit, setLimit] = useState(50);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [liveConsolidated, setLiveConsolidated] = useState<ConsolidatedItem[]>([]);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [isLiveStale, setIsLiveStale] = useState(false);

  // Descarga y sincroniza del historial de cabeceras de bultos/sesiones
  const pullCloudData = useCallback(async () => {
    if (isPulling) return;
    setIsPulling(true);
    try {
      const config = (await import('../../../services/settings')).getSettings().cloudConfig;
      const countsTable = config?.countsTableName || 'CONTEOS';
      const consolidatedTable = config?.consolidatedTableName || 'CONSOLIDADO';
      const { supabaseSyncService } = await import('../../../services/supabaseSyncService');

      // 1. Descargar todas las sesiones de conteo/martillo
      const sessionResponse = await supabaseSyncService.pullBatch('SESIONES_CONTEO');
      if (sessionResponse.success && sessionResponse.rows && sessionResponse.rows.length > 0) {
        const sessionsToPut = sessionResponse.rows
          .filter(
            (r: any) =>
              r.sessionType === 'hammer' ||
              r.sessionType === 'standard' ||
              r.sessionType === 'reception'
          )
          .map((r: any) => ({
            id: r.id || r.ID,
            erpOrder: r.erpOrder || r.ERP_ORDEN || '',
            logisticsLabel: r.logisticsLabel || r.ETIQUETA_LOGISTICA || '',
            createdAt: Number(r.createdAt || r.TIMESTAMP || Date.now()),
            status: r.status || 'completed',
            sessionType: (r.sessionType || 'standard') as 'hammer' | 'standard' | 'reception',
            lastSyncTimestamp: r.lastSyncTimestamp || Date.now(),
            totalUnits: Number(r.totalUnits || r.TOTAL_UNIDADES || 0),
            totalSKUs: Number(r.totalSKUs || r.TOTAL_SKUS || 0),
            photoUrl: r.photoUrl || '',
          }));

        if (sessionsToPut.length > 0) {
          await SessionRepository.saveBatch(sessionsToPut);
        }
      }

      // 2. Descargar conteos de la tabla CONTEOS (Hammer) para reconstruir scans
      const countsResponse = await supabaseSyncService.pullBatch(countsTable);
      if (countsResponse.success && countsResponse.rows && countsResponse.rows.length > 0) {
        const scansToPut = countsResponse.rows
          .map((r: any) => {
            const uniqueKey = r.id || r.ID || '';
            const parts = uniqueKey.split('_');
            let sessionId = parts[1] || 'HM_IMPORT';

            const barcode = r.SKU || r.barcode || r.barcode_scanned || '';
            const quantity = Number(r.CANTIDAD || r.quantity || r.qty_scanned || 1);
            const locationVal = r.UBICACION || r.location || '';
            const batchVal = r.LOTE || r.batch || '';

            let mm: number | undefined;
            let yyyy: number | undefined;
            const exp = r.VENCIMIENTO || r.expiry || '';
            if (exp && exp !== 'SIN_FECHA' && exp.includes('-')) {
              const expParts = exp.split('-');
              mm = Number(expParts[0]);
              yyyy = Number(expParts[1]);
            }

            return {
              id: uniqueKey || crypto.randomUUID(),
              sessionId,
              barcode,
              quantity,
              timestamp: Date.now(),
              synced: 1,
              location: locationVal,
              batch: batchVal,
              mm,
              yyyy,
            };
          })
          .filter((item: any) => !!item.barcode && !!item.sessionId);

        if (scansToPut.length > 0) {
          await ScanRepository.saveBatch(scansToPut);
        }
      }

      // 3. Descargar consolidaciones de CONSOLIDADO (Standard) para reconstruir scans
      const consolidatedResponse = await supabaseSyncService.pullBatch(consolidatedTable);
      if (
        consolidatedResponse.success &&
        consolidatedResponse.rows &&
        consolidatedResponse.rows.length > 0
      ) {
        const scansToPut = consolidatedResponse.rows
          .map((r: any) => {
            const uniqueKey = r.id || r.ID || '';
            const parts = uniqueKey.split('_');
            let sessionId = parts[1] || 'STD_IMPORT';

            const barcode = r.SKU || r.barcode || r.barcode_scanned || '';
            const quantity = Number(
              r.CANTIDAD || r.quantity || r.qty_scanned || r.CANT_FISICA || 1
            );
            const locationVal = r.UBICACION || r.location || r.ETIQUETA || '';

            const mmVal = r.MM || r.month || r.yyyy || undefined;
            const yyyyVal = r.YYYY || r.year || undefined;

            return {
              id: uniqueKey || crypto.randomUUID(),
              sessionId,
              barcode,
              quantity,
              timestamp: Date.now(),
              synced: 1,
              location: locationVal,
              mm: mmVal ? Number(mmVal) : undefined,
              yyyy: yyyyVal ? Number(yyyyVal) : undefined,
            };
          })
          .filter((item: any) => !!item.barcode && !!item.sessionId);

        if (scansToPut.length > 0) {
          await ScanRepository.saveBatch(scansToPut);
        }
      }

      toast.success('Historial de auditorías actualizado con éxito');
    } catch (err: unknown) {
      logger.error(
        'useReports',
        'Error pulling cloud sessions and counts',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setIsPulling(false);
    }
  }, [isPulling]);

  // Consolidación en tiempo real: lee las lecturas brutas de las tablas de la nube
  // CON CACHE: evita recargas innecesarias
  const fetchLiveConsolidatedData = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // Si hay cache válido y no forzamos refresh, usar cache
    if (!forceRefresh && liveCache && now - liveCache.timestamp < LIVE_CACHE_TTL) {
      setLiveConsolidated(liveCache.data);
      setIsLiveLoading(false);
      setIsLiveStale(false);
      return;
    }

    // Si hay cache pero está expirado, mostrar datos stale
    if (liveCache && now - liveCache.timestamp >= LIVE_CACHE_TTL) {
      setLiveConsolidated(liveCache.data);
      setIsLiveStale(true);
    }

    setIsLiveLoading(true);
    try {
      const config = (await import('../../../services/settings')).getSettings().cloudConfig;
      const countsTable = config?.countsTableName || 'CONTEOS';
      const consolidatedTable = config?.consolidatedTableName || 'CONSOLIDADO';
      const { supabaseSyncService } = await import('../../../services/supabaseSyncService');

      const [countsRes, consolRes] = await Promise.all([
        supabaseSyncService.pullBatch(countsTable),
        supabaseSyncService.pullBatch(consolidatedTable),
      ]);

      const aggregation: Record<
        string,
        {
          barcode: string;
          productName: string;
          totalQuantity: number;
          locations: Set<string>;
          sources: Set<'Martillo' | 'Estándar'>;
          lastUpdated: number;
        }
      > = {};

      const processRows = (rows: any[], source: 'Martillo' | 'Estándar') => {
        for (const r of rows) {
          const barcode = r.SKU || r.barcode || r.barcode_scanned || '';
          if (!barcode) continue;

          const quantity = Number(r.CANTIDAD || r.quantity || r.qty_scanned || r.CANT_FISICA || 1);
          const locationVal = r.UBICACION || r.location || r.ETIQUETA || '';
          const timestamp = r.timestamp || r.TIMESTAMP || r.FECHA || Date.now();

          if (!aggregation[barcode]) {
            aggregation[barcode] = {
              barcode,
              productName: 'Cargando...',
              totalQuantity: 0,
              locations: new Set<string>(),
              sources: new Set<'Martillo' | 'Estándar'>(),
              lastUpdated: isNaN(Date.parse(timestamp)) ? Date.now() : Date.parse(timestamp),
            };
          }

          const entry = aggregation[barcode];
          entry.totalQuantity += quantity;
          if (locationVal) entry.locations.add(locationVal);
          entry.sources.add(source);
          entry.lastUpdated = Math.max(
            entry.lastUpdated,
            isNaN(Date.parse(timestamp)) ? Date.now() : Date.parse(timestamp)
          );
        }
      };

      if (countsRes.success && countsRes.rows) {
        processRows(countsRes.rows, 'Martillo');
      }
      if (consolRes.success && consolRes.rows) {
        processRows(consolRes.rows, 'Estándar');
      }

      const list = Object.values(aggregation);

      const resolvedList = await Promise.all(
        list.map(async item => {
          const prod = await productRepository.getById(item.barcode);
          const sourceArr = Array.from(item.sources);
          const sourceStr = sourceArr.length > 1 ? 'Mixto' : sourceArr[0] || 'Desconocido';
          return {
            ...item,
            productName: prod?.name || 'SKU Desconocido',
            locationsList: Array.from(item.locations).join(', ') || 'N/A',
            source: sourceStr,
          };
        })
      );

      // Sort by quantity desc
      resolvedList.sort((a, b) => b.totalQuantity - a.totalQuantity);

      // Guardar en cache
      liveCache = { data: resolvedList, timestamp: now };

      setLiveConsolidated(resolvedList);
      setIsLiveStale(false);
    } catch (err: unknown) {
      logger.error(
        'useReports',
        'Error cargando consolidación',
        err instanceof Error ? err.message : String(err)
      );
      // Mantener cache anterior si existe
      if (!liveCache) {
        toast.error('No se pudo regenerar la consolidación de la nube');
      }
    } finally {
      setIsLiveLoading(false);
    }
  }, []);

  // Sync data initially (con cache)
  useEffect(() => {
    // pullCloudData se ejecuta siempre para mantener sincronía
    pullCloudData();
    // fetchLiveConsolidatedData ahora usa cache interno
  }, [pullCloudData]);

  const pendingSyncCount = useLiveQuery(() => ScanRepository.getPendingSyncCount(), [], 0);

  const erpCounts = useLiveQuery(async () => {
    const allSessions = await SessionRepository.getAll();
    const counts: Record<string, number> = {};
    allSessions.forEach(s => {
      if (s.erpOrder) {
        counts[s.erpOrder] = (counts[s.erpOrder] || 0) + 1;
      }
    });
    return counts;
  }, []);

  // Carga de sesiones con paginación
  useEffect(() => {
    const loadSessions = async () => {
      const q = searchQuery.trim().toLowerCase();

      // Usar paginación con cursor para mejor performance
      const result = await SessionRepository.getPaginatedWithCursor({
        cursor: undefined,
        limit: limit,
        sortBy: 'createdAt',
        filter: filterType !== 'all' ? { sessionType: filterType } : undefined,
      });

      let results = result.items;

      // Filtrado local (para búsqueda)
      if (q) {
        results = results.filter(
          s =>
            s.id.toLowerCase().includes(q) ||
            s.erpOrder?.toLowerCase().includes(q) ||
            false ||
            s.logisticsLabel?.toLowerCase().includes(q) ||
            false
        );
      }

      setSessions(results);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor ?? undefined);
    };

    loadSessions();
  }, [searchQuery, limit, filterType]);

  const isLoading = sessions.length === 0;

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor) return;

    const q = searchQuery.trim().toLowerCase();
    const result = await SessionRepository.getPaginatedWithCursor({
      cursor,
      limit: 50,
      sortBy: 'createdAt',
      filter: filterType !== 'all' ? { sessionType: filterType } : undefined,
    });

    let newItems = result.items;
    if (q) {
      newItems = newItems.filter(
        s =>
          s.id.toLowerCase().includes(q) ||
          s.erpOrder?.toLowerCase().includes(q) ||
          false ||
          s.logisticsLabel?.toLowerCase().includes(q) ||
          false
      );
    }

    // Agregar a las existentes
    setSessions(prev => [...prev, ...newItems]);
    setHasMore(result.hasMore);
    setCursor(result.nextCursor ?? undefined);
  }, [hasMore, cursor, searchQuery, filterType]);

  const syncedCount = useLiveQuery(() => SessionRepository.getSyncedCount(), [], 0);

  const handleCleanSynced = useCallback(async () => {
    if (syncedCount === 0) {
      toast.error('No hay registros sincronizados para limpiar.');
      return;
    }

    if (!confirm('Se purgarán los datos ya respaldados en la nube. ¿Continuar?')) return;
    setIsCleaning(true);
    try {
      const count = await sessionService.cleanSyncedSessions();
      if (count > 0) {
        toast.success(`Purga exitosa: ${count} registros eliminados.`);
      }
    } catch (error: unknown) {
      toast.error('Error al realizar la limpieza.');
    } finally {
      setIsCleaning(false);
    }
  }, [syncedCount]);

  const handleDeleteSession = useCallback(async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar registro permanentemente?')) {
      await sessionService.deleteSession(sessionId);
      setActiveMenuId(null);
    }
  }, []);

  const handleMenuToggle = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(prev => (prev === id ? null : id));
  }, []);

  const actions = useMemo(
    () => ({
      setSearchQuery,
      setSelectedSessionId,
      setIsStartModalOpen: setStartSessionModalOpen,
      handleCleanSynced,
      handleDeleteSession,
      handleMenuToggle,
      loadMore,
      pullCloudData,
      fetchLiveConsolidatedData,
      setFilterType,
    }),
    [
      setStartSessionModalOpen,
      handleCleanSynced,
      handleDeleteSession,
      handleMenuToggle,
      loadMore,
      pullCloudData,
      fetchLiveConsolidatedData,
    ]
  );

  return {
    state: {
      sessions,
      isLoading: isLoading || isPulling,
      isPulling,
      liveConsolidated,
      isLiveLoading,
      isLiveStale,
      erpCounts: erpCounts || {},
      pendingSyncCount,
      syncedCount: syncedCount || 0,
      searchQuery,
      selectedSessionId,
      isCleaning,
      isStartModalOpen: isStartSessionModalOpen,
      activeMenuId,
      filterType,
      hasMore: sessions?.length === limit,
    },
    actions,
  };
};
