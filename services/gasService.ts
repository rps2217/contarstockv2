
import { logger } from './logger';
import { AppSheetConfig } from '../types';
// Added missing imports for the new functions
import { getSettings } from './settings';
import { cloudApi } from './cloud/apiClient';
import Papa from 'papaparse';

const superNormalize = (s: string) => 
    String(s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * CONFIGURACIÓN AUTOMÁTICA POR URL
 * Realiza un handshake con el script para descargar la metadata del sistema.
 */
export const bootstrapByUrl = async (url: string, manualId?: string): Promise<AppSheetConfig> => {
    if (!url.startsWith('https://script.google.com')) {
        throw new Error("La URL debe comenzar con https://script.google.com...");
    }
    
    try {
        const payload: any = { action: 'fetch_rows', tableName: 'CONFIG_SISTEMA' };
        if (manualId) payload.spreadsheetId = manualId;

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        const res = await response.json();
        
        if (!res.success) {
            // Error específico que indica que el script GAS no sabe a qué Excel conectar
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

// Added missing bootstrapConfigById to resolve Error in hooks/useCloudConfig.ts
/**
 * CONFIGURACIÓN MAESTRA POR ID
 */
export const bootstrapConfigById = async (spreadsheetId: string): Promise<AppSheetConfig> => {
    const idMatch = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = idMatch ? idMatch[1] : spreadsheetId.trim();

    if (!cleanId || cleanId.length < 10) throw new Error("ID de Excel no válido");

    const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=CONFIG_SISTEMA`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("No se pudo acceder al Excel. Verifique permisos.");
        
        const csvText = await response.text();
        
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length === 0) return reject(new Error("Pestaña vacía."));
                    
                    const master: any = results.data[0];
                    const findVal = (keys: string[]) => {
                        const foundKey = Object.keys(master).find(k => keys.includes(superNormalize(k)));
                        return foundKey ? String(master[foundKey]).trim() : '';
                    };

                    resolve({
                        spreadsheetId: cleanId,
                        appId: findVal(['APP_ID', 'APPID']),
                        accessKey: findVal(['ACCESS_KEY', 'KEY']),
                        countsTableName: findVal(['CONTEOS']) || 'CONTEOS',
                        consolidatedTableName: findVal(['CONSOLIDADO']) || 'CONSOLIDADO',
                        productsTableName: findVal(['PRODUCTOS']) || 'PRODUCTOS',
                        receptionTableName: findVal(['RECEPCION']) || 'RECEPCION_BULTOS',
                        gasWebAppUrl: findVal(['GAS_URL', 'SCRIPT_URL'])
                    } as AppSheetConfig);
                },
                error: (err) => reject(err)
            });
        });
    } catch (err: any) {
        throw err;
    }
};

/**
 * Actualiza la configuración del sistema desde la nube de forma silenciosa
 */
export const fetchSystemConfig = async (): Promise<Partial<AppSheetConfig>> => {
    try {
        const config = getSettings().appSheetConfig;
        if (!config?.gasWebAppUrl) return {};

        const res = await bootstrapByUrl(config.gasWebAppUrl, config.spreadsheetId);
        return res;
    } catch (e) { return {}; }
};

// Added missing callGas to resolve Error in services/appsheet.ts and hooks/useCloudConfig.ts
/**
 * Llama a una acción genérica en GAS
 */
export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    return cloudApi.post(action, payload, compress);
};

// Added missing fetchFromGas to resolve Error in services/massiveSync.ts
/**
 * Obtiene filas de una tabla
 */
export const fetchFromGas = async (tableName: string): Promise<any[]> => {
    const res = await cloudApi.fetchTable(tableName);
    return res.rows || [];
};
