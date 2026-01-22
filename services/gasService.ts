
import { logger } from './logger';
import { getSettings } from './settings';

/**
 * MOTOR DE COMUNICACIÓN CON TU SCRIPT GAS
 * Ajustado para evitar bloqueos de CORS y permitir lectura de errores.
 */
export const callGas = async (action: string, payload: any): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;
    
    if (!url) {
        const error = "URL de Google Script no configurada.";
        return { success: false, error };
    }

    try {
        // IMPORTANTE: No usamos 'no-cors' para fetch_rows porque necesitamos leer el JSON.
        // Si el script de Google está bien publicado como "Cualquier persona", CORS no será un problema.
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            },
            body: JSON.stringify({ action, ...payload })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const rawText = await response.text();
        try {
            return JSON.parse(rawText);
        } catch (e) {
            console.error("[GAS_ENGINE] Response not JSON:", rawText);
            throw new Error("El servidor no devolvió un formato válido.");
        }

    } catch (error: any) {
        logger.error('GAS_ENGINE', `Error [${action}]: ${error.message}`);
        return { success: false, error: error.message };
    }
};

export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName, filters });
    if (res && res.success) {
        return res.rows || [];
    }
    throw new Error(res?.error || "Error al conectar con la nube");
};

export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    return await callGas('append_rows', payload);
};
