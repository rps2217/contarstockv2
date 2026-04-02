
import { logger } from './logger';
import { getSettings } from './settings';
import { AppSheetConfig, SpreadsheetMetadata } from '../types';
import Papa from 'papaparse';
import { firebaseSyncService } from './firebaseSyncService';

const superNormalize = (s: string) => 
 String(s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Extrae el ID puro de una cadena que puede ser una URL o un ID con espacios.
 */
const cleanSpreadsheetId = (input: string): string => {
 if (!input) return "";
 const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
 return match ? match[1] : input.trim();
};

/**
 * CONFIGURACIÓN AUTOMÁTICA POR URL (GAS Fallback)
 */
export const bootstrapByUrl = async (url: string, manualId?: string): Promise<AppSheetConfig> => {
 if (!url.startsWith('https://script.google.com')) {
 throw new Error("La URL debe comenzar con https://script.google.com...");
 }
 
 try {
 const payload: any = { action: 'fetch_rows', tableName: 'CONFIG_SISTEMA' };
 if (manualId) {
 payload.spreadsheetId = cleanSpreadsheetId(manualId);
 }

 const response = await fetch(url, {
 method: 'POST',
 body: JSON.stringify(payload),
 headers: { 'Content-Type': 'text/plain;charset=utf-8' }
 });

 const res = await response.json();
 
 if (!res.success) {
 if (res.error?.includes("IDENTIDAD_EXCEL_NO_DETECTADA")) {
 throw new Error("EXCEL_ID_REQUIRED");
 }
 if (res.error?.includes("AUTORIZACION_REQUERIDA")) {
 throw new Error("Debe autorizar el script manualmente: Abra el editor de GAS y ejecute la función 'TRIGGER_PERMISSIONS' una vez.");
 }
 throw new Error(res.error || "Fallo en servidor GAS");
 }

 if (!res.rows || res.rows.length === 0) {
 throw new Error("No se detectó la pestaña 'CONFIG_SISTEMA' o está vacía.");
 }

 const master = res.rows[0];
 const masterKeys = Object.keys(master);

 const findVal = (searchKeys: string[]) => {
 const normalizedSearch = searchKeys.map(superNormalize);
 const foundKey = masterKeys.find(k => normalizedSearch.includes(superNormalize(k)));
 return foundKey ? String(master[foundKey]).trim() : '';
 };

 const finalId = manualId ? cleanSpreadsheetId(manualId) : (res.spreadsheet_id || findVal(['SPREADSHEET_ID', 'ID_EXCEL', 'ID']));

 const config: AppSheetConfig = {
 gasWebAppUrl: url,
 spreadsheetId: finalId,
 appId: findVal(['APP_ID', 'APPLICATION_ID', 'APPID']),
 accessKey: findVal(['ACCESS_KEY', 'KEY', 'ACCESSKEY']),
 countsTableName: findVal(['TABLE_LOGS', 'TABLA_CONTEOS', 'CONTEOS']) || 'CONTEOS',
 consolidatedTableName: findVal(['TABLE_CONSOLIDADO', 'CONSOLIDADO']) || 'CONSOLIDADO',
 inventoryRegistryTableName: findVal(['TABLE_REGISTRO_INV', 'REGISTRO_INV']) || 'REGISTRO_INV',
 productsTableName: findVal(['TABLE_PRODUCTOS', 'PRODUCTOS']) || 'PRODUCTOS',
 receptionTableName: findVal(['TABLE_RECEPCION', 'RECEPCION']) || 'RECEPCION_BULTOS',
 ordersTableName: findVal(['TABLE_PEDIDOS', 'PEDIDOS']) || 'PEDIDOS',
 eventsTableName: findVal(['TABLE_EVENTOS', 'EVENTOS']) || 'EVENTOS'
 };

 const mappingsJson = findVal(['MAPPINGS_JSON', 'MAPPINGS']);
 if (mappingsJson) {
   try {
     config.mappings = JSON.parse(mappingsJson);
   } catch (e) {
     logger.warn('MAPPINGS_PARSE_FAIL', 'Could not parse MAPPINGS_JSON from cloud');
   }
 }

 const schemaJson = findVal(['SCHEMA_JSON', 'SCHEMA']);
 if (schemaJson) {
   try {
     config.schema = JSON.parse(schemaJson);
   } catch (e) {
     logger.warn('SCHEMA_PARSE_FAIL', 'Could not parse SCHEMA_JSON from cloud');
   }
 }

 return config;
 } catch (err: any) {
 logger.error('BOOTSTRAP_FAIL', err.message);
 throw err;
 }
};

/**
 * BOOTSTRAP POR ID (Vía CSV Público)
 */
export const bootstrapConfigById = async (spreadsheetId: string): Promise<AppSheetConfig> => {
 const idMatch = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
 const cleanId = idMatch ? idMatch[1] : spreadsheetId.trim();

 if (!cleanId || cleanId.length < 10) throw new Error("ID de Excel no válido");

 const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=CONFIG_SISTEMA`;

 try {
 const response = await fetch(url);
 if (!response.ok) throw new Error("No se pudo acceder al Excel. Verifique que 'Cualquier persona con el enlace' pueda leer.");
  
 const csvText = await response.text();
  
 return new Promise((resolve, reject) => {
 Papa.parse(csvText, {
 header: true,
 skipEmptyLines: true,
 complete: (results) => {
 if (results.data.length === 0) return reject(new Error("La pestaña CONFIG_SISTEMA está vacía."));
  
 const master: any = results.data[0];
 const findVal = (keys: string[]) => {
 const foundKey = Object.keys(master).find(k => keys.includes(k.trim().toUpperCase()));
 return foundKey ? String(master[foundKey]).trim() : '';
 };

 const config: AppSheetConfig = {
 spreadsheetId: cleanId,
 appId: findVal(['APP_ID', 'APPID', 'APPLICATION_ID']),
 accessKey: findVal(['ACCESS_KEY', 'ACCESSKEY', 'KEY']),
 countsTableName: findVal(['TABLE_LOGS', 'TABLA_CONTEOS', 'CONTEOS']) || 'CONTEOS',
 consolidatedTableName: findVal(['TABLE_CONSOLIDADO', 'TABLA_RESUMEN', 'CONSOLIDADO']) || 'CONSOLIDADO',
 inventoryRegistryTableName: findVal(['TABLE_REGISTRO_INV', 'REGISTRO_INV']) || 'REGISTRO_INV',
 productsTableName: findVal(['TABLE_PRODUCTOS', 'PRODUCTOS']) || 'PRODUCTOS',
 receptionTableName: findVal(['TABLE_RECEPCION', 'RECEPCION']) || 'RECEPCION_BULTOS',
 gasWebAppUrl: findVal(['GAS_URL', 'URL_GAS', 'SCRIPT_URL']),
 ordersTableName: findVal(['TABLE_PEDIDOS', 'PEDIDOS']) || 'PEDIDOS',
 eventsTableName: findVal(['TABLE_EVENTOS', 'EVENTOS']) || 'EVENTOS'
 };

 const mappingsJson = findVal(['MAPPINGS_JSON', 'MAPPINGS']);
 if (mappingsJson) {
   try {
     config.mappings = JSON.parse(mappingsJson);
   } catch (e) {
     logger.warn('MAPPINGS_PARSE_FAIL', 'Could not parse MAPPINGS_JSON from cloud');
   }
 }

 const schemaJson = findVal(['SCHEMA_JSON', 'SCHEMA']);
 if (schemaJson) {
   try {
     config.schema = JSON.parse(schemaJson);
   } catch (e) {
     logger.warn('SCHEMA_PARSE_FAIL', 'Could not parse SCHEMA_JSON from cloud');
   }
 }

 if (!config.gasWebAppUrl) return reject(new Error("No se encontró la URL de Google Script en el Excel."));
  
 resolve(config);
 },
 error: (err: any) => reject(err)
 });
 });
 } catch (err: any) {
 logger.error('BOOTSTRAP_FAIL', err.message);
 throw err;
 }
};

/**
 * Actualiza la configuración del sistema desde la nube de forma silenciosa
 */
export const fetchSystemConfig = async (): Promise<Partial<AppSheetConfig>> => {
 try {
 const settings = getSettings();
 if (!settings.appSheetConfig?.gasWebAppUrl) return {};

 const res = await bootstrapByUrl(settings.appSheetConfig.gasWebAppUrl, settings.appSheetConfig.spreadsheetId);
 return res;
 } catch (e) { return {}; }
};

/**
 * GUARDA LA CONFIGURACIÓN EN FIRESTORE
 */
export const saveConfigToCloud = async (config: AppSheetConfig): Promise<boolean> => {
  try {
    const payload = {
      id: 'MASTER_CONFIG',
      ...config,
      LAST_SYNC: new Date().toISOString()
    };

    const res = await firebaseSyncService.pushBatch('CONFIG_SISTEMA', [payload]);
    return res.success === true;
  } catch (err: any) {
    logger.error('SAVE_CONFIG_CLOUD_FAIL', err.message);
    return false;
  }
};

/**
 * RECUPERA METADATOS DEL SPREADSHEET (Hojas y Cabeceras) - Mantener para compatibilidad si se usa GAS
 */
export const fetchSpreadsheetMetadata = async (spreadsheetId?: string): Promise<SpreadsheetMetadata> => {
  const settings = getSettings();
  const url = settings.appSheetConfig?.gasWebAppUrl;
  if (!url) throw new Error("URL de GAS no configurada");

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'get_metadata', 
        spreadsheetId: spreadsheetId || settings.appSheetConfig?.spreadsheetId 
      }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    const res = await response.json();
    if (!res.success) throw new Error(res.error || "Error al obtener metadatos");
    
    return res.metadata as SpreadsheetMetadata;
  } catch (err: any) {
    logger.error('FETCH_METADATA_FAIL', err.message);
    throw err;
  }
};
