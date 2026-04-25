
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  lastSyncPerTable: Record<string, number>;
  pendingItems: number;
  latencyMs: number | null;
  isSupabaseConnected: boolean;
  syncError: string | null;
  setSyncing: (status: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setTableSyncTime: (table: string, time: number) => void;
  setPendingItems: (count: number) => void;
  setLatency: (ms: number | null) => void;
  setSupabaseConnected: (status: boolean) => void;
  setSyncError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isSyncing: false,
      lastSyncTime: null,
      lastSyncPerTable: {},
      pendingItems: 0,
      latencyMs: null,
      isSupabaseConnected: true,
      syncError: null,
      setSyncing: (status) => set({ isSyncing: status }),
      setLastSyncTime: (time) => set({ lastSyncTime: time }),
      setTableSyncTime: (table, time) => set(state => ({ 
        lastSyncPerTable: { ...state.lastSyncPerTable, [table]: time } 
      })),
      setPendingItems: (count) => set({ pendingItems: count }),
      setLatency: (ms) => set({ latencyMs: ms }),
      setSupabaseConnected: (status) => set({ isSupabaseConnected: status }),
      setSyncError: (error) => set({ syncError: error }),
    }),
    {
      name: 'sync-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        lastSyncTime: state.lastSyncTime,
        lastSyncPerTable: state.lastSyncPerTable 
      }),
    }
  )
);

// Forced GitHub sync
