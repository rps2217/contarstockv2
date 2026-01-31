
import { logger } from './logger';
import { getSettings } from './settings';
import { compressData } from './utils';
import { AppSheetConfig } from '../types';
import Papa from 'papaparse';

/**
 * Descarga la configuración inicial usando solo el ID del Excel.
 * No requiere GAS_URL previa.
 */
export const bootstrapConfigById = async (spreadsheetId: string): Promise<AppSheetConfig> => {
    // Limpiamos el ID por si pegan la URL completa
    const idMatch = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = idMatch ? idMatch[1] : spreadsheetId.trim();

    if (!cleanId || cleanId.length < 10) throw new Error("ID de Excel no válido");

    // Usamos el motor de consulta de Google (no requiere API Key si el doc es público/lector)
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
                    // Normalizamos keys (Google exporta a veces con espacios o mayúsculas raras)
                    const findVal = (keys: string[]) => {
                        const foundKey = Object.keys(master).find(k => keys.includes(k.trim().toUpperCase()));
                        return foundKey ? String(master[foundKey]).trim() : '';
                    };

                    const config: AppSheetConfig = {
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
                error: (err) => reject(err)
            });
        });
    } catch (err: any) {
        logger.error('BOOTSTRAP_FAIL', err.message);
        throw err;
    }
};

export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;

    if (!url) throw new Error("Cloud URL no configurada");

    try {
        let finalPayload = { 
            action, 
            ...payload,
            metadata: { timestamp: Date.now(), compressed: compress }
        };

        if (compress && payload.rows) {
            finalPayload.rows = await compressData(payload.rows);
        }

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(finalPayload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: El servidor no respondió.`);
        }

        const text = await response.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            throw new Error("Respuesta no válida del servidor (posible error de script).");
        }

        if (json.success === false) {
            alert(`❌ Error del Servidor Cloud:\n${json.error}`);
            throw new Error(json.error);
        }
        
        return json;
    } catch (error: any) {
        logger.error('GAS_SERVICE', `Fallo [${action}]: ${error.message}`);
        throw error;
    }
};

export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    return await callGas('append_rows', payload, payload.rows.length > 5);
};

export const fetchFromGas = async (tableName: string): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName });
    if (!res.success) throw new Error(res.error);
    return res.rows || [];
};

export const fetchSystemConfig = async (): Promise<AppSheetConfig> => {
    const rows = await fetchFromGas('CONFIG_SISTEMA');
    if (!rows || rows.length === 0) throw new Error("CONFIG_SISTEMA está vacía.");

    const master = rows[0]; 
    return {
        appId: String(master.APP_ID || ''),
        accessKey: String(master.ACCESS_KEY || ''),
        countsTableName: String(master.TABLE_LOGS || 'CONTEOS'),
        consolidatedTableName: String(master.TABLE_CONSOLIDADO || 'CONSOLIDADO'),
        productsTableName: String(master.TABLE_PRODUCTOS || 'PRODUCTOS'),
        receptionTableName: String(master.TABLE_RECEPCION || 'RECEPCION_BULTOS'),
        gasWebAppUrl: getSettings().appSheetConfig?.gasWebAppUrl || ''
    };
};
