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
  type: 'inventory' | 'reception' | 'products' | 'orphans';
  isHammer: boolean;
}

export const getPendingUploadGroups = async (): Promise<UploadGroup[]> => {
  const groups: Record<string, UploadGroup> = {};
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
    
    if (group.erpOrder === 'REGISTROS_HUERFANOS') {
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
        const unsyncedScans = await db.scans.where('sessionId').equals(session.id).filter(s => s.synced === 0).toArray();
        if (unsyncedScans.length === 0) {
          await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
          continue;
        }
        const consolidatedItems = await aggregateScans(unsyncedScans);
        const fullPayload = createInventoryPayload(session, consolidatedItems, 'manual');
        const targetTable = session.sessionType === 'hammer' 
          ? (config?.countsTableName || "CONTEOS") 
          : (config?.consolidatedTableName || "CONSOLIDADO");

        const totalBatches = Math.ceil(fullPayload.length / UPLOAD_BATCH_SIZE);
        for (let i = 0; i < totalBatches; i++) {
          const chunk = fullPayload.slice(i * UPLOAD_BATCH_SIZE, (i + 1) * UPLOAD_BATCH_SIZE);
          if (onProgress) onProgress(`Subiendo lote ${i + 1}/${totalBatches}...`);
          const result = await cloudApi.appendRows(targetTable, chunk);
          if (result.success) {
            const chunkBarcodes = new Set(chunk.map((row: any) => row['CODIGO']));
            const scanIdsToMark = unsyncedScans.filter(s => chunkBarcodes.has(s.barcode)).map(s => s.id);
            await markScansAsSynced(scanIdsToMark);
          } else {
            throw new Error(`Fallo en lote ${i+1}: ${result.error}`);
          }
        }
        await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
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
    const response = await cloudApi.fetchTable(config?.productsTableName || "PRODUCTOS", lastSyncTimestamp);
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

export const importExpirationsFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().appSheetConfig;
    const mapping = config?.columnMapping;
    const tableName = config?.inventoryRegistryTableName || "REGISTRO_INV";
    
    const response = await cloudApi.fetchTable(tableName);
    const rawRows = response.rows || [];
    
    if (rawRows.length === 0) return 0;

    const expirations = rawRows
      .filter((row: any) => {
        const eventKey = mapping?.event || 'EVENTO';
        const mmKey = mapping?.mm || 'MM';
        const yyyyKey = mapping?.yyyy || 'YYYY';

        const evento = String(row[eventKey] || row['EVENTO'] || '').toUpperCase();
        const mm = row[mmKey] || row[SHEET_COLUMNS.MONTH] || row['MES'] || row['MONTH'];
        const yyyy = row[yyyyKey] || row[SHEET_COLUMNS.YEAR] || row['AÑO'] || row['YEAR'];
        // Ahora permitimos cualquier evento, o si no tiene evento pero tiene mm y yyyy
        return evento || (mm && yyyy);
      })
      .map((row: any) => {
        const mmKey = mapping?.mm || 'MM';
        const yyyyKey = mapping?.yyyy || 'YYYY';
        const barcodeKey = mapping?.barcode || 'SKU';
        const traspasoKey = mapping?.traspaso || 'TRASPASO';
        const destinoKey = mapping?.destino || 'DESTINO';
        const obsKey = mapping?.observaciones || 'OBSERVACIONES';
        const eventKey = mapping?.event || 'EVENTO';
        const qtyKey = mapping?.quantity || 'CANTIDAD';
        const locKey = mapping?.location || 'BOD.';
        const frcKey = mapping?.frc || 'FRC';
        const erpKey = mapping?.erp || 'ERP';
        const adjKey = mapping?.isAdjusted || 'AJUSTADO';

        const mm = row[mmKey] || row[SHEET_COLUMNS.MONTH] || row['MES'] || row['MONTH'];
        const yyyy = row[yyyyKey] || row[SHEET_COLUMNS.YEAR] || row['AÑO'] || row['YEAR'];
        const barcode = normalizeSku(String(row[barcodeKey] || row['SKU'] || row['COD_BARRAS'] || row['COD PRODUCTO'] || ''));
        
        let claveUnica = row['CLAVE_UNICA'] || row['CLAVE'];
        if (!claveUnica && barcode) {
          // Generar clave única basada en barcode y timestamp si no hay mm/yyyy
          if (mm && yyyy) {
            const lastDay = new Date(parseInt(yyyy, 10), parseInt(mm, 10), 0).getDate();
            const mmPadded = ("0" + mm).slice(-2);
            const ddPadded = ("0" + lastDay).slice(-2);
            claveUnica = barcode + yyyy + mmPadded + ddPadded;
          } else {
            claveUnica = barcode + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          }
        }

        const traspaso = String(row[traspasoKey] || row['TRASPASO'] || row['TRANSFER'] || row['N_TRASPASO'] || row['DOC-TRAS-INTER'] || '');
        const destino = String(row[destinoKey] || row['DESTINO'] || row['DESTINATION'] || '');
        const observaciones = String(row[obsKey] || row['OBSERVACIONES'] || row['OBSERVATION'] || row['NOTAS'] || '');

        const ajustadoKey = Object.keys(row).find(key => key.toUpperCase() === (adjKey?.toUpperCase() || 'AJUSTADO'));
        const ajustadoStr = ajustadoKey ? String(row[ajustadoKey] || '').toLowerCase().trim() : '';
        // Un registro se considera ajustado si tiene el flag 'AJUSTADO' o si ya tiene un número de TRASPASO (Columna L)
        const isAdjusted = ['sí', 'si', 'yes', 'true', '1'].includes(ajustadoStr) || (traspaso && traspaso.trim() !== '');

        const rawTimestamp = row['TIMESTAMP'] || row['FECHA_INGRESO'] || row['FECHA DE INGRESO'] || row['FECHA'] || row['FECHA CREACION'] || row['CREATED_AT'];
        let parsedTimestamp = Date.now();
        if (rawTimestamp) {
          const parsed = new Date(rawTimestamp).getTime();
          if (!isNaN(parsed)) parsedTimestamp = parsed;
        }

        const frc = String(row[frcKey] || row['FRC'] || row['INCIDENT'] || row['RFC'] || row['FOLIO'] || row['INCIDENCIA'] || '');
        const erp = String(row[erpKey] || row['ERP'] || row['PEDIDO'] || row['ORDEN'] || row['ORDEN_ERP'] || '');

        return {
          id: row['ID_REGISTRO'] || row['ID'] || crypto.randomUUID(),
          barcode,
          productName: String(row[mapping?.productName || 'DESCRIPTOR'] || row['DESCRIPTOR'] || row['DESCRIPCION_PROD'] || row['DESCRIPCION'] || ''),
          mm: parseInt(mm, 10) || 0,
          yyyy: parseInt(yyyy, 10) || 0,
          event: String(row[eventKey] || row['EVENTO'] || ''),
          quantity: parseFloat(row[qtyKey] || row['CANTIDAD'] || row['QUANTITY']) || 0,
          location: String(row[locKey] || row['BOD.'] || row['ETIQUETAS'] || ''),
          fechaIngreso: String(row['FECHA_INGRESO'] || row['FECHA DE INGRESO'] || ''),
          timestamp: parsedTimestamp,
          claveUnica,
          isAdjusted,
          frc,
          erp,
          destino,
          traspaso,
          observaciones,
          syncStatus: 'synced'
        };
      })
      .filter((exp: any) => exp.barcode);

    if (expirations.length > 0) {
      // Deduplicar por claveUnica para evitar ConstraintError si el ID es distinto pero la clave es igual
      const uniqueExpirationsMap = new Map();
      expirations.forEach(exp => {
        if (exp.claveUnica) {
          // Si ya existe, preferimos el que tenga ID (si uno no tiene) o simplemente el último
          uniqueExpirationsMap.set(exp.claveUnica, exp);
        } else {
          // Si no tiene clave única (raro), lo agregamos por ID
          uniqueExpirationsMap.set(exp.id, exp);
        }
      });
      const uniqueExpirations = Array.from(uniqueExpirationsMap.values());

      // Preserve pending items
      const pendingItems = await db.cloudExpirations.filter(item => item.syncStatus === 'pending').toArray();
      const pendingMap = new Map(pendingItems.map(item => [item.claveUnica || item.id, item]));

      const finalExpirations = uniqueExpirations.map(exp => {
        const key = exp.claveUnica || exp.id;
        if (pendingMap.has(key)) {
          // If it's in the cloud, it's no longer pending
          pendingMap.delete(key);
        }
        return exp;
      });

      // Add back the remaining pending items
      finalExpirations.push(...Array.from(pendingMap.values()));

      await db.cloudExpirations.clear();
      await db.cloudExpirations.bulkPut(finalExpirations);
    }

    return expirations.length;
  } catch (e: any) {
    logger.error("FETCH_EXPIRATIONS_FAIL", `Error descargando vencimientos: ${e.message}`);
    throw e;
  }
};

export const importProvidersFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().appSheetConfig;
    const tableName = config?.providersTableName || "PROVEEDORES";
    
    const response = await cloudApi.fetchTable(tableName);
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
      await db.providers.clear();
      await db.providers.bulkPut(providers);
    }

    return providers.length;
  } catch (e: any) {
    logger.error("FETCH_PROVIDERS_FAIL", `Error descargando proveedores: ${e.message}`);
    throw e;
  }
};
