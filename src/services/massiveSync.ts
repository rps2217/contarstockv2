import { db } from '../db';
import { massiveDb } from '../db';
import { createSession, updateSessionMetadata } from './sessionService';
import { logger } from './logger';
import { handleError } from './types';
import { generateUUID, sanitizeBarcode } from './utils';
import { ScanRecord, ExpectedItem } from '../types';
import { supabaseSyncService } from './supabaseSyncService';
import { CloudStockSchema, CloudOrderRowSchema } from './schemas';
import { telemetry } from './telemetryService';
import { getSettings } from './settings';

export const migrateMassiveToMaster = async (batchId: string): Promise<string> => {
  const startTime = performance.now();
  try {
    const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
    const manifestItems = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
    
    if (rawScans.length === 0) throw new Error("No hay datos para migrar.");

    const erpOrder = `HM-${batchId.substring(0, 8).toUpperCase()}`;
    const sessionLabel = batchId;
    
    const session = await createSession(erpOrder, sessionLabel, 'hammer');

    const expectedItems: ExpectedItem[] = manifestItems.map(m => ({
      barcode: m.barcode,
      name: m.name || "Producto Martillo",
      expectedQty: m.expectedQty
    }));

    if (expectedItems.length > 0) {
      await db.sessions.update(session.id, { 
        expectedItems: expectedItems,
        isVerifiedMode: true 
      });
    }

    const recordsToMigrate: ScanRecord[] = rawScans.map(scan => {
      return {
        id: generateUUID(),
        sessionId: session.id,
        barcode: scan.barcode,
        quantity: scan.quantity,
        timestamp: scan.timestamp,
        synced: 0,
        isIncident: false 
      };
    });

    await (db as any).transaction('rw', db.scans, db.sessions, async () => {
      await db.scans.bulkAdd(recordsToMigrate);
      await updateSessionMetadata(session.id);
    });

    await massiveDb.blindScans.where('batchId').equals(batchId).delete();
    await massiveDb.blindManifests.where('batchId').equals(batchId).delete();

    // AUTO-SYNC EN FIN_DE_PROCESO: Sincronizar de forma inmediata con Supabase para visibilidad multi-dispositivo
    try {
      const config = getSettings().cloudConfig;
      const targetTable = config?.countsTableName || "CONTEOS";
      const { aggregateScans } = await import('./aggregator');
      const consolidatedItems = await aggregateScans(recordsToMigrate);
      const { createInventoryPayload } = await import('./cloud/mappers');
      const fullPayload = createInventoryPayload(session, consolidatedItems, 'manual');
      
      const uploadResult = await supabaseSyncService.pushBatch(targetTable, fullPayload);
      if (uploadResult.success) {
        const scanIds = recordsToMigrate.map(r => r.id);
        await db.scans.where('id').anyOf(scanIds).modify({ synced: 1 });
        await db.sessions.update(session.id, { 
          lastSyncTimestamp: Date.now(),
          syncStatus: 'synced'
        });

        const sessionPayload = {
          id: session.id,
          erpOrder: session.erpOrder,
          logisticsLabel: session.logisticsLabel,
          sessionType: session.sessionType,
          status: 'completed',
          createdAt: session.createdAt,
          totalUnits: recordsToMigrate.reduce((sum, r) => sum + r.quantity, 0),
          totalSKUs: new Set(recordsToMigrate.map(r => r.barcode)).size,
          photoUrl: session.photoUrl || '',
          lastSyncTimestamp: Date.now()
        };
        await supabaseSyncService.pushBatch('SESIONES_CONTEO', [sessionPayload]);
      }
    } catch (pushErr) {
      console.warn("[migrateMassiveToMaster] Auto-push falló, se sincronizará luego:", pushErr);
    }

    const duration = performance.now() - startTime;
    telemetry.track('SESSION', 'MIGRATE_SUCCESS', { batchId, scanCount: rawScans.length }, duration, batchId);
    
    logger.success('MASSIVE_MIGRATION', `Bulto [${batchId}] archivado.`);
    return session.id;
  } catch (err: unknown) {
    const duration = performance.now() - startTime;
    telemetry.track('SESSION', 'MIGRATE_FAIL', { batchId, error: error.message }, duration, batchId);
    const error = handleError(err);
    logger.error('MASSIVE_MIGRATION_FAIL', error.message);
    throw e;
  }
};

