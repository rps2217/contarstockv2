import { db } from '../db';
import { CountingSession, Product, Provider } from '../types';
import { logger } from './logger';
import { useSyncStore } from '../store/useSyncStore';
import { saveProductBatch } from './productService';
import { CloudProductSchema } from './schemas';
import { getSettings } from './settings';
import { markScansAsSynced } from './sessionService';
import { aggregateScans } from './aggregator';
import { dynamicSyncService } from './dynamicSync';
import { firebaseSyncService } from './firebaseSyncService';
import { createInventoryPayload } from './cloud/mappers';
import { CustomerRepository } from '../repositories/CustomerRepository';

let isSyncingInProgress = false;
const UPLOAD_BATCH_SIZE = 500; 

export const resetSyncLock = () => {
  isSyncingInProgress = false;
  useSyncStore.getState().setSyncing(false);
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
  const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
  
  if (unsyncedScans.length > 0) {
    const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
    const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
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

  // 2. Reception (Incluir borradores y sesiones finalizadas no sincronizadas)
  const unsyncedReception = await db.sessions
    .where('sessionType').equals('reception')
    .filter(s => !s.lastSyncTimestamp)
    .toArray();

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
    
    const response = await firebaseSyncService.pullBatch(targetTable);
    if (!response.success || !response.rows) return { deleted: 0 };

    const remoteIds = new Set(response.rows.map((r: any) => String(r.id || r.ID)));
    
    // Buscar sesiones locales de recepción que ya fueron sincronizadas (tienen timestamp)
    const localSyncedReception = await db.sessions
      .where('sessionType').equals('reception')
      .filter(s => !!s.lastSyncTimestamp)
      .toArray();

    const toDelete = localSyncedReception.filter(s => !remoteIds.has(s.id));
    
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(s => s.id);
      if (onProgress) onProgress(`Limpiando ${idsToDelete.length} registros obsoletos...`);
      
      await (db as any).transaction('rw', db.scans, db.sessions, async () => {
        await db.scans.where('sessionId').anyOf(idsToDelete).delete();
        await db.sessions.where('id').anyOf(idsToDelete).delete();
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
  if (isSyncingInProgress) {
    throw new Error("Sincronización en progreso, por favor intente nuevamente en unos segundos.");
  }
  isSyncingInProgress = true;
  useSyncStore.getState().setSyncing(true);

  try {
    const config = getSettings().cloudConfig;
    
    if (group.type === 'dynamic' && group.tableName) {
      await dynamicSyncService.syncAllPending(onProgress, group.tableName);
    } else if (group.erpOrder === 'REGISTROS_HUERFANOS') {
      if (onProgress) onProgress("Purgando registros residuales...");
      const unsynced = await db.scans.where('synced').equals(0).toArray();
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
      const result = await firebaseSyncService.pushBatch(targetTable, rows);
      if (result.success) {
        await db.sessions.where('id').anyOf(group.sessionIds).modify({ lastSyncTimestamp: Date.now() });
        if (onProgress) onProgress(`✓ Recepción sincronizada.`);
      } else {
        throw new Error(result.error);
      }
    } else {
      for (const sessionId of group.sessionIds) {
        const session = await db.sessions.get(sessionId);
        if (!session) continue;

        // RESPALDO DE FOTO EN STORAGE (Si existe y no se ha subido)
        if (session.labelPhoto && !session.photoUrl) {
          if (onProgress) onProgress(`Respaldando foto en Firebase [${session.logisticsLabel}]...`);
          try {
            const photoPath = `labels/${session.erpOrder}/${session.logisticsLabel}_${session.id}.jpg`;
            const photoResult = await firebaseSyncService.uploadPhoto(session.labelPhoto, photoPath);
            
            if (photoResult.success && photoResult.fileUrl) {
              await db.sessions.update(sessionId, { photoUrl: photoResult.fileUrl });
              if (onProgress) onProgress(`✓ Foto respaldada en Firebase.`);
            }
          } catch (photoError) {
            console.warn("Fallo al subir foto a Firebase:", photoError);
          }
        }

        if (onProgress) onProgress(`Preparando bulto ${session.logisticsLabel}...`);
        
        const allScans = await db.scans.where('sessionId').equals(session.id).toArray();
        const unsyncedScans = allScans.filter(s => s.synced === 0);
        
        if (unsyncedScans.length === 0) {
          await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
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
          
          const result = await firebaseSyncService.pushBatch(targetTable, chunk);
          
          if (!result.success) {
            sessionSuccess = false;
            throw new Error(`Fallo en lote ${i+1}: ${result.error}`);
          }
        }

        if (sessionSuccess) {
          await markScansAsSynced(allScanIdsToMark);
          await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
          if (onProgress) onProgress(`✓ Bulto ${session.logisticsLabel} sincronizado.`);
        }
      }
    }
    useSyncStore.getState().setLastSyncTime(Date.now());
  } catch (e: any) {
    logger.error("SYNC_FAIL", e.message);
    throw e;
  } finally {
    isSyncingInProgress = false;
    useSyncStore.getState().setSyncing(false);
  }
};

export const importProductsFromFirestore = async (): Promise<number> => {
  try {
    const config = getSettings().cloudConfig;
    const tableName = config?.productsTableName || "PRODUCTOS";
    const response = await firebaseSyncService.pullBatch(tableName);
    
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

    return products.length;
  } catch (e: any) {
    logger.error("FETCH_PRODUCTS_FAIL", `Error en Firestore Sync: ${e.message}`);
    throw e;
  }
};

export const importProvidersFromFirestore = async (): Promise<number> => {
  try {
    const config = getSettings().cloudConfig;
    const tableName = config?.providersTableName || "PROVEEDORES";
    const response = await firebaseSyncService.pullBatch(tableName);
    
    if (!response.success || !response.rows) return 0;

    const providers: Provider[] = response.rows
      .filter((row: any) => row.id !== 'undefined')
      .map((row: any) => {
        const rut = String(row.rut || row.RUT || row.ID || row.ID_RUT || '');
        const name = String(row.name || row.NOMBRE || row.PROVEEDOR || '');
        const withdrawalDays = Number(row.withdrawalDays || row.DIAS_RETIRO || 0);
        const hasExchange = Boolean(row.hasExchange || withdrawalDays > 0);

        return { rut, name, withdrawalDays, hasExchange };
      })
      .filter((p: Provider) => p.rut && p.name);

    if (providers.length > 0) {
      await db.providers.bulkPut(providers);
    }

    return providers.length;
  } catch (e: any) {
    logger.error("FETCH_PROVIDERS_FAIL", `Error descargando proveedores: ${e.message}`);
    throw e;
  }
};

// Forced GitHub sync
