
import { logger } from './logger';
import { getSettings } from './settings';

/**
 * MOTOR DE COMUNICACIÓN CON TU SCRIPT GAS (v4.0 COMPATIBLE)
 */
export const callGas = async (action: string, payload: any): Promise<any> => {
    const url = getSettings().appSheetConfig?.gasWebAppUrl;
    if (!url) {
        return { success: false, error: "Cloud URL no configurada en Ajustes" };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload })
        });
        
        const rawText = await response.text();
        try {
            return JSON.parse(rawText);
        } catch (e) {
            console.error("GAS Text Response:", rawText);
            return { success: false, error: "La respuesta del servidor no es JSON válido." };
        }
    } catch (error: any) {
        logger.error('GAS_ENGINE', `Error [${action}]: ${error.message}`);
        return { success: false, error: error.message };
    }
};

/**
 * Recupera todas las filas de una tabla
 */
export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName, filters });
    return res.success ? res.rows : [];
};

/**
 * Busca un producto en el Maestro
 */
export const cloudLookupSku = async (barcode: string): Promise<any> => {
    return await callGas('lookup_sku', { barcode });
};

/**
 * Inserta filas
 */
export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    return await callGas('append_rows', payload);
};

/**
 * Mantenimiento
 */
export const runCloudMaintenance = async (): Promise<any> => {
    return await callGas('vacuum_database', {});
};
