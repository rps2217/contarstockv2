
import { logger } from './logger';
import { getSettings } from './settings';

/**
 * MOTOR DE COMUNICACIÓN CLOUD v9.0 (Transparent Mode)
 * Se comunica con el Google Apps Script configurado.
 * Elimina 'no-cors' para garantizar la integridad de la respuesta.
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
        // CRÍTICO: Usamos CORS estándar. 
        // El script de Google debe devolver los encabezados CORS correctos.
        // Content-Type text/plain evita el preflight OPTIONS estricto de algunos navegadores.
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        
        try {
            const json = JSON.parse(text);
            // Validar que el script de Google confirmó éxito lógico
            if (json.success === false) {
                throw new Error(json.error || "Error lógico en Google Script");
            }
            return json;
        } catch (e) {
            console.warn("Respuesta no-JSON recibida:", text);
            // Si devuelve HTML (página de error de Google), lanzamos error
            if (text.includes("<!DOCTYPE html>")) {
                throw new Error("El Script de Google devolvió una página de error HTML. Verifique los logs del Script.");
            }
            return { success: true, warning: "Respuesta cruda recibida" };
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
