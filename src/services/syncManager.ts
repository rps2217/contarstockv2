import { db } from '../db';
import { CountingSession, Product, Provider } from '../types';
import { logger } from './logger';
import { useSyncStore } from '../store/useSyncStore';
import { toast } from 'sonner';
import { saveProductBatch } from './productService';
import { CloudProductSchema, CloudProviderSchema } from './schemas';
import { getSettings } from './settings';
import { markScansAsSynced } from './sessionService';
import { aggregateScans } from './aggregator';
import { dynamicSyncService } from './dynamicSync';
import { supabaseSyncService } from './supabaseSyncService';
import { createInventoryPayload } from './cloud/mappers';
import { ScanRepository } from '../repositories/ScanRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { supabase } from '../lib/supabase';
import { backupProductsToSupabase, backupProvidersToSupabase } from './cloudBackupService';

export { backupProductsToSupabase, backupProvidersToSupabase };

/**
 * FIX: Eliminada variable global isSyncingInProgress.
 * Ahora usa useSyncStore que es thread-safe y sincronizado entre tabs via eventos.
 */
const UPLOAD_BATCH_SIZE = 500; 

// Helper para verificar si hay sync en progreso usando el store
const isSyncInProgress = (): boolean => useSyncStore.getState().isSyncing;

// Helper para marcar inicio de sync
const startSync = () => useSyncStore.getState().setSyncing(true);

// Helper para marcar fin de sync
const endSync = () => useSyncStore.getState().setSyncing(false);

export const resetSyncLock = () => {
  endSync();
};

export interface UploadGroup {
  erpOrder: string;
  sessionCount: number;
  totalUnits: number;
  sessionIds: string[];
  logisticsLabels: string[];
  type: 'inventory' | 'reception' | 'products' | 'orphans' | 'dynamic';
  isHammer: boolean;
  tableName?: string;
}

export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
  const groups: Record<string, UploadGroup> = {};
  
  // 1. Scans (Inventory/Hammer)
  const unsyncedScans = await ScanRepository.getUnsynced();
  
  if (unsyncedScans.length > 0) {
    const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
    const sessions = await SessionRepository.getByIds(sessionIds);
    const sessionMap = new Map<string, CountingSession>(sessions.map(s => [s.id, s]));

    for (const scan of unsyncedScans) {
      const session = sessionMap.get(scan.sessionId);
      if (!session) {
        if (!groups['SISTEMA_RESIDUAL']) {
          groups['SISTEMA_RESIDUAL'] = {
            erpOrder: 'REGISTROS_HUERFANOS',
            sessionCount: 1,
            totalUnits: 0,
            sessionIds: ['ORPHAN'],
            logisticsLabels: ['Recuperado de Memoria'],
            type: 'orphans',
            isHammer: true
          };
        }
        groups['SISTEMA_RESIDUAL'].totalUnits += scan.quantity;
        continue;
      }

      const erp = session.erpOrder;
      if (!groups[erp]) {
        groups[erp] = { 
          erpOrder: erp, 
          sessionCount: 0, 
          totalUnits: 0, 
          sessionIds: [], 
          logisticsLabels: [], 
          type: 'inventory',
          isHammer: session.sessionType === 'hammer'
        };
      }
      groups[erp].totalUnits += scan.quantity;
      if (!groups[erp].sessionIds.includes(session.id)) {
        groups[erp].sessionIds.push(session.id);
        groups[erp].logisticsLabels.push(session.logisticsLabel);
        groups[erp].sessionCount++;
      }
    }
  }

  // 2. Reception (Incluir bultos finalizados no sincronizados)
  const receptionSessions = await SessionRepository.getByType('reception');
  const unsyncedReception = receptionSessions.filter(s => !s.lastSyncTimestamp);

  if (unsyncedReception.length > 0) {
    groups['RECEP_CLOUD'] = {
      erpOrder: 'RECEPCIÓN_BULTOS',
      sessionCount: unsyncedReception.length,
      totalUnits: 0,
      sessionIds: unsyncedReception.map(s => s.id),
      logisticsLabels: unsyncedReception.map(s => s.logisticsLabel),
      type: 'reception',
      isHammer: false
    };
  }

  // 3. Dynamic Data
  const pendingDynamic = await db.dynamic_data
    .where('syncStatus')
    .equals('pending')
    .toArray();

  if (pendingDynamic.length > 0) {
    const dynamicGroups: Record<string, number> = {};
    pendingDynamic.forEach(r => {
      dynamicGroups[r.tableName] = (dynamicGroups[r.tableName] || 0) + 1;
    });

    for (const [tableName, count] of Object.entries(dynamicGroups)) {
      groups[`DYNAMIC_${tableName}`] = {
        erpOrder: `TABLA: ${tableName}`,
        sessionCount: count,
        totalUnits: count,
        sessionIds: [],
        logisticsLabels: [],
        type: 'dynamic',
        isHammer: false,
        tableName
      };
    }
  }

  return Object.values(groups);
};


