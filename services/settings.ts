
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
  appSheetConfig: {
      appId: '',
      accessKey: '',
      countsTableName: 'CONTEOS',         // Hoja para Log detallado (Martillo)
      consolidatedTableName: 'CONSOLIDADO', // Hoja para Resumen (Nueva Carga)
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

export const saveSettings = async (settings: AppSettings) => {
  // 1. Guardar en LocalStorage (Síncrono, para la UI)
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  
  // 2. Guardar en IndexedDB (Asíncrono, para el Service Worker)
  try {
      await db.settings.put({ key: 'app_config', value: settings });
  } catch (e) {
      console.warn("No se pudo persistir configuración para SW", e);
  }
};
