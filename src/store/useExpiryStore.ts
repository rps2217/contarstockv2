
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ExpiryStatus = 'expired' | 'critical' | 'next_expiry' | 'safe' | 'withdrawal';

export interface ExpiryPreferences {
  hideExpiredByDefault: boolean;
  defaultSort: 'expiry' | 'withdrawal';
  compactView: boolean;
  showPriorityAssistant: boolean;
}

export interface ExpiryItem {
  id: string;
  barcode: string;
  productName: string;
  providerName: string;
  category: string;
  mm?: number;
  yyyy?: number;
  expiryDate?: string;
  expiryDateObj: Date | null;
  withdrawalDate: Date | null;
  status: ExpiryStatus;
  daysLeft: number;
  quantity: number;
  batch?: string;
  type: 'Individual' | 'Bulto/Caja' | 'Nube';
  location: string;
  estado: string;
  hasCanje: boolean;
  withdrawalDays: number;
  lifePercent?: number;
  riskScore?: number;
  claveUnica?: string;
  timestamp?: number;
  frc?: string;
  syncStatus?: 'synced' | 'pending' | 'error';
  _searchIndex?: string;
}

interface ExpiryState {
  // Preferences
  preferences: ExpiryPreferences;
  setPreferences: (prefs: Partial<ExpiryPreferences>) => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  selectedStatuses: ExpiryStatus[];
  setSelectedStatuses: (statuses: ExpiryStatus[]) => void;
  toggleStatus: (status: ExpiryStatus) => void;

  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;

  selectedCanje: 'all' | 'canje' | 'markdown';
  setSelectedCanje: (val: 'all' | 'canje' | 'markdown') => void;

  actionPeriod: 'all' | 'this_month' | 'next_month' | 'next_3_months' | 'custom';
  setActionPeriod: (period: 'all' | 'this_month' | 'next_month' | 'next_3_months' | 'custom') => void;

  customDateRange: { start: Date | null; end: Date | null };
  setCustomDateRange: (range: { start: Date | null; end: Date | null }) => void;

  // Selection
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;

  // Verification
  verifiedIds: Set<string>;
  setVerifiedIds: (ids: Set<string>) => void;
  toggleVerified: (id: string) => void;
}

const DEFAULT_PREFERENCES: ExpiryPreferences = {
  hideExpiredByDefault: true,
  defaultSort: 'withdrawal',
  compactView: false,
  showPriorityAssistant: false
};

export const useExpiryStore = create<ExpiryState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      setPreferences: (prefs) => 
        set((state) => ({ preferences: { ...state.preferences, ...prefs } })),

      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      selectedStatuses: [],
      setSelectedStatuses: (selectedStatuses) => set({ selectedStatuses }),
      toggleStatus: (status) => set((state) => {
        const next = state.selectedStatuses.includes(status)
          ? state.selectedStatuses.filter(s => s !== status)
          : [...state.selectedStatuses, status];
        return { selectedStatuses: next };
      }),

      selectedCategories: [],
      setSelectedCategories: (selectedCategories) => set({ selectedCategories }),

      selectedCanje: 'all',
      setSelectedCanje: (selectedCanje) => set({ selectedCanje }),

      actionPeriod: 'all',
      setActionPeriod: (actionPeriod) => set({ actionPeriod }),

      customDateRange: { start: null, end: null },
      setCustomDateRange: (customDateRange) => set({ customDateRange }),

      selectedIds: new Set(),
      setSelectedIds: (selectedIds) => set({ selectedIds }),
      toggleSelection: (id) => set((state) => {
        const next = new Set(state.selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedIds: next };
      }),
      clearSelection: () => set({ selectedIds: new Set() }),

      verifiedIds: new Set(),
      setVerifiedIds: (verifiedIds) => set({ verifiedIds }),
      toggleVerified: (id) => set((state) => {
        const next = new Set(state.verifiedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { verifiedIds: next };
      }),
    }),
    {
      name: 'expiry-storage',
      partialize: (state) => ({ 
        preferences: state.preferences,
        // We might not want to persist filters across sessions, 
        // but preferences definitely should be.
      }),
    }
  )
);

// Forced GitHub sync
