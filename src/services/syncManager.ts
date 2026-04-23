import { db } from '../db';
import { CountingSession, Product, Provider } from '../types';
import { logger } from './logger';
import { normalizeIdentity } from './utils';
import { useSyncStore } from '../store/useSyncStore';
import { saveProductBatch } from './productService';
import { CloudProductSchema } from './schemas';
import { getSettings } from './settings';
import { markScansAsSynced } from './sessionService';
import { aggregateScans } from './aggregator';
import { dynamicSyncService } from './dynamicSync';
import { supabaseSyncService } from './supabaseSyncService';
import { createInventoryPayload } from './cloud/mappers';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { supabase } from '../lib/supabase';
import { collection, getDocs } from 'firebase/firestore';
import { db as firebaseDb } from '../lib/firebase';

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
 * RESPALDO MAESTRO: Sube todos los productos locales a Supabase
 */
export const backupProductsToSupabase = async (onProgress?: (msg: string) => void): Promise<number> => {
  try {
    if (onProgress) onProgress("Obteniendo productos locales...");
    const products = await db.products.toArray();
    
    if (products.length === 0) {
      if (onProgress) onProgress("No hay productos locales para respaldar.");
      return 0;
    }

    const config = getSettings().cloudConfig;
    const tableName = config?.productsTableName || "PRODUCTOS";
    
    if (onProgress) onProgress(`Preparando ${products.length} productos para subir...`);
    
    const totalBatches = Math.ceil(products.length / UPLOAD_BATCH_SIZE);
    let totalUploaded = 0;

    for (let i = 0; i < totalBatches; i++) {
      const chunk = products.slice(i * UPLOAD_BATCH_SIZE, (i + 1) * UPLOAD_BATCH_SIZE);
      if (onProgress) onProgress(`Subiendo lote de productos ${i + 1}/${totalBatches}...`);
      
      const rows = chunk.map(p => ({
        barcode: p.barcode,
        name: p.name,
        category: p.category || 'GENERAL',
        supplier: p.supplier || '',
        supplier_rut: p.supplierRut || '',
        price: p.price || 0,
        units_per_box: p.unitsPerBox || 1,
        timestamp: new Date().toISOString()
      }));

      const result = await supabaseSyncService.pushBatch(tableName, rows);
      if (!result.success) throw new Error(result.error);
      totalUploaded += chunk.length;
    }

    return totalUploaded;
  } catch (e: any) {
    logger.error("BACKUP_PRODUCTS_FAIL", e.message);
    throw e;
  }
};

/**
 * RESPALDO MAESTRO: Sube todos los proveedores locales a Supabase
 */
export const backupProvidersToSupabase = async (onProgress?: (msg: string) => void): Promise<number> => {
  try {
    if (onProgress) onProgress("Obteniendo proveedores locales...");
    const providers = await db.providers.toArray();
    
    if (providers.length === 0) {
      if (onProgress) onProgress("No hay proveedores locales para respaldar.");
      return 0;
    }

    const config = getSettings().cloudConfig;
    const tableName = config?.providersTableName || "PROVEEDORES";
    
    if (onProgress) onProgress(`Subiendo ${providers.length} proveedores...`);
    
    const rows = providers.map(p => ({
      rut: p.rut,
      name: p.name,
      withdrawal_days: p.withdrawalDays || 0,
      has_exchange: p.hasExchange || false,
      timestamp: new Date().toISOString()
    }));

    const result = await supabaseSyncService.pushBatch(tableName, rows);
    if (!result.success) throw new Error(result.error);
    
    return providers.length;
  } catch (e: any) {
    logger.error("BACKUP_PROVIDERS_FAIL", e.message);
    throw e;
  }
};

/**
 * MIGRACIÓN MAESTRA: Descarga de Firebase y sube a Supabase directamente
 */