/**
 * ENVÍO DE ESCANEOS A LA NUBE (BACKUP/SYNC)
 */
export const pushScansToCloud = async (batchId: string): Promise<void> => {
  const startTime = performance.now();
  try {
    const scans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
    if (scans.length === 0) return;

    logger.info('CLOUD_SYNC', `Sincronizando ${scans.length} registros para lote: ${batchId}`);

    const payload = scans.map(s => {
      const locPart = s.location || 'ZONA-A';
      const uniqueId = `HM_ACTIVE_${batchId}_${locPart}_${s.barcode}`;
      return {
        id: uniqueId,
        batchId: s.batchId,
        barcode: s.barcode,
        quantity: s.quantity,
        location: s.location || '',
        timestamp: new Date(s.timestamp).toISOString()
      };
    });

    const config = getSettings().cloudConfig;
    const tableName = config?.countsTableName || 'CONTEOS';

    await supabaseSyncService.pushBatch(tableName, payload);
    
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PUSH_SUCCESS', { batchId, count: scans.length }, duration, batchId);
    
    logger.success('CLOUD_SYNC', `Sincronización exitosa para lote: ${batchId}`);
  } catch (err: unknown) {
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PUSH_FAIL', { batchId, error: error.message }, duration, batchId);
    const error = handleError(err);
    logger.error('CLOUD_SYNC_FAIL', error.message);
    throw e;
  }
};

/**
 * DESCARGA DE MANIFIESTO DE STOCK
 */
export const importManifestFromCloud = async (batchId: string): Promise<number> => {
  const startTime = performance.now();
  try {
    logger.info('CLOUD_MANIFEST', `Solicitando descarga de STOCK para lote: ${batchId}`);
    
    const result = await supabaseSyncService.pullBatch('STOCK');
    
    if (!result.success || !Array.isArray(result.rows)) {
      throw new Error("El servidor devolvió un formato inválido o la tabla STOCK está vacía.");
    }

    const rawRows = result.rows;

    const itemsToSave = rawRows
      .map((row, idx) => {
        const parsed = CloudStockSchema.safeParse(row);
        if (!parsed.success) {
          if (idx === 0) {
            const errorMsg = (parsed as any).error.errors.map((e: any) => e.path.join('.')).join(', ');
            throw new Error(`Columnas no coinciden en fila 2. Error en: ${errorMsg}`);
          }
          return null;
        }
        return parsed.data;
      })
      .filter((i): i is NonNullable<typeof i> => i !== null && i.expectedQty > 0)
      .map(item => ({
        batchId,
        barcode: sanitizeBarcode(item.barcode),
        name: item.name,
        expectedQty: item.expectedQty,
        loc: item.loc
      }));

    if (itemsToSave.length === 0) {
      throw new Error("No se encontraron registros con Stock mayor a 0 en el Excel.");
    }

    await (massiveDb as any).transaction('rw', massiveDb.blindManifests, async () => {
      await massiveDb.blindManifests.where('batchId').equals(batchId).delete();
      await massiveDb.blindManifests.bulkAdd(itemsToSave);
    });

    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PULL_SUCCESS', { batchId, count: itemsToSave.length }, duration, batchId);
    
    logger.success('CLOUD_MANIFEST', `Descarga exitosa: ${itemsToSave.length} metas instaladas.`);
    return itemsToSave.length;

  } catch (err: unknown) {
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PULL_FAIL', { batchId, error: error.message }, duration, batchId);
    const error = handleError(err);
    logger.error('CLOUD_MANIFEST_FAIL', error.message);
    throw e;
  }
};

