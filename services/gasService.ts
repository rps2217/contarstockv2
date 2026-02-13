
import { logger } from './logger';
import { getSettings } from './settings';
import { AppSheetConfig } from '../types';
import Papa from 'papaparse';
import { cloudApi } from './cloud/apiClient';

/**
 * Normalización industrial de cabeceras.
 * Convierte "GAS_URL", "Gas Web App URL" o "gas-url" en "GASURL".
 */
const superNormalize = (s: string) => 
    String(s || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
        .replace(/[^A-Z0-9]/g, "");    // Eliminar TODO lo que no sea letra o número

/**
 * Descarga la configuración inicial usando el ID del Excel.
 * Optimizado para ser inmune a variaciones de formato en el Excel.
 */
export const bootstrapConfigById = async (spreadsheetId: string): Promise<AppSheetConfig> => {
    const idMatch = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const cleanId = idMatch ? idMatch[1] : spreadsheetId.trim();

    if (!cleanId || cleanId.length < 10) throw new Error("ID de Excel no válido");

    // Endpoint de exportación directa: más robusto para leer cabeceras que gviz
    const url = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv&sheet=CONFIG_SISTEMA`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Google denegó el acceso. Verifique que el Excel sea PÚBLICO (Cualquier persona con el enlace - Lector).`);
        }
        
        const csvText = await response.text();
        
        // Detección de redirección por privacidad (Excel no compartido)
        if (csvText.includes("<!DOCTYPE html>") || csvText.includes("google-signin")) {
            throw new Error("ACCESO DENEGADO: El Excel es PRIVADO. Cámbielo a 'Cualquier persona con el enlace' o use el método de Vínculo Privado (URL del Script).");
        }

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length === 0) return reject(new Error("La pestaña CONFIG_SISTEMA está vacía."));
                    
                    const master: any = results.data[0];
                    const masterKeys = Object.keys(master);

                    // Función de búsqueda ultra-flexible
                    const findVal = (searchKeys: string[]) => {
                        const normalizedSearch = searchKeys.map(superNormalize);
                        const foundKey = masterKeys.find(k => normalizedSearch.includes(superNormalize(k)));
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
                        gasWebAppUrl: findVal(['GAS_URL', 'URL_GAS', 'SCRIPT_URL', 'URL_SCRIPT'])
                    };

                    if (!config.gasWebAppUrl) {
                        console.error("Cabeceras detectadas:", masterKeys);
                        return reject(new Error("No se encontró la columna 'GAS_URL'. Revise que el nombre en el Excel coincida exactamente."));
                    }
                    
                    resolve(config);
                },
                error: (err) => reject(new Error("Fallo al procesar el archivo: " + err))
            });
        });
    } catch (err: any) {
        if (err.message === "Failed to fetch") {
            throw new Error("ERROR DE RED: Google bloqueó la conexión. Verifique los permisos de compartir del Excel.");
        }
        logger.error('BOOTSTRAP_FAIL', err.message);
        throw err;
    }
};

export const fetchSystemConfig = async (): Promise<Partial<AppSheetConfig>> => {
    const config = getSettings().appSheetConfig;
    if (!config?.gasWebAppUrl) return {};

    try {
        const res = await cloudApi.post('fetch_rows', { tableName: 'CONFIG_SISTEMA' });
        if (!res.success || !res.rows || res.rows.length === 0) return {};

        const master = res.rows[0];
        const masterKeys = Object.keys(master);
        
        const findVal = (searchKeys: string[]) => {
            const normalizedSearch = searchKeys.map(superNormalize);
            const foundKey = masterKeys.find(k => normalizedSearch.includes(superNormalize(k)));
            return foundKey ? String(master[foundKey]).trim() : '';
        };

        return {
            appId: findVal(['APP_ID', 'APPID', 'APPLICATION_ID']),
            accessKey: findVal(['ACCESS_KEY', 'ACCESSKEY', 'KEY']),
            countsTableName: findVal(['TABLE_LOGS', 'TABLA_CONTEOS', 'CONTEOS']),
            consolidatedTableName: findVal(['TABLE_CONSOLIDADO', 'TABLA_RESUMEN', 'CONSOLIDADO']),
            productsTableName: findVal(['TABLE_PRODUCTOS', 'PRODUCTOS']),
            receptionTableName: findVal(['TABLE_RECEPCION', 'RECEPCION'])
        };
    } catch (e) {
        return {};
    }
};

export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    return cloudApi.post(action, payload, compress);
};

export const fetchFromGas = async (tableName: string): Promise<any[]> => {
    const res = await cloudApi.fetchTable(tableName);
    return res.rows || [];
};
