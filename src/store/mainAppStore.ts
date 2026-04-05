
import { create } from 'zustand';
import { AppSettings, ViewState } from '../types';
import { getSettings, saveSettings } from '../services/settings';

// --- SLICE: SETTINGS ---
// Forced update to trigger GitHub sync
interface SettingsSlice {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
 loadSettings: () => void;
}

const createSettingsSlice = (set: any): SettingsSlice => ({
 settings: getSettings(),
 updateSetting: (key, value) => {
 set((state: any) => {
 const newSettings = { ...state.settings, [key]: value };
 saveSettings(newSettings);
 return { settings: newSettings };
 });
 },
 loadSettings: () => {
 set({ settings: getSettings() });
 }
});

// --- SLICE: UI STATE ---
interface UISlice {
  isSidebarOpen: boolean;
  activeView: ViewState;
  globalSearchQuery: string;
  isStartSessionModalOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: ViewState) => void;
  setGlobalSearch: (q: string) => void;
  setStartSessionModalOpen: (open: boolean) => void;
}

const createUISlice = (set: any): UISlice => ({
  isSidebarOpen: false,
  activeView: 'dashboard',
  globalSearchQuery: '',
  isStartSessionModalOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
  setGlobalSearch: (q) => set({ globalSearchQuery: q }),
  setStartSessionModalOpen: (open) => set({ isStartSessionModalOpen: open }),
});

// --- COMBINED STORE ---
export const useAppStore = create<SettingsSlice & UISlice>((set) => ({
 ...createSettingsSlice(set),
 ...createUISlice(set),
}));

// Forced GitHub sync
