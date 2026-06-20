import { getSettings, saveSettings } from './settings';
import { useAppStore } from '@/stores';

export const isModuleEnabled = (moduleKey: string): boolean => {
  const settings = getSettings();
  if (!settings.modules) return true; // Default to enabled
  return settings.modules[moduleKey]?.enabled ?? true;
};

export const toggleModule = async (moduleKey: string, enabled: boolean): Promise<void> => {
  const settings = getSettings();
  const newSettings = {
    ...settings,
    modules: {
      ...settings.modules,
      [moduleKey]: {
        ...settings.modules?.[moduleKey],
        enabled
      }
    }
  };
  await saveSettings(newSettings);
};

export const getModules = () => {
    return getSettings().modules || {};
};
