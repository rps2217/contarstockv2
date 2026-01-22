
import { logger } from './logger';
import { getSettings } from './settings';

/**
 * MOTOR DE COMUNICACIÓN TURBO-GAS (v4.6)
 * Diseñado para trabajar con scripts fusionados (doGet + doPost).
 */
export const callGas = async (action: string, payload: any): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;
    
    if (!url) {
        return { success: false, error: "URL de Google Script no configurada." };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...payload })
        });

        if (!response.ok) {
            throw new Error(`Servidor Google respondió con error ${response.status}`);
        }

        const rawText = await response.text();
        
        // Si Google devuelve HTML en un POST, es un error de ejecución del script
        if (rawText.includes("<!DOCTYPE html>")) {
            throw new Error("El script de Google encontró un error interno. Revisa la consola de Apps Script.");
        }

        try {
            return JSON.parse(rawText);
        } catch (e) {
            console.error("[GAS] No JSON response:", rawText);
            throw new Error("La respuesta de la nube no tiene un formato válido.");
        }

    } catch (error: any) {
        logger.error('GAS_ENGINE', `Acción [${action}] falló: ${error.message}`);
        return { success: false, error: error.message };
    }
};

export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    const res = await callGas('fetch_rows', { tableName, filters });
    if (res && res.success) return res.rows || [];
    throw new Error(res?.error || "Fallo al descargar datos de la hoja");
};

export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    return await callGas('append_rows', payload);
};
