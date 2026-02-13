
import { logger } from './logger';
import { getSettings } from './settings';
import { AppSheetConfig } from '../types';
import Papa from 'papaparse';
import { cloudApi } from './cloud/apiClient';

/**
 * Descarga la configuración inicial usando el ID del Excel.
 * Optimizado para evitar errores de CORS y permisos.
 */
export const bootstrapConfigById = async (spreadsheetId: string): Promise<AppSheetConfig> => {
    const idMatch = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = idMatch ? idMatch[1] : spreadsheetId.trim();

    if (!cleanId || cleanId.length < 10) throw new Error("ID de Excel no válido");

    // Intentamos con el endpoint de exportación directa que es más permisivo que gviz
    const url = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv&sheet=CONFIG_SISTEMA`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("No se encontró la pestaña 'CONFIG_SISTEMA'. Verifique el nombre en su Excel.");
            }
            throw new Error(`Error Google (${response.status}). Verifique que el Excel sea PÚBLICO (Cualquier persona con el enlace).`);
        }
        
        const csvText = await response.text();
        
        // Si el texto devuelto es HTML, es porque Google redirigió al login (Excel Privado)
        if (csvText.includes("<!DOCTYPE html>") || csvText.includes("google-signin")) {
            throw new Error("ACCESO DENEGADO: El Excel es PRIVADO. Cámbielo a 'Cualquier persona con el enlace'.");
        }

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

                    if (!config.gasWebAppUrl) return reject(new Error("No se encontró la celda 'GAS_URL' en el Excel."));
                    
                    resolve(config);
                },
                error: (err) => reject(new Error("Fallo al procesar CSV: " + err))
            });
        });
    } catch (err: any) {
        // Captura del error genérico 'Failed to fetch' para dar contexto al usuario
        if (err.message === "Failed to fetch") {
            throw new Error("ERROR DE RED: No hay conexión o Google Sheets bloqueó la petición (verifique permisos de compartir).");
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
        const foundKey = Object.keys(master).find(k => keys.includes(k.trim().toUpperCase()));
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
