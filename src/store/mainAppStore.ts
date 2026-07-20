import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppSettings, ViewState } from '../types';
import { getSettings, saveSettings } from '../services/settings';

// Tipo para la función set de Zustand
type SetState<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void;

// --- SLICE: SETTINGS ---
interface SettingsSlice {
  settings: AppSettings;
  updateSetting: <T extends keyof AppSettings>(key: T, value: AppSettings[T]) => void;
  loadSettings: () => void;
}

const createSettingsSlice = (set: SetState<SettingsSlice & UISlice>): SettingsSlice => ({
  settings: getSettings(),
  updateSetting: (key, value) => {
    set(state => {
      const newSettings = { ...state.settings, [key]: value };
      saveSettings(newSettings);
      return { settings: newSettings };
    });
  },
  loadSettings: () => {
    set({ settings: getSettings() });
  },
});

// --- SLICE: UI STATE ---
interface UISlice {
  isSidebarOpen: boolean;
  activeView: ViewState;
  globalSearchQuery: string;
  isStartSessionModalOpen: boolean;
  isSystemHubOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: ViewState) => void;
  setGlobalSearch: (q: string) => void;
  setStartSessionModalOpen: (open: boolean) => void;
  setSystemHubOpen: (open: boolean) => void;
}

const createUISlice = (set: SetState<UISlice>): UISlice => ({
  isSidebarOpen: false,
  activeView: 'dashboard',
  globalSearchQuery: '',
  isStartSessionModalOpen: false,
  isSystemHubOpen: false,
  setSidebarOpen: open => set({ isSidebarOpen: open }),
  setActiveView: view => set({ activeView: view }),
  setGlobalSearch: q => set({ globalSearchQuery: q }),
  setStartSessionModalOpen: open => set({ isStartSessionModalOpen: open }),
  setSystemHubOpen: open => set({ isSystemHubOpen: open }),
});

// --- COMBINED STORE ---
export const useAppStore = create<SettingsSlice & UISlice>()(
  persist(
    set => ({
      ...createSettingsSlice(set),
      ...createUISlice(set),
    }),
    {
      name: 'logicount_app_state',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        activeView: state.activeView,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);
