
import { logger } from './logger';
import { getSettings } from './settings';
import { compressData } from './utils';
import { AppSheetConfig } from '../types';

export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;

    if (!url) throw new Error("Cloud URL no configurada en la App.");

    try {
        let finalPayload = { 
            action, 
            ...payload,
            metadata: { timestamp: Date.now(), compressed: compress }
        };

        if (compress && payload.rows) {
            finalPayload.rows = await compressData(payload.rows);
        }

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(finalPayload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        const text = await response.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            throw new Error("El servidor respondió con un formato no válido (posible error de permisos en Google).");
        }

        if (json.success === false) throw new Error(json.error);
        return json;
    } catch (error: any) {
        logger.error('GAS_SERVICE', `Fallo [${action}]: ${error.message}`);
        throw error;
    }
};

export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    return await callGas('append_rows', payload, payload.rows.length > 5);
};

export const fetchFromGas = async (tableName: string): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName });
    return res.rows || [];
};

export const fetchSystemConfig = async (): Promise<AppSheetConfig> => {
    const rows = await fetchFromGas('CONFIG_SISTEMA');
    if (!rows || rows.length === 0) throw new Error("Pestaña 'CONFIG_SISTEMA' no encontrada.");

    const master = rows[0]; 
    return {
        appId: String(master.APP_ID || ''),
        accessKey: String(master.ACCESS_KEY || ''),
        countsTableName: String(master.TABLE_LOGS || 'CONTEOS'),
        consolidatedTableName: String(master.TABLE_CONSOLIDADO || 'CONSOLIDADO'),
        productsTableName: String(master.TABLE_PRODUCTOS || 'PRODUCTOS'),
        receptionTableName: String(master.TABLE_RECEPCION || 'RECEPCION_BULTOS'),
        gasWebAppUrl: String(master.GAS_URL || '') // Se añade soporte para leer la URL desde la nube también
    };
};
