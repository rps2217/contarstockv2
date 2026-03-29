
import { db } from '../db';
import { logger } from './logger';
import { getSettings } from './settings';

export const migrationService = {
  /**
   * Migra los datos de la tabla antigua cloudExpirations a la nueva tabla dinámica dynamic_data.
   */
  async migrateCloudExpirationsToDynamic() {
    const startTime = performance.now();
    try {
      const oldRecords = await db.cloudExpirations.toArray();
      if (oldRecords.length === 0) {
        logger.info('MIGRATION', 'No hay registros antiguos para migrar.');
        return { success: true, count: 0 };
      }

      logger.info('MIGRATION', `Iniciando migración de ${oldRecords.length} registros...`);

      const settings = getSettings();
      const expiryTableName = settings.appSheetConfig?.appId ? (settings.appSheetConfig.expiryTableName || 'VENCIMIENTOS') : 'VENCIMIENTOS';
      const eventsTableName = settings.appSheetConfig?.appId ? (settings.appSheetConfig.eventsTableName || 'EVENTOS') : 'EVENTOS';

      const dynamicRecords = oldRecords.map(old => {
        const isExpiry = !old.event || old.event.toUpperCase() === 'VENCIMIENTOS' || old.event.toUpperCase() === 'VENCIMIENTO';
        const tableName = isExpiry ? expiryTableName : eventsTableName;

        // Mapear los datos al formato de objeto plano para dynamic_data
        const data: Record<string, any> = {
          ID: old.id,
          SKU: old.barcode,
          DESCRIPTOR: old.productName,
          MM: old.mm,
          YYYY: old.yyyy,
          CANTIDAD: old.quantity,
          EVENTO: old.event,
          FRC: old.frc,
          ERP: old.erp,
          NGUIA: old.nguia,
          DESTINO: old.destino,
          TRASPASO: old.traspaso,
          OBSERVACIONES: old.observaciones,
          AJUSTADO: old.isAdjusted ? 'TRUE' : 'FALSE',
          TIMESTAMP: new Date(old.timestamp).toISOString(),
          CLAVE_UNICA: old.claveUnica
        };

        return {
          id: old.id,
          tableName: tableName,
          data: data,
          timestamp: old.timestamp,
          syncStatus: old.syncStatus || 'synced'
        };
      });

      // Insertar en la nueva tabla
      await db.dynamic_data.bulkPut(dynamicRecords as any);

      // Opcional: Limpiar la tabla antigua después de una migración exitosa
      // await db.cloudExpirations.clear();

      const duration = performance.now() - startTime;
      logger.success('MIGRATION', `Migración completada exitosamente: ${dynamicRecords.length} registros movidos al nuevo motor.`, { duration });
      
      return { success: true, count: dynamicRecords.length };
    } catch (error: any) {
      logger.error('MIGRATION_FAIL', `Error durante la migración: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
};
