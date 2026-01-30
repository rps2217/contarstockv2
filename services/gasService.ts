import { logger } from './logger';
import { getSettings } from './settings';
import { compressData } from './utils';

/**
 * MOTOR DE COMUNICACIÓN CLOUD v10.0 (Enterprise Turbo)
 * Implementa seguridad, compresión y logs de servidor.
 */
export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;

    if (!url) {
        return { success: false, error: "Cloud URL no configurada" };
    }

    try {
        let finalPayload = { 
            action, 
            ...payload,
            metadata: {
                timestamp: Date.now(),
                version: "3.1.0-Turbo",
                compressed: compress
            }
        };

        // Si se requiere compresión, envolvemos los datos en un ZIP
        if (compress && payload.rows) {
            const compressedRows = await compressData(payload.rows);
            finalPayload.rows = compressedRows;
        }

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(finalPayload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        const json = JSON.parse(text);

        if (json.success === false) {
            throw new Error(json.error || "Error lógico en el servidor");
        }

        return json;

    } catch (error: any) {
        console.error("❌ CLOUD_CRASH:", error.message);
        logger.error('GAS_SERVICE', `Fallo en acción [${action}]: ${error.message}`);
        return { success: false, error: error.message };
    }
};

export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    // Activamos compresión para envíos masivos (>10 filas)
    const shouldCompress = payload.rows.length > 10;
    return await callGas('append_rows', payload, shouldCompress);
};

export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName, filters });
    return res.success ? res.rows : [];
};