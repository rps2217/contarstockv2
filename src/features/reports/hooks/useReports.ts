import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import * as sessionService from "../../../services/sessionService";
import { useLocation } from "react-router-dom";
import { SessionRepository } from "../../../repositories/SessionRepository";
import { ScanRepository } from "../../../repositories/ScanRepository";
import { useAppStore } from "@/store/mainAppStore";
import { db } from "../../../db";

export const useReports = () => {
  const location = useLocation();
  const { isStartSessionModalOpen, setStartSessionModalOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [isCleaning, setIsCleaning] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const filterType = searchParams.get("type") || "standard";

  const [limit, setLimit] = useState(50);

  const pullCloudData = useCallback(async () => {
    if (isPulling) return;
    setIsPulling(true);
    try {
      const config = (await import("../../../services/settings")).getSettings().cloudConfig;
      const countsTable = config?.countsTableName || "CONTEOS";
      const consolidatedTable = config?.consolidatedTableName || "CONSOLIDADO";
      const { supabaseSyncService } = await import("../../../services/supabaseSyncService");

      // 1. Descargar todas las sesiones de conteo/martillo
      const sessionResponse = await supabaseSyncService.pullBatch('SESIONES_CONTEO');
      if (sessionResponse.success && sessionResponse.rows && sessionResponse.rows.length > 0) {
        const sessionsToPut = sessionResponse.rows
          .filter((r: any) => r.sessionType === 'hammer' || r.sessionType === 'standard' || r.sessionType === 'reception')
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
            photoUrl: r.photoUrl || ''
          }));

        if (sessionsToPut.length > 0) {
          await db.sessions.bulkPut(sessionsToPut);
        }
      }

      // 2. Descargar conteos de la tabla CONTEOS (Hammer) para reconstruir scans
      const countsResponse = await supabaseSyncService.pullBatch(countsTable);
      if (countsResponse.success && countsResponse.rows && countsResponse.rows.length > 0) {
        const scansToPut = countsResponse.rows.map((r: any) => {
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
            yyyy
          };
        }).filter((item: any) => !!item.barcode && !!item.sessionId);

        if (scansToPut.length > 0) {
          await db.scans.bulkPut(scansToPut);
        }
      }

      // 3. Descargar consolidaciones de CONSOLIDADO (Standard) para reconstruir scans
      const consolidatedResponse = await supabaseSyncService.pullBatch(consolidatedTable);
      if (consolidatedResponse.success && consolidatedResponse.rows && consolidatedResponse.rows.length > 0) {
        const scansToPut = consolidatedResponse.rows.map((r: any) => {
          const uniqueKey = r.id || r.ID || '';
          const parts = uniqueKey.split('_');
          let sessionId = parts[1] || 'STD_IMPORT';
          
          const barcode = r.SKU || r.barcode || r.barcode_scanned || '';
          const quantity = Number(r.CANTIDAD || r.quantity || r.qty_scanned || r.CANT_FISICA || 1);
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
            yyyy: yyyyVal ? Number(yyyyVal) : undefined
          };
        }).filter((item: any) => !!item.barcode && !!item.sessionId);

        if (scansToPut.length > 0) {
          await db.scans.bulkPut(scansToPut);
        }
      }
      
      toast.success("Historial de auditorías actualizado con éxito");
    } catch (e: any) {
      console.error("Error pulling cloud sessions and counts:", e);
    } finally {
      setIsPulling(false);
    }
  }, [isPulling]);

  // Pull cloud data on mount
  useEffect(() => {
    pullCloudData();
  }, []);

  const pendingSyncCount = useLiveQuery(
    () => ScanRepository.getPendingSyncCount(),
    [],
    0,
  );

  // Mapa de ERPs para identificar multi-bulto
  const erpCounts = useLiveQuery(async () => {
    const allSessions = await SessionRepository.getAll();
    const counts: Record<string, number> = {};
    allSessions.forEach((s) => {
      if (s.erpOrder) {
        counts[s.erpOrder] = (counts[s.erpOrder] || 0) + 1;
      }
    });
    return counts;
  }, []);

  const sessions = useLiveQuery(
    async () => {
      const q = searchQuery.trim().toLowerCase();
      return await SessionRepository.getSessionsByType(filterType, q, limit);
    },
    [searchQuery, limit, filterType],
    undefined, // Cambiado a undefined para detectar carga
  );

  const isLoading = sessions === undefined;

  const loadMore = useCallback(() => {
    setLimit((prev) => prev + 50);
  }, []);

  const syncedCount = useLiveQuery(
    () => SessionRepository.getSyncedCount(),
    [],
    0,
  );

  const handleCleanSynced = useCallback(async () => {
    if (syncedCount === 0) {
      toast.error("No hay registros sincronizados para limpiar.");
      return;
    }

    if (
      !confirm("Se purgarán los datos ya respaldados en la nube. ¿Continuar?")
    )
      return;
    setIsCleaning(true);
    try {
      const count = await sessionService.cleanSyncedSessions();
      if (count > 0) {
        toast.success(`Purga exitosa: ${count} registros eliminados.`);
      }
    } catch (error) {
      toast.error("Error al realizar la limpieza.");
    } finally {
      setIsCleaning(false);
    }
  }, [syncedCount]);

  const handleDeleteSession = useCallback(
    async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      if (window.confirm("¿Eliminar registro permanentemente?")) {
        await sessionService.deleteSession(sessionId);
        setActiveMenuId(null);
      }
    },
    [],
  );

  const handleMenuToggle = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId((prev) => (prev === id ? null : id));
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
    }),
    [
      setStartSessionModalOpen,
      handleCleanSynced,
      handleDeleteSession,
      handleMenuToggle,
      loadMore,
      pullCloudData,
    ],
  );

  return {
    state: {
      sessions,
      isLoading: isLoading || isPulling,
      isPulling,
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

