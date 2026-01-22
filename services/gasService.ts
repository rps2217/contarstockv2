
import { logger } from './logger';
import { getSettings } from './settings';

/**
 * MOTOR DE COMUNICACIÓN CON TU SCRIPT GAS (v4.0 COMPATIBLE)
 */
export const callGas = async (action: string, payload: any): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;
    
    if (!url) {
        const error = "URL de Google Script no configurada. Ve a Configuración > Nube.";
        console.error("[GAS_ENGINE] Config Missing:", error);
        return { success: false, error };
    }

    try {
        console.log(`[GAS_ENGINE] Dispatching: ${action}`, payload);
        
        const response = await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // Importante para Google Apps Script Web Apps si fallan los pre-flights
            body: JSON.stringify({ action, ...payload })
        });
        
        // El modo 'no-cors' no permite leer el cuerpo de la respuesta por seguridad del navegador.
        // Pero para 'append_rows' (subida) es suficiente.
        // Si es una descarga ('fetch_rows'), intentaremos el modo normal.
        
        if (action === 'fetch_rows' || action === 'lookup_sku') {
            const corsResponse = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({ action, ...payload })
            });
            const rawText = await corsResponse.text();
            return JSON.parse(rawText);
        }

        return { success: true, message: "Petición enviada (modo ráfaga)" };

    } catch (error: any) {
        logger.error('GAS_ENGINE', `Error [${action}]: ${error.message}`);
        return { success: false, error: error.message };
    }
};

/**
 * Recupera todas las filas de una tabla
 */
export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    try {
        const res = await callGas('fetch_rows', { tableName, filters });
        if (res && res.success) {
            return res.rows || [];
        }
        throw new Error(res?.error || "Respuesta inválida del servidor");
    } catch (e: any) {
        console.error("[GAS_FETCH] Failed:", e.message);
        throw e;
    }
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
