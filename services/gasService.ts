
import { logger } from './logger';
import { getSettings } from './settings';
import { Product } from '../types';

/**
 * MOTOR CORE LOGICOUNT (GAS)
 * Centraliza toda la comunicación con el Excel de Google.
 */
export const callGas = async (action: string, payload: any): Promise<any> => {
    const url = getSettings().appSheetConfig?.gasWebAppUrl;
    if (!url) {
        return { success: false, error: "Cloud URL no configurada en Ajustes > Nube" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s para ráfagas grandes

    try {
        // GAS requiere que sea POST y el cuerpo sea un string plano si hay problemas de CORS
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload }),
            // No enviamos headers complejos para evitar pre-flight de CORS en GAS
        });
        
        clearTimeout(timeoutId);
        
        const rawText = await response.text();
        try {
            return JSON.parse(rawText);
        } catch (e) {
            console.error("GAS Response not JSON:", rawText);
            return { success: false, error: "La respuesta del servidor no es válida." };
        }
    } catch (error: any) {
        clearTimeout(timeoutId);
        const errorMsg = error.name === 'AbortError' ? 'Tiempo de espera agotado (45s)' : error.message;
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
 * CLOUD FETCH: Recupera filas existentes para descarga de catálogo.
 */
export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName, filters });
    return res.success ? res.rows : [];
};
