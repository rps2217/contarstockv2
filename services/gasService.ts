
import { logger } from './logger';
import { getSettings } from './settings';
import { Product } from '../types';

/**
 * MOTOR CORE LOGICOUNT (GAS)
 * Centraliza toda la comunicación con el Excel de Google.
 */
export const callGas = async (action: string, payload: any): Promise<any> => {
    const url = getSettings().appSheetConfig?.gasWebAppUrl;
    if (!url) return { success: false, error: "Cloud URL no configurada en Ajustes" };

    try {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...payload })
        });
        const rawText = await response.text();
        return JSON.parse(rawText);
    } catch (error: any) {
        logger.error('GAS_ENGINE', `Error en acción [${action}]: ${error.message}`);
        return { success: false, error: error.message };
    }
};

/**
 * TURBO-SYNC: Envío masivo de filas en un solo paquete JSON.
 */
export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    return await callGas('append_rows', payload);
};

/**
 * CLOUD DICTIONARY: Busca un SKU en el maestro de la nube.
 * Evita tener que cargar miles de productos en el móvil.
 */
export const lookupSkuHistory = async (barcode: string): Promise<Partial<Product> | null> => {
    const res = await callGas('lookup_sku', { barcode });
    return (res.success && res.product) ? res.product : null;
};

/**
 * CLOUD FETCH: Recupera filas existentes para conciliación o descarga de progreso.
 */
export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName, filters });
    return res.success ? res.rows : [];
};
