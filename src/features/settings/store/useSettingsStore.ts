/**
 * Settings Store - Domain store para configuracion de la app
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppSettings } from '../../../types';
import { getSettings, saveSettings } from '../../../services/settings';

interface SettingsState {
  settings: AppSettings;
  updateSetting: <T extends keyof AppSettings>(key: T, value: AppSettings[T]) => void;
  loadSettings: () => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
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
      },
      
      resetSettings: () => {
        const defaults = getSettings();
        saveSettings(defaults);
        set({ settings: defaults });
      },
    }),
    {
      name: 'settings_store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
