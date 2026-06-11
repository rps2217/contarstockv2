import { db, DynamicRecord } from '../db';
import { supabaseSyncService } from './supabaseSyncService';
import { getSettings, saveSettings } from './settings';
import { logger } from './logger';
import { AppSettings, MessageTemplate } from '../types';

const CONFIG_COLLECTION = 'APP_CONFIG';
const CONFIG_DOC_ID = 'global_settings';

export const configSyncService = {
  /**
   * Sube la configuración actual a la nube.
   */
  async pushSettings(): Promise<void> {
    try {
      const settings = getSettings();
      
      // Obtener plantillas
      const emailTemplateRecords = await db.dynamic_data.where('tableName').equals('PLANTILLAS_CORREOS').toArray();
      const emailTemplates = emailTemplateRecords.map(r => r.data);
      const messageTemplateRecords = await db.dynamic_data.where('tableName').equals('PLANTILLAS_MENSAJES').toArray();
      const messageTemplates = messageTemplateRecords.map(r => r.data);

      // Solo subimos lo que es relevante para la sincronización entre dispositivos
      // Evitamos subir configuraciones locales como impresora o modo espejo de cámara
      const syncableSettings = {
        pharmacyName: settings.pharmacyName,
        cloudConfig: settings.cloudConfig,
        schema: settings.schema,
        mobileNavConfig: settings.mobileNavConfig,
        defaultStartModule: settings.defaultStartModule,
        emailTemplates,
        messageTemplates,
        updatedAt: Date.now()
      };

      await supabaseSyncService.pushBatch(CONFIG_COLLECTION, [{
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
      const response = await supabaseSyncService.pullBatch(CONFIG_COLLECTION);
      if (!response.success || !response.rows || response.rows.length === 0) {
        if ((response as any).isMissing) {
          logger.info('CONFIG_SYNC', 'Tabla APP_CONFIG no existe. Usando configuración local.');
        }
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

      // Restaurar plantillas
      if (Array.isArray(remoteConfig.emailTemplates) && remoteConfig.emailTemplates.length > 0) {
        // Obtenemos las actuales para no duplicar incontrolablemente o limpiar y restaurar
        const existingRecords = await db.dynamic_data.where('tableName').equals('PLANTILLAS_CORREOS').toArray();
        const existingIds = new Set(existingRecords.map(r => r.id));
        
        const newRecords: DynamicRecord[] = [];
        for (const tpl of remoteConfig.emailTemplates) {
          if (!tpl.id) continue;
          if (!existingIds.has(tpl.id)) {
            newRecords.push({
              id: tpl.id,
              tableName: 'PLANTILLAS_CORREOS',
              data: tpl,
              timestamp: Date.now(),
              syncStatus: 'synced'
            });
          } else {
            // Actualizar existente
            await db.dynamic_data.update(tpl.id, { data: tpl });
          }
        }
        if (newRecords.length > 0) {
          await db.dynamic_data.bulkPut(newRecords);
        }
      }

      if (Array.isArray(remoteConfig.messageTemplates) && remoteConfig.messageTemplates.length > 0) {
        const existingMessages = await db.dynamic_data.where('tableName').equals('PLANTILLAS_MENSAJES').toArray();
        const existingMIds = new Set(existingMessages.map(m => m.id));
        
        const newRecords: DynamicRecord[] = [];
        for (const tpl of remoteConfig.messageTemplates) {
          if (!tpl.id) continue;
          if (!existingMIds.has(tpl.id)) {
            newRecords.push({
              id: tpl.id,
              tableName: 'PLANTILLAS_MENSAJES',
              data: tpl,
              timestamp: Date.now(),
              syncStatus: 'synced'
            });
          } else {
            await db.dynamic_data.update(tpl.id, { data: tpl });
          }
        }
        if (newRecords.length > 0) {
          await db.dynamic_data.bulkPut(newRecords);
        }
      }

      logger.info('CONFIG_SYNC', 'Configuración sincronizada desde la nube');
      return true;
    } catch (error: any) {
      logger.error('CONFIG_SYNC_PULL_FAIL', error.message);
      return false;
    }
  }
};
