
import { logger } from './logger';
import { getSettings } from './settings';

/**
 * MOTOR DE COMUNICACIÓN CLOUD v8.5
 * Se comunica con el Google Apps Script configurado.
 */
export const callGas = async (action: string, payload: any): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;

    if (!url) {
        return { success: false, error: "Cloud URL no configurada" };
    }

    // DEBUG: Ver qué se envía exactamente
    console.log(`[CLOUD_ZAP] Enviando a tabla: ${payload.tableName}`, payload);

    try {
        // Usamos CORS estándar para poder leer la respuesta del servidor
        // Si hay error de CORS, el usuario debe revisar la implementación del script
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // GAS prefiere esto para evitar pre-flight CORS complejos
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        try {
            const json = JSON.parse(text);
            return json;
        } catch (e) {
            // A veces GAS devuelve HTML si falla la ejecución
            return { success: true, warning: "Respuesta no-JSON recibida. Verifique el script." };
        }

    } catch (error: any) {
        console.error("❌ CLOUD_CRASH:", error.message);
        logger.error('GAS_SERVICE', `Error en [${payload.tableName}]: ${error.message}`);
        return { success: false, error: error.message };
    }
};

export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    return await callGas('append_rows', payload);
};

export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    const url = getSettings().appSheetConfig?.gasWebAppUrl;
    if (!url) return [];
    try {
        const res = await fetch(url, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'fetch_rows', tableName, filters }) 
        });
        const json = await res.json();
        return json.success ? json.rows : [];
    } catch (e) {
        return [];
    }
};
