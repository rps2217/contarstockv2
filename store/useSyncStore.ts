
import { create } from 'zustand';

interface SyncState {
 isSyncing: boolean;
 lastSyncTime: number | null;
 pendingItems: number;
 setSyncing: (status: boolean) => void;
 setLastSyncTime: (time: number) => void;
 setPendingItems: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
 isSyncing: false,
 lastSyncTime: null,
 pendingItems: 0,
 setSyncing: (status) => set({ isSyncing: status }),
 setLastSyncTime: (time) => set({ lastSyncTime: time }),
 setPendingItems: (count) => set({ pendingItems: count }),
}));
