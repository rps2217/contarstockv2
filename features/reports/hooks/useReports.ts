import React, { useState, useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import * as sessionService from "../../../services/sessionService";
import { useLocation } from "react-router-dom";
import { SessionRepository } from "../../../repositories/SessionRepository";
import { ScanRepository } from "../../../repositories/ScanRepository";
import { useAppStore } from "../../../store/useAppStore";

export const useReports = () => {
  const location = useLocation();
  const { isStartSessionModalOpen, setStartSessionModalOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [isCleaning, setIsCleaning] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const filterType = searchParams.get("type") || "standard";

  const [limit, setLimit] = useState(50);

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
    }),
    [
      setStartSessionModalOpen,
      handleCleanSynced,
      handleDeleteSession,
      handleMenuToggle,
      loadMore,
    ],
  );

  return {
    state: {
      sessions,
      isLoading,
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
