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
    const error = handleError(err);
    const duration = performance.now() - startTime;
    telemetry.track('SESSION', 'MIGRATE_FAIL', { batchId, error: error.message }, duration, batchId);
    logger.error('MASSIVE_MIGRATION_FAIL', error.message);
    throw err;
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
        barcode: s.barcode,
        quantity: s.quantity,
        location: s.location || '',
        timestamp: s.timestamp  // Ya es número epoch en massiveDb
      };
    });

    const config = getSettings().cloudConfig;
    const tableName = config?.countsTableName || 'CONTEOS';

    await supabaseSyncService.pushBatch(tableName, payload);
    
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PUSH_SUCCESS', { batchId, count: scans.length }, duration, batchId);
    
    logger.success('CLOUD_SYNC', `Sincronización exitosa para lote: ${batchId}`);
  } catch (err: unknown) {
    const error = handleError(err);
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PUSH_FAIL', { batchId, error: error.message }, duration, batchId);
    logger.error('CLOUD_SYNC_FAIL', error.message);
    throw err;
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
        barcode: sanitizeBarcode(item!.barcode),
        name: item!.name,
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
    const error = handleError(err);
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PULL_FAIL', { batchId, error: error.message }, duration, batchId);
    logger.error('CLOUD_MANIFEST_FAIL', error.message);
    throw err;
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
      barcode: sanitizeBarcode(item!.barcode),
      name: item!.name,
      expectedQty: item!.qty,
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
    const error = handleError(err);
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'PULL_FAIL', { batchId, error: error.message, orderId }, duration, batchId);
    logger.error('CLOUD_MANIFEST_FAIL', error.message);
    throw err;
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
      barcode: sanitizeBarcode(item!.barcode),
      name: item!.name,
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
    const error = handleError(err);
    const duration = performance.now() - startTime;
    telemetry.track('SYNC', 'LOCAL_IMPORT_FAIL', { batchId, error: error.message, orderId }, duration, batchId);
    logger.error('CLOUD_MANIFEST_FAIL', error.message);
    throw err;
  }
};

/**
 * MIGRAR MANIFEST DE HAMMER A EXPECTED ORDERS (PARA MODO PRUEBA)
 * 
 * Esta función permite que el "modo prueba" (StartSessionModal) pueda ver
 * las cargas teóricas que se importaron en Hammer (massiveDb).
 * 
 * Sin esta migración, Hammer guarda en massiveDb.blindManifests y 
 * StartSessionModal busca en db.expectedOrders, causando desconexión.
 */
export const migrateHammerManifestToExpectedOrders = async (batchId: string, orderId?: string): Promise<string> => {
  const startTime = performance.now();
  try {
    logger.info('MANIFEST_MIGRATION', `Migrando manifest de Hammer a ExpectedOrders para lote: ${batchId}`);

    // Obtener los manifests del batch
    const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();

    if (manifests.length === 0) {
      throw new Error(`No hay manifests en el lote ${batchId} para migrar.`);
    }

    // Generar ID de orden basado en batch o usar el proveído
    const targetOrderId = orderId || `HM-${batchId.substring(0, 8).toUpperCase()}`;

    // Verificar si ya existe la orden en expectedOrders
    const existingOrder = await db.expectedOrders.get(targetOrderId);
    
    if (existingOrder) {
      logger.info('MANIFEST_MIGRATION', `La orden ${targetOrderId} ya existe, actualizando...`);
    }

    // Convertir manifests a formato ExpectedOrder
    const items = manifests.map(m => ({
      barcode: sanitizeBarcode(m.barcode),
      name: m.name || `SKU ${m.barcode}`,
      expectedQty: m.expectedQty
    }));

    // Crear la orden esperada
    const expectedOrder = {
      id: targetOrderId,
      internalId: targetOrderId,
      items,
      totalExpectedUnits: items.reduce((acc, i) => acc + i.expectedQty, 0),
      totalExpectedSKUs: items.length,
      importedAt: Date.now(),
      metadata: {
        documentType: 'Hammer Manifest',
        date: new Date().toLocaleDateString(),
        orderNote: `Migrado desde Hammer batch: ${batchId}`
      },
      // Marcar que viene de hammer para diferenciarlo
      _fromHammer: true
    };

    // Guardar en db.expectedOrders
    await db.expectedOrders.put(expectedOrder);

    const duration = performance.now() - startTime;
    telemetry.track('SYNC' as any, 'MIGRATION_SUCCESS', { batchId, orderId: targetOrderId, itemCount: items.length }, duration, batchId);

    logger.success('MANIFEST_MIGRATION', `Manifest migrado: ${targetOrderId} con ${items.length} SKUs`);
    return targetOrderId;

  } catch (err: unknown) {
    const error = handleError(err);
    const duration = performance.now() - startTime;
    telemetry.track('SYNC' as any, 'MIGRATION_FAIL', { batchId, error: error.message }, duration, batchId);
    logger.error('MANIFEST_MIGRATION_FAIL', error.message);
    throw err;
  }
};

/**
 * CARGAR MANIFEST COMO EXPECTED ORDER Y CREAR SESIÓN (COMBINADO)
 * 
 * Función utility que:
 * 1. Migra el manifest de Hammer a ExpectedOrders
 * 2. Crea una sesión lista para usar en modo prueba
 * 3. Retorna el ID de sesión para navegar directamente
 */
export const loadHammerManifestAsTestSession = async (batchId: string, orderId?: string): Promise<{ sessionId: string; orderId: string }> => {
  const startTime = performance.now();
  try {
    logger.info('HAMMER_TEST_SESSION', `Creando sesión de prueba desde Hammer batch: ${batchId}`);

    // 1. Migrar manifest a ExpectedOrder
    const migratedOrderId = await migrateHammerManifestToExpectedOrders(batchId, orderId);
    const expectedOrder = await db.expectedOrders.get(migratedOrderId);

    if (!expectedOrder) {
      throw new Error('Error al recuperar la orden migrada');
    }

    // 2. Crear sesión de conteo
    const sessionLabel = `TEST_${batchId.substring(0, 8)}`;
    const session = await createSession(
      migratedOrderId,
      sessionLabel,
      'standard',
      expectedOrder
    );

    const duration = performance.now() - startTime;
    telemetry.track('SYNC' as any, 'TEST_SESSION_CREATED', { batchId, orderId: migratedOrderId, sessionId: session.id }, duration, batchId);

    logger.success('HAMMER_TEST_SESSION', `Sesión de prueba creada: ${session.id}`);
    return { sessionId: session.id, orderId: migratedOrderId };

  } catch (err: unknown) {
    const error = handleError(err);
    const duration = performance.now() - startTime;
    telemetry.track('SYNC' as any, 'TEST_SESSION_FAIL', { batchId, error: error.message }, duration, batchId);
    logger.error('HAMMER_TEST_SESSION_FAIL', error.message);
    throw err;
  }
};

