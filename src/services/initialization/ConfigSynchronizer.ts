/**
 * ConfigSynchronizer - Sincronización de configuración con la nube
 */

import { supabaseSyncService } from '../supabaseSyncService';
import { getSettings, saveSettings } from '../settings';
import { logger } from '../logger';

export interface ConfigSyncResult {
  success: boolean;
  configUpdated: boolean;
}

/**
 * Sincroniza la configuración local con la nube
 */
export const syncConfig = async (): Promise<ConfigSyncResult> => {
  try {
    const settings = getSettings();
    
    // Intentar sincronizar configuración desde la nube
    const response = await supabaseSyncService.pullBatch('CONFIG_SISTEMA');
    
    if (response.success && response.rows && response.rows.length > 0) {
      const cloudConfig = response.rows[0];
      const updated = { 
        ...settings, 
        cloudConfig: { 
          ...settings.cloudConfig, 
          ...cloudConfig 
        } 
      };
      await saveSettings(updated);
      logger.success('INIT_CONFIG', 'Configuration synchronized from cloud');
      return { success: true, configUpdated: true };
    }
    
    return { success: true, configUpdated: false };
  } catch (e) {
    logger.warn('INIT_CONFIG', 'Error synchronizing configuration' as any, "" as any, e);
    return { success: false, configUpdated: false };
  }
};
