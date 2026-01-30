
import { logger } from './logger';
import { getSettings } from './settings';
import { compressData } from './utils';
import { AppSheetConfig } from '../types';

export const callGas = async (action: string, payload: any, compress: boolean = false): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;

    if (!url) throw new Error("Cloud URL no configurada");

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

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: El servidor no respondió.`);
        }

        const text = await response.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            throw new Error("Respuesta no válida del servidor (posible error de script).");
        }

        if (json.success === false) {
            // ALERTA CRÍTICA: Mostramos el error real al usuario
            alert(`❌ Error del Servidor Cloud:\n${json.error}`);
            throw new Error(json.error);
        }
        
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
    if (!res.success) throw new Error(res.error);
    return res.rows || [];
};

export const fetchSystemConfig = async (): Promise<AppSheetConfig> => {
    const rows = await fetchFromGas('CONFIG_SISTEMA');
    if (!rows || rows.length === 0) throw new Error("CONFIG_SISTEMA está vacía.");

    const master = rows[0]; 
    return {
        appId: String(master.APP_ID || ''),
        accessKey: String(master.ACCESS_KEY || ''),
        countsTableName: String(master.TABLE_LOGS || 'CONTEOS'),
        consolidatedTableName: String(master.TABLE_CONSOLIDADO || 'CONSOLIDADO'),
        productsTableName: String(master.TABLE_PRODUCTOS || 'PRODUCTOS'),
        receptionTableName: String(master.TABLE_RECEPCION || 'RECEPCION_BULTOS'),
        gasWebAppUrl: getSettings().appSheetConfig?.gasWebAppUrl || ''
    };
};