/**
 * Reconciliación de Recepción:
 * Compara los registros locales con la nube y elimina los que ya no existen en Firestore.
 */
export const reconcileReception = async (onProgress?: (msg: string) => void): Promise<{ deleted: number }> => {
  try {
    const config = getSettings().cloudConfig;
    const targetTable = config?.receptionTableName || "RECEPCION_BULTOS";
    
    if (onProgress) onProgress("Verificando integridad con la nube...");
    
    const response = await supabaseSyncService.pullBatch(targetTable);
    if (!response.success || !response.rows) return { deleted: 0 };

    const remoteIds = new Set(response.rows.map((r: any) => String(r.id || r.ID)));
    
    // Buscar sesiones locales de recepción que ya fueron sincronizadas (tienen timestamp)
    const localSyncedReception = await SessionRepository.getByType('reception');
    const filteredSynced = localSyncedReception.filter(s => !!s.lastSyncTimestamp);

    const toDelete = filteredSynced.filter(s => !remoteIds.has(s.id));
    
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(s => s.id);
      if (onProgress) onProgress(`Limpiando ${idsToDelete.length} registros obsoletos...`);
      
      await (db as any).transaction('rw', db.scans, db.sessions, async () => {
        await ScanRepository.deleteBySessions(idsToDelete);
        await SessionRepository.deleteMany(idsToDelete);
      });
      
      return { deleted: idsToDelete.length };
    }

    return { deleted: 0 };
  } catch (e: any) {
    logger.error("RECONCILE_RECEPTION_FAIL", e.message);
    return { deleted: 0 };
  }
};