export const migrateCatalogsFromFirebase = async (onProgress?: (msg: string) => void): Promise<{ products: number, providers: number }> => {
  let pCount = 0;
  let provCount = 0;

  try {
    // 1. PRODUCTOS
    if (onProgress) onProgress("Leyendo PRODUCTOS desde Firebase...");
    const productsSnap = await getDocs(collection(firebaseDb, 'PRODUCTOS'));
    const firebaseProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (firebaseProducts.length > 0) {
      if (onProgress) onProgress(`Migrando ${firebaseProducts.length} productos a Supabase...`);
      // Deduplicar productos para evitar "ON CONFLICT DO UPDATE command cannot affect row a second time"
      const uniqueRowsMap = new Map();
      firebaseProducts.forEach((p: any) => {
        const productIdentity = String(p.barcode || p.COD_PRODUCTO || p.CODIGO || p.SKU || p.id || crypto.randomUUID());
        uniqueRowsMap.set(productIdentity, {
          id: productIdentity, 
          barcode: productIdentity,
          name: String(p.name || p.NOMBRE || p.PRODUCTO || p.DESCRIPTOR || 'PRODUCTO DESCONOCIDO'),
          category: String(p.category || p.CATEGORIA || p.MUNDO || 'GENERAL'),
          supplier: String(p.supplier || p.PROVEEDOR || ''),
          supplierRut: String(p.supplierRut || p.PROVEEDOR_RUT || p.RUT || ''),
          price: Number(p.price || p.PRECIO || 0),
          unitsPerBox: Number(p.unitsPerBox || p.UNIDADES_X_CAJA || 1),
          timestamp: new Date().toISOString()
        });
      });
      const rows = Array.from(uniqueRowsMap.values());

      // Subir en lotes a Supabase
      const totalBatches = Math.ceil(rows.length / UPLOAD_BATCH_SIZE);
      for (let i = 0; i < totalBatches; i++) {
        const chunk = rows.slice(i * UPLOAD_BATCH_SIZE, (i + 1) * UPLOAD_BATCH_SIZE);
        if (onProgress) onProgress(`Subiendo lote de productos ${i + 1}/${totalBatches}...`);
        
        let result = { success: false, error: '' };
        
        // Fase 1: Inyección directa estricta (Formato Postgres Natural)
        try {
           // En postgres lo natural es usar snake_case para las columnas derivadas de variables. Evitamos timestamp.
           const { error } = await supabase.from('PRODUCTOS').upsert(chunk.map(p => ({
               id: p.id,
               barcode: p.barcode,
               name: p.name,
               category: p.category,
               supplier: p.supplier,
               supplier_rut: p.supplierRut,
               price: p.price,
               units_per_box: p.unitsPerBox
           })), { onConflict: 'id' });
           if (error) throw error;
           result.success = true;
        } catch(e: any) {
           result.success = false;
           result.error = e.message || JSON.stringify(e);
        }
        
        // Fase 2: Inyección de Supervivencia sin campos de snake_case por si faltan en su esquema
        if (!result.success) {
           if (onProgress) onProgress(`Modo seguro: enviando solo datos vitales (lote ${i + 1})...`);
           try {
               const { error } = await supabase.from('PRODUCTOS').upsert(chunk.map(p => ({
                   id: p.id,
                   barcode: p.barcode,
                   name: p.name,
                   category: p.category,
                   supplier: p.supplier,
                   price: p.price
               })), { onConflict: 'id' });
               if (error) throw error;
               result.success = true;
           } catch(e: any) {
               result.success = false;
               result.error = e.message || JSON.stringify(e);
           }
        }
        
        // Fase 3: Supervivencia Básica Absoluta
        if (!result.success) {
           if (onProgress) onProgress(`Modo supervivencia hardcore: solo id, barcode, name (lote ${i + 1})...`);
           try {
               const { error } = await supabase.from('PRODUCTOS').upsert(chunk.map(p => ({
                   id: p.id,
                   barcode: p.barcode,
                   name: p.name
               })), { onConflict: 'id' });
               if (error) throw error;
               result.success = true;
           } catch(e: any) {
               result.success = false;
               result.error = e.message || JSON.stringify(e);
           }
        }

        if (!result.success) throw new Error(`Fallo ultra crítico en productos (${i+1}/${totalBatches}). Supabase rechazó: ${result.error}`);
        pCount += chunk.length;
      }
      
      // Guardar localmente también para que la app responda de inmediato
      const localProducts = rows.map(r => ({ ...r, syncStatus: 'synced' as const }));
      await db.products.bulkPut(localProducts);
    }

    // 2. PROVEEDORES
    if (onProgress) onProgress("Leyendo PROVEEDORES desde Firebase...");
    const provSnap = await getDocs(collection(firebaseDb, 'PROVEEDORES'));
    const firebaseProviders = provSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (firebaseProviders.length > 0) {
      if (onProgress) onProgress(`Migrando ${firebaseProviders.length} proveedores a Supabase...`);
      const uniqueProvMap = new Map();
      firebaseProviders.forEach((p: any) => {
        const provIdentity = String(p.rut || p.RUT || p.ID || p.id || crypto.randomUUID());
        if (provIdentity && String(p.name || p.PROVEEDOR || p.NOMBRE || '')) {
            uniqueProvMap.set(provIdentity, {
              rut: provIdentity,
              name: String(p.name || p.PROVEEDOR || p.NOMBRE || ''),
              withdrawalDays: Number(p.withdrawalDays || p.DIAS_RETIRO || 0),
              hasExchange: Boolean(p.hasExchange || p.CANJE || false),
              timestamp: new Date().toISOString()
            });
        }
      });
      const rows = Array.from(uniqueProvMap.values());

      // Bypassing any intermediate pushBatch wrapper strictly to avoid cache interference
      let result = { success: false, error: '' };
      
      // Primera Inyección Directa Pura con todas las propiedades en Snake Case estándar Postgres
      try {
         const { error } = await supabase.from('PROVEEDORES').upsert(rows.map(p => ({
             rut: String(p.rut),
             name: String(p.name),
             withdrawal_days: Number(p.withdrawalDays || 0),
             has_exchange: Boolean(p.hasExchange)
         })), { onConflict: 'rut' });
         
         if (error) { throw error; }
         result.success = true;
      } catch(err: any) {
         result.success = false;
         result.error = err.message || JSON.stringify(err);
      }

      // Nivel 2 de Inyección Directa omitiendo "has_exchange" que parece conflictivo en tu schema actual Supabase
      if (!result.success) {
          if (onProgress) onProgress("Adaptando esquema: quitando campos estrictos...");
          try {
             const { error } = await supabase.from('PROVEEDORES').upsert(rows.map(p => ({
                 rut: String(p.rut),
                 name: String(p.name),
                 withdrawal_days: Number(p.withdrawalDays || 0)
             })), { onConflict: 'rut' });
             
             if (error) { throw error; }
             result.success = true;
          } catch(err: any) {
             result.success = false;
             result.error = err.message || JSON.stringify(err);
          }
      }

      // Nivel 3 de Inyección de Supervivencia: Solo RUT y Nombre
      if (!result.success) {
          if (onProgress) onProgress("Reintento final: inyección de supervivencia en proveedores...");
          try {
             // Solo mandamos el rut y el nombre explícitamente y nada más
             const { error } = await supabase.from('PROVEEDORES').upsert(rows.map(p => ({
                 rut: String(p.rut),
                 name: String(p.name)
             })), { onConflict: 'rut' });
             
             if (error) { throw error; }
             result.success = true;
          } catch(err: any) {
             result.success = false;
             result.error = err.message || JSON.stringify(err);
          }
      }

      if (!result.success) throw new Error(`Fallo ultra crítico en proveedores. La base de datos SQL rechazó las columnas rut o name: ${result.error}`);
      provCount = rows.length;
      
      // Guardar localmente
      await db.providers.bulkPut(rows);
    }

    return { products: pCount, providers: provCount };
  } catch (e: any) {
    logger.error("MIGRATE_CATALOGS_FAIL", e.message);
    throw e;
  }
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
      const result = await supabaseSyncService.pushBatch(targetTable, rows);
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

        // RESPALDO DE FOTO EN STORAGE - NOTA: Supabase Storage podría requerir implementación distinta
        if (session.labelPhoto && !session.photoUrl) {
          if (onProgress) onProgress(`Respaldando foto en la nube [${session.logisticsLabel}]...`);
          try {
            // Mantenemos Firebase Storage por ahora o deshabilitamos si no hay Supabase Storage listo
            if (onProgress) onProgress(`⚠ Salto de respaldo de foto (pendiente migración Storage)`);
          } catch (photoError) {
            console.warn("Fallo al subir foto:", photoError);
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
          
          const result = await supabaseSyncService.pushBatch(targetTable, chunk);
          
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

export const importProductsFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().cloudConfig;
    const tableName = config?.productsTableName || "PRODUCTOS";
    const response = await supabaseSyncService.pullBatch(tableName);
    
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

    // DESCARGAR TAMBIÉN PROVEEDORES (Políticas de Retiro)
    try {
      await importProvidersFromCloud();
    } catch (e) {
      console.warn("Fallo descarga de proveedores:", e);
    }

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
    const response = await supabaseSyncService.pullBatch(tableName);
    
    if (!response.success || !response.rows) return 0;

    const providers: Provider[] = response.rows
      .filter((row: any) => row.id !== 'undefined')
      .map((row: any) => {
        // Normalización de claves para manejar snake_case y camelCase
        const rut = normalizeIdentity(String(row.rut || row.RUT || row.ID || row.ID_RUT || ''));
        const name = String(row.name || row.NOMBRE || row.PROVEEDOR || '');
        
        // Días de retiro: Soporta múltiples formatos
        const rawWithdrawal = row.withdrawal_days !== undefined ? row.withdrawal_days :
                             row.withdrawalDays !== undefined ? row.withdrawalDays :
                             row.DIAS_RETIRO || 0;
        const withdrawalDays = Number(rawWithdrawal);

        // Política de Canje: Manejo robusto de Booleanos (incluyendo strings de CSV/Legacy)
        const rawExchange = row.has_exchange !== undefined ? row.has_exchange :
                           row.hasExchange !== undefined ? row.hasExchange :
                           row.CANJE;
        
        let hasExchange = false;
        if (typeof rawExchange === 'boolean') {
          hasExchange = rawExchange;
        } else if (typeof rawExchange === 'string') {
          const s = rawExchange.toUpperCase().trim();
          hasExchange = (s === 'TRUE' || s === '1' || s === 'SI' || s === 'CANJE');
        } else if (typeof rawExchange === 'number') {
          hasExchange = rawExchange === 1;
        } else {
          // Heurística de supervivencia: si tiene días de retiro > 0, probablemente tiene canje
          hasExchange = withdrawalDays > 0;
        }

        console.debug(`[Sync] Mapeando Proveedor: ${rut} - ${name} | Canje: ${hasExchange} | Días: ${withdrawalDays}`);
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
