import { logger } from './logger';
import { getSettings } from './settings';
import { compressData } from './utils';
import { AppSheetConfig } from '../types';

/**
 * MOTOR DE COMUNICACIÓN CLOUD v10.2 (Enterprise Turbo)
 */
export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;

    if (!url) {
        throw new Error("Cloud URL no configurada");
    }

    try {
        let finalPayload = { 
            action, 
            ...payload,
            metadata: {
                timestamp: Date.now(),
                version: "3.2.0-Turbo",
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

        if (json.success === false) {
            throw new Error(json.error || "Error desconocido en el servidor Google");
        }

        return json;

    } catch (error: any) {
        console.error("❌ CLOUD_CRASH:", error.message);
        logger.error('GAS_SERVICE', `Fallo [${action}]: ${error.message}`);
        throw error;
    }
};

export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    const shouldCompress = payload.rows.length > 10;
    return await callGas('append_rows', payload, shouldCompress);
};

export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName, ...filters });
    return res.rows || [];
};

/**
 * Descarga la configuración maestra desde la pestaña CONFIG_SISTEMA
 */
export const fetchSystemConfig = async (): Promise<AppSheetConfig> => {
    const rows = await fetchFromGas('CONFIG_SISTEMA');
    if (!rows || rows.length === 0) {
        throw new Error("La pestaña 'CONFIG_SISTEMA' no existe o está vacía en el Excel.");
    }

    const master = rows[0]; // Tomamos la primera fila de datos
    
    // Mapeo flexible por si cambian los nombres de columnas en el Excel
    return {
        appId: String(master.APP_ID || master['Application ID'] || ''),
        accessKey: String(master.ACCESS_KEY || master['Access Key'] || ''),
        countsTableName: String(master.TABLE_LOGS || master['Tabla Logs'] || 'CONTEOS'),
        consolidatedTableName: String(master.TABLE_CONSOLIDADO || master['Tabla Consolidado'] || 'CONSOLIDADO'),
        productsTableName: String(master.TABLE_PRODUCTOS || master['Tabla Productos'] || 'PRODUCTOS'),
        receptionTableName: String(master.TABLE_RECEPCION || master['Tabla Recepcion'] || 'RECEPCION_BULTOS'),
        gasWebAppUrl: String(master.GAS_URL || master['URL Script'] || '')
    };
};