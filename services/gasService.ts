
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...payload }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const rawText = await response.text();
        return JSON.parse(rawText);
    } catch (error: any) {
        clearTimeout(timeoutId);
        const errorMsg = error.name === 'AbortError' ? 'Tiempo de espera agotado' : error.message;
        logger.error('GAS_ENGINE', `Error en acción [${action}]: ${errorMsg}`);
        return { success: false, error: errorMsg };
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
