/**
 * useSyncCenter - Hook de dominio para la lógica de SyncCenterPage
 */

import { useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../db";
import { syncRegistry } from "../../../services/cloud/syncRegistry";
import { genericSyncEngine } from "../../../services/cloud/GenericSyncEngine";
import { useSyncStore } from "../../../store/useSyncStore";
import { useToastStore } from "../../../store/useToastStore";
import type { SyncTabType, SyncLogEntry, SyncQueueItem } from "@/types/global/sync";
import type { SyncStatus } from "@/types/global/sync";

interface GenericDexieTable {
  count(): Promise<number>;
  where(key: string): { 
    equals(value: string): { 
      count(): Promise<number>; 
      toArray(): Promise<Record<string, unknown>[]> 
    } 
  };
  toArray(): Promise<Record<string, unknown>[]>;
  filter(fn: (item: Record<string, unknown>) => boolean): { count(): Promise<number> };
  get(key: unknown): Promise<Record<string, unknown> | undefined>;
  delete(key: unknown): Promise<number | void>;
  update(key: unknown, changes: Record<string, unknown>): Promise<number>;
}

interface TableStats {
  total: number;
  pending: number;
}

interface UseSyncCenterReturn {
  isSyncing: boolean;
  activeTab: SyncTabType;
  syncLogs: SyncLogEntry[];
  selectedQueueItem: SyncQueueItem | null;
  stats: Record<string, TableStats> | undefined;
  pendingQueueItems: SyncQueueItem[] | undefined;
  totalPending: number;
  isOnline: boolean;
  
  setActiveTab: (tab: SyncTabType) => void;
  setSelectedQueueItem: (item: SyncQueueItem | null) => void;
  handleFullSync: () => Promise<void>;
  handleSingleTableSync: (key: string) => Promise<void>;
  handleDiscardItem: (item: SyncQueueItem) => Promise<void>;
  handleForceComplete: (item: SyncQueueItem) => Promise<void>;
}

export function useSyncCenter(): UseSyncCenterReturn {
  const { addToast } = useToastStore();
  const { incidents, lastSyncTime, isSupabaseConnected, syncError, clearIncidents, conflicts } = useSyncStore();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<SyncTabType>("queue");
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<SyncQueueItem | null>(null);
  
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  const getTable = (name: string): GenericDexieTable | undefined => {
    return (db as unknown as Record<string, GenericDexieTable>)[name];
  };

  const stats = useLiveQuery(async () => {
    const tableStats: Record<string, TableStats> = {};
    
    for (const [key, meta] of Object.entries(syncRegistry)) {
      const localTable = getTable(meta.localTable);
      if (!localTable) continue;

      let query: GenericDexieTable = localTable;
      if (meta.filterField && meta.filterValue) {
        query = localTable.where(meta.filterField).equals(meta.filterValue) as unknown as GenericDexieTable;
      }

      const total = await query.count();
      
      const pendingRecords = await query.filter((item: Record<string, unknown>) => {
        const status = item.syncStatus as SyncStatus | undefined;
        return status === "pending" || status === "error";
      }).count();
      
      const pendingDeleteRecords = await query.filter((item: Record<string, unknown>) => {
        const status = item.syncStatus as SyncStatus | undefined;
        return status === "pending_delete";
      }).count();
      
      tableStats[key] = { total, pending: pendingRecords + pendingDeleteRecords };
    }
    return tableStats;
  }, []);

  const pendingQueueItems = useLiveQuery(async () => {
    const list: SyncQueueItem[] = [];
    
    for (const [key, meta] of Object.entries(syncRegistry)) {
      const localTable = getTable(meta.localTable);
      if (!localTable) continue;
      
      let records: Record<string, unknown>[] = [];
      
      if (meta.filterField === "tableName" && meta.filterValue) {
        const query = localTable.where(meta.filterField).equals(meta.filterValue);
        records = await query.toArray();
      } else {
        records = await localTable.toArray();
        if (meta.filterField && meta.filterValue) {
          records = records.filter((r) => r[meta.filterField!] === meta.filterValue);
        }
      }
      
      const filtered = records.filter((r) => {
        const status = r.syncStatus as SyncStatus | undefined;
        return status === "pending" || status === "error" || status === "pending_delete";
      });

      for (const r of filtered) {
        let visualName = "Registro";
        
        if (typeof r.name === "string") visualName = r.name;
        else if (typeof r.logisticsLabel === "string") visualName = r.logisticsLabel;
        else if (typeof r.barcode === "string") visualName = r.barcode;
        else if (r.data && typeof r.data === "object") {
          const data = r.data as Record<string, unknown>;
          if (typeof data.barcode === "string") {
            visualName = `${data.barcode} • ${(data.productName as string) || "Producto"}`;
          } else if (typeof data.name === "string") {
            visualName = data.name as string;
          }
        } else if (typeof r.id === "string") {
          visualName = `ID: ${(r.id as string).substring(0, 8)}...`;
        }

        const primaryKey = (r[meta.primaryKey] as string) || (r.id as string);
        
        list.push({
          id: primaryKey,
          key,
          localTable: meta.localTable,
          remoteTable: meta.remoteTable,
          primaryKey: meta.primaryKey,
          status: (r.syncStatus as SyncStatus) || "pending",
          timestamp: (r.timestamp as number) || (r.updatedAt as number) || Date.now(),
          displayName: visualName,
          rawData: r as unknown as Record<string, unknown>
        });
      }
    }
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }, [selectedQueueItem]);

  const totalPending = stats ? Object.values(stats).reduce((acc, curr) => acc + curr.pending, 0) : 0;

  const handleFullSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncLogs([]);
    addToast("Iniciando sincronizacion completa robusta...", "info");
    
    try {
      const keys = Object.keys(syncRegistry);
      for (const key of keys) {
        setSyncLogs(prev => [{ table: key, status: "syncing", msg: "Sincronizando..." }, ...prev]);
        const res = await genericSyncEngine.sync(key);
        
        setSyncLogs(prev => {
          const newLogs = [...prev];
          const index = newLogs.findIndex(l => l.table === key);
          if (res.success) {
            const push = res.pushRes?.success || 0;
            const pull = (res.pullRes?.added || 0) + (res.pullRes?.updated || 0);
            newLogs[index] = { 
              table: key, 
              status: "success", 
              msg: `Sometido: ${push} descargas: ${pull}` 
            };
          } else {
            newLogs[index] = { 
              table: key, 
              status: "error", 
              msg: res.error || "Fallo conexion" 
            };
          }
          return newLogs;
        });
      }
      addToast("Ciclo de reconciliacion completado", "success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      addToast(`Sincronizacion trunca: ${errorMessage}`, "error");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, addToast]);

  const handleSingleTableSync = useCallback(async (key: string) => {
    addToast(`Sincronizando tabla ${key.toUpperCase()}...`, "info");
    try {
      const res = await genericSyncEngine.sync(key);
      if (res.success) {
        const push = res.pushRes?.success || 0;
        const pull = (res.pullRes?.added || 0) + (res.pullRes?.updated || 0);
        addToast(`Sincronizado ${key.toUpperCase()}: Subidos ${push} Descargados ${pull}`, "success");
      } else {
        addToast(`Conflicto de sincronizacion en ${key}: ${res.error}`, "error");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      addToast(`Error: ${errorMessage}`, "error");
    }
  }, [addToast]);

  const handleDiscardItem = useCallback(async (item: SyncQueueItem) => {
    const confirmDiscard = window.confirm(
      "¿Deseas descartar este cambio local?\nSe borrara de la cola local de pendientes."
    );
    if (!confirmDiscard) return;

    try {
      const localTable = getTable(item.localTable);
      if (localTable) {
        await localTable.delete(item.id);
        addToast("Registro descartado de la bandeja de salida local", "success");
        setSelectedQueueItem(null);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      addToast(`No se pudo descartar: ${errorMessage}`, "error");
    }
  }, [addToast]);

  const handleForceComplete = useCallback(async (item: SyncQueueItem) => {
    const confirmForce = window.confirm(
      "¿Deseas forzar la marca de Sincronizado para este registro?"
    );
    if (!confirmForce) return;

    try {
      const localTable = getTable(item.localTable);
      if (localTable) {
        await localTable.update(item.id, { 
          syncStatus: "synced",
          lastSyncTimestamp: Date.now() 
        });
        addToast("Registro marcado como sincronizado", "success");
        setSelectedQueueItem(null);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      addToast(`No se pudo actualizar: ${errorMessage}`, "error");
    }
  }, [addToast]);

  return {
    isSyncing,
    activeTab,
    syncLogs,
    selectedQueueItem,
    stats,
    pendingQueueItems,
    totalPending,
    isOnline,
    
    setActiveTab,
    setSelectedQueueItem,
    handleFullSync,
    handleSingleTableSync,
    handleDiscardItem,
    handleForceComplete,
  };
}
