
import { db } from '../db';
import { SHEET_COLUMNS } from './constants';
import { CountingSession, Product, Provider } from '../types';
import { logger } from './logger';
import { useSyncStore } from '../store/useSyncStore';
import { saveProductBatch } from './productService';
import { CloudProductSchema } from './schemas';
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

/**
 * MOTOR SMART SYNC V4.0 (IMPORTACIÓN)
 * Solo descarga lo que ha cambiado desde la última descarga exitosa.
 */
export const importProductsFromAppSheet = async (): Promise<number> => {
 try {
 const config = getSettings().appSheetConfig;
 
 // Recuperamos el timestamp guardado de la última descarga exitosa
 const lastSyncTimestamp = localStorage.getItem('last_product_sync_time') || '0';
 
 // El servidor GAS ahora recibe este timestamp y filtra los resultados
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
 // bulkPut realiza la lógica "Smart": Si el SKU existe lo actualiza, si no lo crea.
 await saveProductBatch(products);
 
 // Actualizamos nuestro marcador de tiempo con la hora del servidor
 localStorage.setItem('last_product_sync_time', response.server_timestamp || String(Date.now()));
 }

 return products.length;
 } catch (e: any) {
 logger.error("FETCH_PRODUCTS_FAIL", `Error en Smart Sync: ${e.message}`);
 throw e;
 }
};

/**
 * MOTOR DE DESCARGA DE VENCIMIENTOS (IMPORTACIÓN)
 * Descarga los registros de vencimientos desde la tabla consolidada en la nube.
 */
export const importExpirationsFromCloud = async (): Promise<number> => {
 try {
 const config = getSettings().appSheetConfig;
 const tableName = config?.inventoryRegistryTableName || "REGISTRO_INV";
 
 const response = await cloudApi.fetchTable(tableName);
 const rawRows = response.rows || [];
 
 if (rawRows.length === 0) return 0;

 const expirations = rawRows
 .filter((row: any) => {
 const evento = String(row['EVENTO'] || '').toUpperCase();
 const mm = row[SHEET_COLUMNS.MONTH] || row['MES'] || row['MONTH'];
 const yyyy = row[SHEET_COLUMNS.YEAR] || row['AÑO'] || row['YEAR'];
 return evento === 'VENCIMIENTOS' || (mm && yyyy);
 })
 .map((row: any) => {
 return {
 id: row['ID_REGISTRO'] || row['ID'] || crypto.randomUUID(),
 barcode: String(row['SKU'] || row['COD_BARRAS'] || row['COD PRODUCTO'] || ''),
 productName: String(row['DESCRIPTOR'] || row['DESCRIPCION_PROD'] || row['DESCRIPCION'] || ''),
 mm: parseInt(row[SHEET_COLUMNS.MONTH] || row['MES'] || row['MONTH'], 10) || 0,
 yyyy: parseInt(row[SHEET_COLUMNS.YEAR] || row['AÑO'] || row['YEAR'], 10) || 0,
 event: String(row['EVENTO'] || ''),
 quantity: parseFloat(row['CANTIDAD'] || row['QUANTITY']) || 0,
 location: String(row['BOD.'] || row['ETIQUETAS'] || ''),
 timestamp: Date.now()
 };
 })
 .filter((exp: any) => exp.barcode && exp.mm > 0 && exp.yyyy > 0);

 if (expirations.length > 0) {
 await db.cloudExpirations.clear();
 await db.cloudExpirations.bulkPut(expirations);
 }

 return expirations.length;
 } catch (e: any) {
 logger.error("FETCH_EXPIRATIONS_FAIL", `Error descargando vencimientos: ${e.message}`);
 throw e;
 }
};

/**
 * MOTOR DE DESCARGA DE PROVEEDORES (IMPORTACIÓN)
 * Descarga los registros de proveedores y sus políticas de canje.
 */
export const importProvidersFromCloud = async (): Promise<number> => {
 try {
 const config = getSettings().appSheetConfig;
 const tableName = config?.providersTableName || "PROVEEDORES";
 
 const response = await cloudApi.fetchTable(tableName);
 const rawRows = response.rows || [];
 
 if (rawRows.length === 0) return 0;

 const providers: Provider[] = rawRows
 .map((row: any) => {
 const rut = String(row['ID_RUT'] || row['RUT'] || '');
 const name = String(row['NOMBRE PROVEEDOR'] || row['PROVEEDOR'] || '');
 const policy = String(row['CANJE SÓLO POR VENCIMIENTO (DÍAS)'] || row['POLITICA'] || '');
 const withdrawalRaw = String(row['RETIRO (DÍAS)'] || row['DIAS_RETIRO'] || '0');
 
 let withdrawalDays = 0;
 if (withdrawalRaw.toUpperCase() === 'AL VENCE') {
 withdrawalDays = 0;
 } else {
 withdrawalDays = parseInt(withdrawalRaw, 10) || 0;
 }

 return {
 rut,
 name,
 exchangePolicy: policy,
 withdrawalDays
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
