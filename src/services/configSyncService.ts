
import { db } from '../db';
import { firebaseSyncService } from './firebaseSyncService';
import { getSettings, saveSettings } from './settings';
import { logger } from './logger';
import { AppSettings } from '../types';

const CONFIG_COLLECTION = 'APP_CONFIG';
const CONFIG_DOC_ID = 'global_settings';

export const configSyncService = {
  /**
   * Sube la configuración actual a la nube.
   */
  async pushSettings(): Promise<void> {
    try {
      const settings = getSettings();
      // Solo subimos lo que es relevante para la sincronización entre dispositivos
      // Evitamos subir configuraciones locales como impresora o modo espejo de cámara
      const syncableSettings = {
        pharmacyName: settings.pharmacyName,
        cloudConfig: settings.cloudConfig,
        schema: settings.schema,
        mobileNavConfig: settings.mobileNavConfig,
        defaultStartModule: settings.defaultStartModule,
        updatedAt: Date.now()
      };

      await firebaseSyncService.pushBatch(CONFIG_COLLECTION, [{
        id: CONFIG_DOC_ID,
        ...syncableSettings
      }]);
      
      logger.info('CONFIG_SYNC', 'Configuración respaldada en la nube');
    } catch (error: any) {
      logger.error('CONFIG_SYNC_PUSH_FAIL', error.message);
      throw error;
    }
  },

  /**
   * Descarga la configuración de la nube y la fusiona con la local.
   */
  async pullSettings(): Promise<boolean> {
    try {
      const response = await firebaseSyncService.pullBatch(CONFIG_COLLECTION);
      if (!response.success || !response.rows || response.rows.length === 0) {
        return false;
      }

      const remoteConfig = response.rows.find((r: any) => r.id === CONFIG_DOC_ID);
      if (!remoteConfig) return false;

      const currentSettings = getSettings();
      
      // Fusionar configuraciones
      const newSettings: AppSettings = {
        ...currentSettings,
        pharmacyName: remoteConfig.pharmacyName || currentSettings.pharmacyName,
        cloudConfig: {
          ...currentSettings.cloudConfig,
          ...(remoteConfig.cloudConfig || {})
        },
        schema: remoteConfig.schema || currentSettings.schema,
        mobileNavConfig: remoteConfig.mobileNavConfig || currentSettings.mobileNavConfig,
        defaultStartModule: remoteConfig.defaultStartModule || currentSettings.defaultStartModule
      };

      await saveSettings(newSettings);
      logger.info('CONFIG_SYNC', 'Configuración sincronizada desde la nube');
      return true;
    } catch (error: any) {
      logger.error('CONFIG_SYNC_PULL_FAIL', error.message);
      return false;
    }
  }
};
