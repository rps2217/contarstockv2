
import { AppSettings } from '../types';

const KEYS = {
  SETTINGS: 'logicount_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  soundEnabled: true,
  hapticsEnabled: true,
  ttsEnabled: false, // Default DISABLED as requested
  ttsMode: 'count',  // Default mode is the new efficient Counting mode
  speedometerEnabled: false, // Default DISABLED as requested
  controlTowerEnabled: false, // Default DISABLED as requested (Widgets hidden)
  confirmDelete: true,
  appSheetConfig: {
      appId: '',
      accessKey: '',
      countsTableName: '',
      productsTableName: '',
      receptionTableName: '' // Default empty
  },
  mobileNavConfig: ['dashboard', 'database', 'reports'] // Default Mobile Items
};

export const getSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    const parsed = data ? JSON.parse(data) : {};
    
    // Merge deeply if needed, but for now simple spread
    const config = parsed.appSheetConfig || {};
    // Migration fix: old 'tableName' to 'countsTableName'
    if (config.tableName && !config.countsTableName) {
        config.countsTableName = config.tableName;
    }

    return { 
        ...DEFAULT_SETTINGS, 
        ...parsed,
        appSheetConfig: {
            ...DEFAULT_SETTINGS.appSheetConfig,
            ...config
        },
        // Ensure mobileNavConfig exists if loading from old settings
        mobileNavConfig: parsed.mobileNavConfig || DEFAULT_SETTINGS.mobileNavConfig
    };
  } catch (e) {
    console.error("Error reading settings", e);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};