export const performBatchUpload = async (group: UploadGroup, onProgress?: (msg: string) => void): Promise<void> => {
  // FIX: Usa el store en lugar de variable global para thread-safety
  if (isSyncInProgress()) {
    throw new Error("Sincronización en progreso, por favor intente nuevamente en unos segundos.");
  }
  startSync();

  try {
    const config = getSettings().cloudConfig;
    
    if (group.type === 'dynamic' && group.tableName) {
      await dynamicSyncService.syncAllPending(onProgress, group.tableName);
    } else if (group.erpOrder === 'REGISTROS_HUERFANOS') {
      if (onProgress) onProgress("Purgando registros residuales...");
      const unsynced = await ScanRepository.getUnsynced();
      const orphanIds = unsynced.filter(s => !s.sessionId || s.sessionId === 'ORPHAN').map(s => s.id);
      await markScansAsSynced(orphanIds);
    } else if (group.type === 'reception') {
      if (onProgress) onProgress(`Subiendo registro de ${group.sessionCount} bultos...`);
      const rows = group.sessionIds.map((id, idx) => ({
        "id": id,
        "ID_RECEPCION": id,
        "FECHA_HORA": new Date().toISOString(),
        "ETIQUETA": group.logisticsLabels[idx],
        "ESTADO": "INGRESADO"
      }));
      const targetTable = config?.receptionTableName || "RECEPCION_BULTOS";
      const result = await supabaseSyncService.pushBatch(targetTable, rows);
      if (result.success) {
        for (const id of group.sessionIds) {
          await SessionRepository.updateSyncTimestamp(id);
        }
        if (onProgress) onProgress(`✓ Recepción sincronizada.`);
      } else {
        throw new Error(result.error);
      }
    } else {
      for (const sessionId of group.sessionIds) {
        const session = await SessionRepository.getById(sessionId);
        if (!session) continue;

        // RESPALDO DE FOTO EN STORAGE
        if (session.labelPhoto && !session.photoUrl) {
          if (onProgress) onProgress(`Respaldando foto en la nube [${session.logisticsLabel}]...`);
          try {
            const photoPath = `labels/${session.id}.jpg`;
            const uploadResult = await supabaseSyncService.uploadPhoto(session.labelPhoto, photoPath);
            
            if (uploadResult.success && uploadResult.fileUrl) {
              await SessionRepository.updatePhotoUrl(session.id, uploadResult.fileUrl);
              if (onProgress) onProgress(`✓ Foto respaldada.`);
            }
          } catch (photoError) {
            console.warn("Fallo al subir foto:", photoError);
          }
        }

        if (onProgress) onProgress(`Preparando bulto ${session.logisticsLabel}...`);
        
        const allScans = await ScanRepository.getBySession(session.id);
        const unsyncedScans = allScans.filter(s => s.synced === 0);
        
        if (unsyncedScans.length === 0) {
          await SessionRepository.updateSyncTimestamp(sessionId);
          continue;
        }

        const consolidatedItems = await aggregateScans(allScans);
        const fullPayload = createInventoryPayload(session, consolidatedItems, 'manual');
        const targetTable = session.sessionType === 'hammer' 
          ? (config?.countsTableName || "CONTEOS") 
          : (config?.consolidatedTableName || "CONSOLIDADO");

        const totalBatches = Math.ceil(fullPayload.length / UPLOAD_BATCH_SIZE);
        let sessionSuccess = true;
        const allScanIdsToMark: string[] = unsyncedScans.map(s => s.id);

        for (let i = 0; i < totalBatches; i++) {
          const chunk = fullPayload.slice(i * UPLOAD_BATCH_SIZE, (i + 1) * UPLOAD_BATCH_SIZE);
          if (onProgress) onProgress(`Subiendo lote ${i + 1}/${totalBatches}...`);
          
          try {
            const result = await supabaseSyncService.pushBatch(targetTable, chunk);
            
            if (!result.success) {
              sessionSuccess = false;
              logger.error("BATCH_UPLOAD_PARTIAL_FAIL", result.error);
              useSyncStore.getState().addIncident(targetTable, result.error || "Fallo en lote parcial");
              // No lanzamos error aquí para permitir que otros bultos o lotes intenten su suerte si son independientes
            }
          } catch (batchError: any) {
            sessionSuccess = false;
            logger.error("BATCH_UPLOAD_CRITICAL_FAIL", batchError.message);
            useSyncStore.getState().addIncident(targetTable, batchError.message);
          }
        }

        if (sessionSuccess) {
          await ScanRepository.markAsSynced(allScanIdsToMark);
          await SessionRepository.updateSyncTimestamp(sessionId);

          // RESPALDO DE LA SESIÓN EN SESIONES_CONTEO
          try {
            const sessionPayload = {
              id: session.id,
              erpOrder: session.erpOrder,
              logisticsLabel: session.logisticsLabel,
              sessionType: session.sessionType,
              status: session.status || 'completed',
              createdAt: session.createdAt,
              totalUnits: session.totalUnits || 0,
              totalSKUs: session.totalSKUs || 0,
              photoUrl: session.photoUrl || '',
              lastSyncTimestamp: Date.now()
            };
            await supabaseSyncService.pushBatch('SESIONES_CONTEO', [sessionPayload]);
          } catch (sessionPushError) {
             console.warn("Fallo al subir datos de sesion a SESIONES_CONTEO:", sessionPushError);
          }

          if (onProgress) onProgress(`✓ Bulto ${session.logisticsLabel} Sincronizado.`);
        } else {
          if (onProgress) onProgress(`⚠ Bulto ${session.logisticsLabel} con errores. Se reintentará luego.`);
        }
      }
    }
    useSyncStore.getState().setLastSyncTime(Date.now());
  } catch (e: any) {
    logger.error("SYNC_FAIL", e.message);
    throw e;
  } finally {
    endSync();
  }
};

export const syncCatalogs = async (onProgress?: (msg: string) => void): Promise<{ products: number, providers: number }> => {
  if (onProgress) onProgress("Sincronizando catálogos maestros...");
  
  try {
    const [productsCount, providersCount] = await Promise.all([
      importProductsFromCloud(),
      importProvidersFromCloud()
    ]);
    
    if (onProgress) onProgress(`✓ Catálogos actualizados: ${productsCount} productos, ${providersCount} proveedores.`);
    return { products: productsCount, providers: providersCount };
  } catch (e: any) {
    if (e.message === 'Failed to fetch') {
      toast.error('Error de red: No se pudo conectar con el servidor.');
    } else {
      logger.warn("CATALOG_SYNC_PARTIAL_FAIL", e.message);
    }
    throw e;
  }
};

export const importProductsFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().cloudConfig;
    const tableName = config?.productsTableName || "PRODUCTOS";
    
    // Incremental Sync per table
    const { lastSyncPerTable, setTableSyncTime } = useSyncStore.getState();
    const lastSyncTime = lastSyncPerTable[tableName];
    const lastSyncIso = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;
    
    // Pull from cloud only rows updated after our last sync
    const response = await supabaseSyncService.pullBatch(tableName, lastSyncIso, 'updated_at'); 
    
    if (!response.success || !response.rows) return 0;

    const products: Product[] = response.rows
      .map((p: any) => {
        if (p.id === 'undefined') return null;
        const result = CloudProductSchema.safeParse(p);
        if (!result.success) {
          console.warn("Product validation failed:", p, (result as any).error);
        }
        return result.success ? result.data : null;
      })
      .filter((p): p is Product => p !== null)
      .map(p => ({ ...p, syncStatus: 'synced' as const }));

    if (products.length > 0) {
      await saveProductBatch(products);
    }

    // Actualizar Timestamp para esta tabla específica
    setTableSyncTime(tableName, Date.now());

    return products.length;
  } catch (e: any) {
    logger.error("FETCH_PRODUCTS_FAIL", `Error en Cloud Sync: ${e.message}`);
    throw e;
  }
};

