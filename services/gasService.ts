import { logger } from './logger';
import { getSettings } from './settings';
import { AppSheetConfig } from '../types';
import Papa from 'papaparse';
import { cloudApi } from './cloud/apiClient';

const superNormalize = (s: string) => 
    String(s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * CONFIGURACIÓN AUTOMÁTICA POR URL
 */
export const bootstrapByUrl = async (url: string, manualId?: string): Promise<AppSheetConfig> => {
    if (!url.startsWith('https://script.google.com')) {
        throw new Error("La URL debe comenzar con https://script.google.com...");
    }
    
    try {
        // Si el usuario provee un ID manual (desde el input), lo usamos para la primera petición
        const payload: any = { action: 'fetch_rows', tableName: 'CONFIG_SISTEMA' };
        if (manualId) payload.spreadsheetId = manualId;

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

        // Si no enviamos manualId, intentamos obtener el ID real que el script detectó (si es vinculado)
        const finalId = manualId || res.spreadsheet_id || findVal(['SPREADSHEET_ID', 'ID_EXCEL', 'ID']);

        const config: AppSheetConfig = {
            gasWebAppUrl: url,
            spreadsheetId: finalId,
            appId: findVal(['APP_ID', 'APPLICATION_ID', 'APPID']),
            accessKey: findVal(['ACCESS_KEY', 'KEY', 'ACCESSKEY']),
            countsTableName: findVal(['TABLE_LOGS', 'TABLA_CONTEOS', 'CONTEOS']) || 'CONTEOS',
            consolidatedTableName: findVal(['TABLE_CONSOLIDADO', 'CONSOLIDADO']) || 'CONSOLIDADO',
            productsTableName: findVal(['TABLE_PRODUCTOS', 'PRODUCTOS']) || 'PRODUCTOS',
            receptionTableName: findVal(['TABLE_RECEPCION', 'RECEPCION']) || 'RECEPCION_BULTOS',
            ordersTableName: findVal(['TABLE_PEDIDOS', 'PEDIDOS']) || 'PEDIDOS'
        };

        return config;
    } catch (err: any) {
        logger.error('BOOTSTRAP_FAIL', err.message);
        throw err;
    }
};

/**
 * CONFIGURACIÓN POR ID DE SPREADSHEET (CSV EXPORT)
 * Fix: Added missing export bootstrapConfigById to resolve import error in useCloudConfig.ts
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
                        productsTableName: findVal(['TABLE_PRODUCTOS', 'PRODUCTOS']) || 'PRODUCTOS',
                        receptionTableName: findVal(['TABLE_RECEPCION', 'RECEPCION']) || 'RECEPCION_BULTOS',
                        gasWebAppUrl: findVal(['GAS_URL', 'URL_GAS', 'SCRIPT_URL'])
                    };

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

export const fetchSystemConfig = async (): Promise<Partial<AppSheetConfig>> => {
    try {
        const res = await cloudApi.post('fetch_rows', { tableName: 'CONFIG_SISTEMA' });
        if (!res.success || !res.rows || res.rows.length === 0) return {};

        const master = res.rows[0];
        const findVal = (keys: string[]) => {
            const foundKey = Object.keys(master).find(k => keys.includes(k.trim().toUpperCase()));
            return foundKey ? String(master[foundKey]).trim() : '';
        };

        return {
            appId: findVal(['APP_ID', 'APPID', 'APPLICATION_ID']),
            accessKey: findVal(['ACCESS_KEY', 'ACCESSKEY', 'KEY']),
            countsTableName: findVal(['TABLE_LOGS', 'TABLA_CONTEOS', 'CONTEOS']),
            consolidatedTableName: findVal(['TABLE_CONSOLIDADO', 'CONSOLIDADO']),
            productsTableName: findVal(['TABLE_PRODUCTOS', 'PRODUCTOS']),
            receptionTableName: findVal(['TABLE_RECEPCION', 'RECEPCION'])
        };
    } catch (e) { return {}; }
};

/**
 * Fix: Added missing export callGas to resolve import error in appsheet.ts and useCloudConfig.ts
 */
export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    return cloudApi.post(action, payload, compress);
};

/**
 * Fix: Added missing export fetchFromGas to resolve import error in massiveSync.ts
 */
export const fetchFromGas = async (tableName: string): Promise<any[]> => {
    const res = await cloudApi.fetchTable(tableName);
    return res.rows || [];
};