/**
 * IMPORTAR CARGA TEÓRICA / PEDIDO ESPECÍFICO DESDE LA NUBE
 */
export const importExpectedOrderFromCloud = async (batchId: string, orderId: string): Promise<number> => {
  const startTime = performance.now();
  try {
    logger.info('CLOUD_MANIFEST', `Solicitando descarga de CARGA TEÓRICA "${orderId}" para lote: ${batchId}`);
    
    const config = getSettings().cloudConfig;
    const tableName = config?.ordersTableName || 'PEDIDOS';
    const result = await supabaseSyncService.pullBatch(tableName);
    
    if (!result.success || !Array.isArray(result.rows)) {
      throw new Error("El servidor devolvió un formato inválido o la tabla está vacía.");
    }

    const erpId = String(orderId || '').toUpperCase().trim();
    const filteredRows = result.rows
      .map((row: any) => {
        const parsed = CloudOrderRowSchema.safeParse(row);
        return parsed.success ? parsed.data : null;
      })
      .filter((p: any) => p !== null && String(p.erp || '').toUpperCase() === erpId);

    if (filteredRows.length === 0) {
      throw new Error(`La carga teórica "${orderId}" no se encuentra en el servidor.`);
    }

    const itemsToSave = filteredRows.map(item => ({
      batchId,
      barcode: sanitizeBarcode(item.barcode),
      name: item.name,
      expectedQty: item.qty,
      loc: ''
    }));

    await (massiveDb as any).transaction('rw', massiveDb.blindManifests, async () => {
      await massiveDb.blindManifests.where('batchId').equals(batchId).delete();
      await massiveDb.blindManifests.bulkAdd(itemsToSave);
    });

    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PULL_SUCCESS', { batchId, count: itemsToSave.length, orderId }, duration, batchId);
    
    logger.success('CLOUD_MANIFEST', `Carga teórica "${orderId}" importada con éxito: ${itemsToSave.length} SKUs.`);
    return itemsToSave.length;

  } catch (err: unknown) {
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PULL_FAIL', { batchId, error: error.message, orderId }, duration, batchId);
    const error = handleError(err);
    logger.error('CLOUD_MANIFEST_FAIL', error.message);
    throw e;
  }
};

/**
 * IMPORTAR CARGA TEÓRICA LOCAL AL SISTEMA MARTILLO
 */
export const importLocalExpectedOrderToHammer = async (batchId: string, orderId: string): Promise<number> => {
  const startTime = performance.now();
  try {
    logger.info('CLOUD_MANIFEST', `Importando localmente CARGA TEÓRICA "${orderId}" para lote: ${batchId}`);
    
    const order = await db.expectedOrders.get(orderId);
    if (!order) {
      throw new Error(`La carga teórica local "${orderId}" no existe.`);
    }

    const itemsToSave = order.items.map(item => ({
      batchId,
      barcode: sanitizeBarcode(item.barcode),
      name: item.name,
      expectedQty: item.expectedQty,
      loc: ''
    }));

    await (massiveDb as any).transaction('rw', massiveDb.blindManifests, async () => {
      await massiveDb.blindManifests.where('batchId').equals(batchId).delete();
      await massiveDb.blindManifests.bulkAdd(itemsToSave);
    });

    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'LOCAL_IMPORT_SUCCESS', { batchId, count: itemsToSave.length, orderId }, duration, batchId);
    
    logger.success('CLOUD_MANIFEST', `Carga teórica local "${order?.metadata?.internalGuide || orderId}" importada con éxito: ${itemsToSave.length} SKUs.`);
    return itemsToSave.length;
  } catch (err: unknown) {
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'LOCAL_IMPORT_FAIL', { batchId, error: error.message, orderId }, duration, batchId);
    const error = handleError(err);
    logger.error('CLOUD_MANIFEST_FAIL', error.message);
    throw e;
  }
};

