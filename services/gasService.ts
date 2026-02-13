
import { logger } from './logger';
import { getSettings } from './settings';
import { AppSheetConfig } from '../types';
import Papa from 'papaparse';
import { cloudApi } from './cloud/apiClient';

/**
 * Descarga la configuración inicial usando el ID del Excel.
 */
export const bootstrapConfigById = async (spreadsheetId: string): Promise<AppSheetConfig> => {
    const idMatch = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = idMatch ? idMatch[1] : spreadsheetId.trim();

    if (!cleanId || cleanId.length < 10) throw new Error("ID de Excel no válido");

    // Intentamos con el endpoint de exportación directa
    const url = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv&sheet=CONFIG_SISTEMA`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Google denegó el acceso. El Excel debe ser PÚBLICO para este método. Si desea mantenerlo PRIVADO, pegue la URL del Script directamente en la sección segura.`);
        }
        
        const csvText = await response.text();
        
        // Si el texto devuelto es HTML, es porque Google redirigió al login (Excel Privado)
        if (csvText.includes("<!DOCTYPE html>") || csvText.includes("google-signin")) {
            throw new Error("ACCESO DENEGADO: El Excel es PRIVADO. Para este método de vínculo rápido, cámbielo a 'Cualquier persona con el enlace' o use el método por URL del Script.");
        }

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length === 0) return reject(new Error("La pestaña CONFIG_SISTEMA está vacía."));
                    
                    const master: any = results.data[0];
                    const findVal = (keys: string[]) => {
                        const foundKey = Object.keys(master).find(k => keys.includes(k.trim().toUpperCase().replace(/\s/g, "")));
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

                    if (!config.gasWebAppUrl) return reject(new Error("No se encontró la celda 'GAS_URL' en el Excel."));
                    
                    resolve(config);
                },
                error: (err) => reject(new Error("Fallo al procesar CSV: " + err))
            });
        });
    } catch (err: any) {
        if (err.message === "Failed to fetch") {
            throw new Error("ERROR DE RED: Google bloqueó la petición por privacidad. Comparta el Excel públicamente (Lector) o use el Vínculo Privado por URL.");
        }
        logger.error('BOOTSTRAP_FAIL', err.message);
        throw err;
    }
};

export const fetchSystemConfig = async (): Promise<Partial<AppSheetConfig>> => {
    const config = getSettings().appSheetConfig;
    if (!config?.gasWebAppUrl) throw new Error("GAS URL no configurada");

    const res = await cloudApi.post('fetch_rows', { tableName: 'CONFIG_SISTEMA' });
    if (!res.success || !res.rows || res.rows.length === 0) throw new Error("No se pudo obtener CONFIG_SISTEMA");

    const master = res.rows[0];
    const findVal = (keys: string[]) => {
        const foundKey = Object.keys(master).find(k => keys.includes(k.trim().toUpperCase().replace(/\s/g, "")));
        return foundKey ? String(master[foundKey]).trim() : '';
    };

    return {
        appId: findVal(['APP_ID', 'APPID', 'APPLICATION_ID']),
        accessKey: findVal(['ACCESS_KEY', 'ACCESSKEY', 'KEY']),
        countsTableName: findVal(['TABLE_LOGS', 'TABLA_CONTEOS', 'CONTEOS']) || 'CONTEOS',
        consolidatedTableName: findVal(['TABLE_CONSOLIDADO', 'TABLA_RESUMEN', 'CONSOLIDADO']) || 'CONSOLIDADO',
        productsTableName: findVal(['TABLE_PRODUCTOS', 'PRODUCTOS']) || 'PRODUCTOS',
        receptionTableName: findVal(['TABLE_RECEPCION', 'RECEPCION']) || 'RECEPCION_BULTOS'
    };
};

export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    return cloudApi.post(action, payload, compress);
};

export const fetchFromGas = async (tableName: string): Promise<any[]> => {
    const res = await cloudApi.fetchTable(tableName);
    return res.rows || [];
};
