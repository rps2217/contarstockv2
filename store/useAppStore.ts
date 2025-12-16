
import { create } from 'zustand';
import { AppSettings, Theme } from '../types';
import { getSettings, saveSettings } from '../services/settings';

interface AppState {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  loadSettings: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: getSettings(),
  
  updateSetting: (key, value) => {
    set((state) => {
      const newSettings = { ...state.settings, [key]: value };
      saveSettings(newSettings);
      return { settings: newSettings };
    });
  },

  loadSettings: () => {
    set({ settings: getSettings() });
  }
}));
