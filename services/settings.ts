
import { AppSettings } from '../types';

const KEYS = {
  SETTINGS: 'logicount_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  soundEnabled: true,
  hapticsEnabled: true,
  ttsEnabled: false, 
  ttsMode: 'count',  
  speedometerEnabled: true, 
  confirmDelete: true,
  autoRegisterUnknown: true, 
  lowPerformanceMode: false,
  predictiveHintsEnabled: false,
  continuousMode: true,        
  appSheetConfig: {
      appId: '',
      accessKey: '',
      countsTableName: 'CONTEOS', // Ajustado a la nueva pestaña solicitada
      productsTableName: 'PRODUCTOS',
      receptionTableName: 'RECEPCION_BULTOS'
  },
  mobileNavConfig: ['dashboard', 'reports', 'sync', 'database'] 
};

export const getSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    
    const parsed = JSON.parse(data);
    return { 
        ...DEFAULT_SETTINGS, 
        ...parsed,
        appSheetConfig: {
            ...DEFAULT_SETTINGS.appSheetConfig,
            ...(parsed.appSheetConfig || {})
        }
    };
  } catch (e) {
    console.error("Critical: Settings recovery failed", e);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};
