
import { create } from 'zustand';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingItems: number;
  latencyMs: number | null;
  isSupabaseConnected: boolean;
  syncError: string | null;
  setSyncing: (status: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setPendingItems: (count: number) => void;
  setLatency: (ms: number | null) => void;
  setSupabaseConnected: (status: boolean) => void;
  setSyncError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncTime: null,
  pendingItems: 0,
  latencyMs: null,
  isSupabaseConnected: true,
  syncError: null,
  setSyncing: (status) => set({ isSyncing: status }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setPendingItems: (count) => set({ pendingItems: count }),
  setLatency: (ms) => set({ latencyMs: ms }),
  setSupabaseConnected: (status) => set({ isSupabaseConnected: status }),
  setSyncError: (error) => set({ syncError: error }),
}));

// Forced GitHub sync
