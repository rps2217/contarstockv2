/**
 * Sync Store - Domain store para estado de sincronizacion
 * Integra con la FSM para control de flujo
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { syncFSM } from '../fsm';
import type { SyncState, SyncError } from '../fsm/types';

interface SyncStoreState {
  // Estado
  isSyncing: boolean;
  lastSyncTime: number | null;
  lastSyncPerTable: Record<string, number>;
  pendingItems: number;
  latencyMs: number | null;
  isSupabaseConnected: boolean;
  syncError: string | null;
  conflicts: number;
  incidents: SyncIncident[];
  
  // Acciones
  setSyncing: (status: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setTableSyncTime: (table: string, time: number) => void;
  setPendingItems: (count: number) => void;
  setLatency: (ms: number | null) => void;
  setSupabaseConnected: (status: boolean) => void;
  setSyncError: (error: string | null) => void;
  addConflict: () => void;
  addIncident: (table: string, error: string) => void;
  clearIncidents: () => void;
  
  // Integracion FSM
  getFSMState: () => SyncState;
  subscribeFSM: () => () => void;
}

interface SyncIncident {
  table: string;
  error: string;
  time: number;
}

export const useSyncStore = create<SyncStoreState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      isSyncing: false,
      lastSyncTime: null,
      lastSyncPerTable: {},
      pendingItems: 0,
      latencyMs: null,
      isSupabaseConnected: true,
      syncError: null,
      conflicts: 0,
      incidents: [],
      
      // Acciones
      setSyncing: (status) => set({ isSyncing: status }),
      
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      
      setTableSyncTime: (table, time) => set((state) => ({
        lastSyncPerTable: { ...state.lastSyncPerTable, [table]: time }
      })),
      
      setPendingItems: (count) => set({ pendingItems: count }),
      
      setLatency: (ms) => set({ latencyMs: ms }),
      
      setSupabaseConnected: (status) => set({ isSupabaseConnected: status }),
      
      setSyncError: (error) => set({ syncError: error }),
      
      addConflict: () => set((state) => ({ conflicts: state.conflicts + 1 })),
      
      addIncident: (table, error) => set((state) => ({
        incidents: [
          { table, error, time: Date.now() },
          ...state.incidents
        ].slice(0, 10)
      })),
      
      clearIncidents: () => set({ incidents: [] }),
      
      // Integracion FSM
      getFSMState: () => syncFSM.getState(),
      
      subscribeFSM: () => {
        return syncFSM.subscribe((fsmState, context) => {
          set({
            isSyncing: syncFSM.isRunning(),
            syncError: fsmState === 'error' ? context.lastError ?? null : null,
          });
        });
      },
    }),
    {
      name: 'sync_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastSyncTime: state.lastSyncTime,
        lastSyncPerTable: state.lastSyncPerTable,
        isSupabaseConnected: state.isSupabaseConnected,
      }),
    }
  )
);

// Hook para usar con FSM
export function useSyncWithFSM() {
  const store = useSyncStore();
  
  // Suscribir a cambios de FSM al montar
  // (En React, usar esto dentro de un componente con useEffect)
  
  return {
    ...store,
    fsmState: syncFSM.getState(),
    fsmContext: syncFSM.getContext(),
    isRunning: syncFSM.isRunning(),
    canStart: syncFSM.canStart(),
  };
}
