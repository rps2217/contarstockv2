
import { AppSettings } from '../types';

const KEYS = {
  SETTINGS: 'logicount_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  soundEnabled: true,
  hapticsEnabled: true,
  ttsEnabled: false, 
  ttsMode: 'count',  
  speedometerEnabled: false, 
  controlTowerEnabled: false, 
  confirmDelete: true,
  autoRegisterUnknown: false, 
  lowPerformanceMode: false,
  predictiveHintsEnabled: true, // Por defecto activo
  continuousMode: true,        // Por defecto activo
  appSheetConfig: {
      appId: '',
      accessKey: '',
      countsTableName: '',
      productsTableName: '',
      receptionTableName: 'RECEPCION_BULTOS'
  },
  mobileNavConfig: ['dashboard', 'database', 'reports'] 
};

export const getSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    const parsed = data ? JSON.parse(data) : {};
    
    const config = parsed.appSheetConfig || {};
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
