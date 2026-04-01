import { db } from '../db';
import { SHEET_COLUMNS } from './constants';
import { CountingSession, Product, Provider } from '../types';
import { logger } from './logger';
import { useSyncStore } from '../store/useSyncStore';
import { saveProductBatch } from './productService';
import { CloudProductSchema } from './schemas';
import { normalizeSku } from './utils';
import { getSettings } from './settings';
import { markScansAsSynced } from './sessionService';
import { aggregateScans } from './aggregator';
import { dynamicSyncService } from './dynamicSync';

// Nuevas capas importadas
import { cloudApi } from './cloud/apiClient';
import { createInventoryPayload } from './cloud/mappers';

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

  // 2. Reception
  const unsyncedReception = await db.sessions
    .where('status').equals('completed')
    .and(s => !s.lastSyncTimestamp && (s.totalUnits === 0 || !s.totalUnits) && s.erpOrder === 'RECEPCION_BORRADOR')
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

export const performBatchUpload = async (group: UploadGroup, onProgress?: (msg: string) => void): Promise<void> => {
  if (isSyncingInProgress) {
    throw new Error("Sincronización en progreso, por favor intente nuevamente en unos segundos.");
  }
  isSyncingInProgress = true;
  useSyncStore.getState().setSyncing(true);

  try {
    const config = getSettings().appSheetConfig;
    
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
        "ID_RECEPCION": id,
        "FECHA_HORA": new Date().toLocaleString('es-CL'),
        "ETIQUETA": group.logisticsLabels[idx],
        "ESTADO": "INGRESADO"
      }));
      const targetTable = config?.receptionTableName || "RECEPCION_BULTOS";
      const result = await cloudApi.appendRows(targetTable, rows);
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

        // RESPALDO DE FOTO EN DRIVE (Si existe y no se ha subido)
        if (session.labelPhoto && !session.photoUrl) {
          if (onProgress) onProgress(`Respaldando foto en Drive [${session.logisticsLabel}]...`);
          try {
            const photoResult = await cloudApi.post('upload_photo', {
              base64: session.labelPhoto,
              erpOrder: session.erpOrder,
              label: session.logisticsLabel,
              mimeType: 'image/jpeg'
            });
            if (photoResult.success && photoResult.fileUrl) {
              await db.sessions.update(sessionId, { photoUrl: photoResult.fileUrl });
              if (onProgress) onProgress(`✓ Foto respaldada en Drive.`);
            }
          } catch (photoError) {
            console.warn("Fallo al subir foto a Drive:", photoError);
          }
        }

        if (onProgress) onProgress(`Preparando bulto ${session.logisticsLabel}...`);
        
        // Obtenemos TODOS los escaneos de la sesión para enviar el estado absoluto (idempotencia)
        const allScans = await db.scans.where('sessionId').equals(session.id).toArray();
        const unsyncedScans = allScans.filter(s => s.synced === 0);
        
        if (unsyncedScans.length === 0) {
          await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
          continue;
        }

        // Agregamos TODOS los escaneos para que el upsert en la nube represente el total real de la sesión
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
          
          const result = await cloudApi.upsertRows(targetTable, chunk);
          
          if (!result.success) {
            sessionSuccess = false;
            throw new Error(`Fallo en lote ${i+1}: ${result.error}`);
          }
        }

        if (sessionSuccess) {
          if (onProgress) onProgress(`Verificando integridad en la nube...`);
          
          let integrityVerified = false;
          const maxIntegrityRetries = 3;
          
          for (let attempt = 0; attempt < maxIntegrityRetries; attempt++) {
            if (attempt > 0) {
              if (onProgress) onProgress(`Reintentando verificación (${attempt}/${maxIntegrityRetries})...`);
              await new Promise(r => setTimeout(r, 2000)); // Esperar 2s entre reintentos
            }

            const summary = await cloudApi.getSummary(targetTable, 'ERP', session.erpOrder);
            
            if (summary.success) {
              const relatedSessions = await db.sessions.where('erpOrder').equals(session.erpOrder).toArray();
              const sessionIds = relatedSessions.map(s => s.id);
              const allLocalScansForErp = await db.scans.where('sessionId').anyOf(sessionIds).toArray();
              const expectedTotal = allLocalScansForErp.reduce((acc, s) => acc + (s.quantity || 0), 0);
              
              if (summary.totalUnits >= expectedTotal) {
                if (onProgress) onProgress(`✓ Integridad verificada: ${summary.totalUnits} unidades en nube.`);
                integrityVerified = true;
                break;
              } else if (attempt === maxIntegrityRetries - 1) {
                throw new Error(`Fallo de integridad: Nube(${summary.totalUnits}) < Local(${expectedTotal}). Los datos no coinciden tras ${maxIntegrityRetries} intentos.`);
              }
            } else if (attempt === maxIntegrityRetries - 1) {
              if (onProgress) onProgress(`⚠️ Error verificando integridad: ${summary.error}. Marcando como éxito por upsert previo.`);
              integrityVerified = true; // Fallback para no bloquear si el summary falla pero el upsert fue OK
            }
          }

          if (integrityVerified) {
            await markScansAsSynced(allScanIdsToMark);
            await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
          }
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

export const importProductsFromAppSheet = async (): Promise<number> => {
  try {
    const config = getSettings().appSheetConfig;
    const lastSyncTimestamp = localStorage.getItem('last_product_sync_time') || '0';
    const response = await cloudApi.fetchTable(
      config?.productsTableName || "PRODUCTOS", 
      lastSyncTimestamp
    );
    const rawProducts = response.rows || [];
    
    if (rawProducts.length === 0) return 0;

    const products: Product[] = rawProducts
      .map((p: any) => {
        const result = CloudProductSchema.safeParse(p);
        return result.success ? result.data : null;
      })
      .filter((p): p is Product => p !== null)
      .map(p => ({ ...p, syncStatus: 'synced' as const }));

    if (products.length > 0) {
      await saveProductBatch(products);
      localStorage.setItem('last_product_sync_time', response.server_timestamp || String(Date.now()));
    }

    return products.length;
  } catch (e: any) {
    logger.error("FETCH_PRODUCTS_FAIL", `Error en Smart Sync: ${e.message}`);
    throw e;
  }
};

export const importProvidersFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().appSheetConfig;
    const tableName = config?.providersTableName || "PROVEEDORES";
    const lastSyncTimestamp = localStorage.getItem('last_provider_sync_time') || '0';
    const response = await cloudApi.fetchTable(tableName, lastSyncTimestamp);
    const rawRows = response.rows || [];
    
    if (rawRows.length === 0) return 0;

    const providers: Provider[] = rawRows
      .map((row: any) => {
        // Fallbacks para RUT (Columna A)
        const rut = normalizeSku(
          String(
            row['ID_RUT'] || 
            row['RUT'] || 
            row['ID'] || 
            row['RUT PROVEEDOR'] || 
            row['RUT_PROVEEDOR'] ||
            ''
          )
        );
        
        // Fallbacks para Nombre (Columna B/C)
        const name = String(
          row['NOMBRE PROVEEDOR'] || 
          row['PROVEEDOR'] || 
          row['NOMBRE'] || 
          row['PROV'] ||
          ''
        );
        
        // Fallbacks para Días de Retiro (Columna H)
        const withdrawalRaw = String(
          row['RETIRO (DÍAS)'] || 
          row['DIAS_RETIRO'] || 
          row['RETIRO'] || 
          row['DIAS RETIRO'] ||
          '0'
        );
        
        let withdrawalDays = 0;
        const normalizedWithdrawal = withdrawalRaw.toUpperCase().trim();
        if (normalizedWithdrawal === 'AL VENCE' || normalizedWithdrawal === 'AL VENCIMIENTO') {
          withdrawalDays = 0;
        } else {
          const match = normalizedWithdrawal.match(/\d+/);
          withdrawalDays = match ? parseInt(match[0], 10) : 0;
        }

        // NUEVO ENFOQUE SIMPLIFICADO:
        // Si Column H es 0 -> SIN CANJE.
        // Si Column H es > 0 -> CON CANJE.
        const hasExchange = withdrawalDays > 0;

        return {
          rut,
          name,
          withdrawalDays,
          hasExchange
        };
      })
      .filter((p: Provider) => p.rut && p.name);

    if (providers.length > 0) {
      await db.providers.bulkPut(providers);
      localStorage.setItem('last_provider_sync_time', String(response.server_timestamp || Date.now()));
    }

    return providers.length;
  } catch (e: any) {
    logger.error("FETCH_PROVIDERS_FAIL", `Error descargando proveedores: ${e.message}`);
    throw e;
  }
};
