import { db } from '../db';
import { massiveDb } from '../db.massive';
import { createSession, updateSessionMetadata } from './sessionService';
import { logger } from './logger';
import { generateUUID, sanitizeBarcode } from './utils';
import { ScanRecord, ExpectedItem } from '../types';
import { firebaseSyncService } from './firebaseSyncService';
import { CloudStockSchema } from './schemas';
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

    const duration = performance.now() - startTime;
    telemetry.track('SESSION', 'MIGRATE_SUCCESS', { batchId, scanCount: rawScans.length }, duration, batchId);
    
    logger.success('MASSIVE_MIGRATION', `Bulto [${batchId}] archivado.`);
    return session.id;
  } catch (e: any) {
    const duration = performance.now() - startTime;
    telemetry.track('SESSION', 'MIGRATE_FAIL', { batchId, error: e.message }, duration, batchId);
    logger.error('MASSIVE_MIGRATION_FAIL', e.message);
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

    const payload = scans.map(s => ({
      id: generateUUID(),
      batchId: s.batchId,
      barcode: s.barcode,
      quantity: s.quantity,
      location: s.location || '',
      timestamp: new Date(s.timestamp).toISOString()
    }));

    const config = getSettings().appSheetConfig;
    const tableName = config?.countsTableName || 'CONTEOS';

    await firebaseSyncService.pushBatch(tableName, payload);
    
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PUSH_SUCCESS', { batchId, count: scans.length }, duration, batchId);
    
    logger.success('CLOUD_SYNC', `Sincronización exitosa para lote: ${batchId}`);
  } catch (e: any) {
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PUSH_FAIL', { batchId, error: e.message }, duration, batchId);
    logger.error('CLOUD_SYNC_FAIL', e.message);
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
    
    const result = await firebaseSyncService.pullBatch('STOCK');
    
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

  } catch (e: any) {
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PULL_FAIL', { batchId, error: e.message }, duration, batchId);
    logger.error('CLOUD_MANIFEST_FAIL', e.message);
    throw e;
  }
};

// Forced GitHub sync
