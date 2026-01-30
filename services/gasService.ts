import { logger } from './logger';
import { getSettings } from './settings';
import { compressData } from './utils';

/**
 * MOTOR DE COMUNICACIÓN CLOUD v10.1 (Enterprise Turbo)
 */
export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;

    if (!url) {
        throw new Error("Cloud URL no configurada en Ajustes > Nube");
    }

    try {
        let finalPayload = { 
            action, 
            ...payload,
            metadata: {
                timestamp: Date.now(),
                version: "3.1.1-Turbo",
                compressed: compress
            }
        };

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

        // SI EL SERVIDOR DEVUELVE ERROR, LANZAMOS EXCEPCIÓN REAL
        if (json.success === false) {
            throw new Error(json.error || "Error desconocido en el servidor Google");
        }

        return json;

    } catch (error: any) {
        console.error("❌ CLOUD_CRASH:", error.message);
        logger.error('GAS_SERVICE', `Fallo [${action}]: ${error.message}`);
        // Lanzamos el error para que la UI lo capture y lo muestre
        throw error;
    }
};

export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    const shouldCompress = payload.rows.length > 10;
    return await callGas('append_rows', payload, shouldCompress);
};

export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName, filters });
    return res.rows || [];
};