export const importProvidersFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().cloudConfig;
    const tableName = config?.providersTableName || "PROVEEDORES";
    
    const { lastSyncPerTable, setTableSyncTime } = useSyncStore.getState();
    const lastSyncTime = lastSyncPerTable[tableName];
    const lastSyncIso = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;

    const response = await supabaseSyncService.pullBatch(tableName, lastSyncIso, 'updated_at'); 
    
    if (!response.success || !response.rows) {
      logger.info("FETCH_PROVIDERS", `No se recibieron datos de ${tableName} (Falla o vacío).`);
      return 0;
    }

    logger.info("FETCH_PROVIDERS", `Recibidas ${response.rows.length} filas desde ${tableName}. Procesando...`);

    const providers: Provider[] = response.rows
      .filter((row: any) => row.id !== 'undefined')
      .map((row: any) => {
        const result = CloudProviderSchema.safeParse(row);
        if (!result.success) {
          console.warn("Provider validation failed:", row, (result as any).error);
          // Intentar un mapeo crudo si falla el esquema estricto (Resiliencia)
          if (row.rut || row.RUT) {
            return {
              rut: String(row.rut || row.RUT || row.id || ''),
              name: String(row.name || row.NOMBRE || 'PROVEEDOR RECONOCIDO'),
              withdrawalDays: Number(row.withdrawaldays || row.withdrawal_days || 0),
              hasExchange: !!(row.hasexchange || row.has_exchange)
            } as Provider;
          }
        }
        return result.success ? result.data : null;
      })
      .filter((p): p is Provider => p !== null && !!p.rut && !!p.name)
      .map(p => ({ ...p, syncStatus: 'synced' as const }));

    if (providers.length > 0) {
      logger.info("FETCH_PROVIDERS", `Guardando ${providers.length} proveedores en base de datos local.`);
      await db.providers.bulkPut(providers);
    } else {
      logger.warn("FETCH_PROVIDERS", "No se encontraron proveedores válidos tras filtrado y validación.");
    }

    setTableSyncTime(tableName, Date.now());

    return providers.length;
  } catch (e: any) {
    logger.error("FETCH_PROVIDERS_FAIL", `Error descargando proveedores: ${e.message}`);
    throw e;
  }
};

export const importCustomersAndTemplatesFromCloud = async (): Promise<void> => {
  const tables = ['CLIENTES', 'PLANTILLAS_MENSAJES', 'PLANTILLAS_CORREOS'];
  
  for (const table of tables) {
    try {
      await dynamicSyncService.pullSync(table);
    } catch (e: any) {
      if (e.message?.includes('Table not found')) {
        logger.info("FETCH_CONFIG", `Módulo ${table} no disponible en esta instancia (Tabla no encontrada).`);
      } else {
        logger.warn("FETCH_CONFIG_FAIL", `Error descargando ${table}: ${e.message}`);
      }
    }
  }
};

export const getGlobalPendingCount = async (): Promise<number> => {
  try {
    let count = 0;
    
    // 1. Pending scans (inventory/compliance/reception items)
    const scanCount = await ScanRepository.getPendingSyncCount();
    count += scanCount;
    
    // 2. Pending sessions
    const sessionCount = await db.sessions
      .where('syncStatus')
      .anyOf(['pending', 'error', 'pending_delete'])
      .count();
    count += sessionCount;

    // 3. Products
    const productCount = await db.products
      .where('syncStatus')
      .anyOf(['pending', 'error', 'pending_delete'])
      .count();
    count += productCount;

    // 4. Providers
    const providerCount = await db.providers
      .where('syncStatus')
      .anyOf(['pending', 'error', 'pending_delete'])
      .count();
    count += providerCount;

    // 5. Dynamic data (Expiry, Events, etc.)
    const dynamicCount = await db.dynamic_data
      .where('syncStatus')
      .anyOf(['pending', 'error', 'pending_delete'])
      .count();
    count += dynamicCount;

    return count;
  } catch (error) {
    console.error('[getGlobalPendingCount] Fail:', error);
    return 0;
  }
};


