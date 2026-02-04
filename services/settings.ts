
import { AppSettings } from '../types';
import { db } from '../db';

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
  batchTrackingEnabled: false, // Desactivado por defecto según requerimiento
  appSheetConfig: {
      appId: '',
      accessKey: '',
      countsTableName: 'CONTEOS',         
      consolidatedTableName: 'CONSOLIDADOS', 
      productsTableName: 'PRODUCTOS',
      receptionTableName: 'RECEPCION_BULTOS',
      ordersTableName: 'PEDIDOS'
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

export const saveSettings = async (settings: AppSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  try {
      await db.settings.put({ key: 'app_config', value: settings });
  } catch (e) {
      console.warn("No se pudo persistir configuración para SW", e);
  }
};
