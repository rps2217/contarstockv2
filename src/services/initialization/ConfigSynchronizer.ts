/**
 * ConfigSynchronizer - Sincronización de configuración con la nube
 */

import type { AppSettings, CloudStorageConfig } from '../../types';
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

    // Ensure cloudConfig exists
    if (!settings.cloudConfig) {
      settings.cloudConfig = {
        countsTableName: 'counts',
        consolidatedTableName: 'consolidated_counts',
        productsTableName: 'products',
      };
    }

    // Intentar sincronizar configuración desde la nube
    const response = await supabaseSyncService.pullBatch('CONFIG_SISTEMA');

    if (response.success && response.rows && response.rows.length > 0) {
      const cloudConfig = response.rows[0] as Partial<CloudStorageConfig>;
      const updated: AppSettings = {
        ...settings,
        cloudConfig: {
          ...settings.cloudConfig,
          countsTableName: cloudConfig.countsTableName ?? settings.cloudConfig.countsTableName,
          consolidatedTableName: cloudConfig.consolidatedTableName ?? settings.cloudConfig.consolidatedTableName,
          productsTableName: cloudConfig.productsTableName ?? settings.cloudConfig.productsTableName,
          inventoryRegistryTableName: cloudConfig.inventoryRegistryTableName,
          expiryTableName: cloudConfig.expiryTableName,
          receptionTableName: cloudConfig.receptionTableName,
          ordersTableName: cloudConfig.ordersTableName,
          providersTableName: cloudConfig.providersTableName,
          eventsTableName: cloudConfig.eventsTableName,
          sessionsTableName: cloudConfig.sessionsTableName,
        }
      };
      await saveSettings(updated);
      logger.success('INIT_CONFIG', 'Configuration synchronized from cloud');
      return { success: true, configUpdated: true };
    }

    return { success: true, configUpdated: false };
  } catch (e) {
    logger.warn('INIT_CONFIG', 'Error synchronizing configuration', e);
    return { success: false, configUpdated: false };
  }
};
