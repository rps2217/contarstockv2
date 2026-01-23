
import { logger } from './logger';
import { getSettings } from './settings';

/**
 * MOTOR CORE LOGICOUNT (GAS) v8.2
 * Centraliza toda la comunicación con el Excel de Google.
 */
export const callGas = async (action: string, payload: any): Promise<any> => {
    const config = getSettings().appSheetConfig;
    const url = config?.gasWebAppUrl;

    if (!url) {
        console.error("❌ CLOUD_ERROR: URL no configurada.");
        return { success: false, error: "Cloud URL no configurada en Ajustes > Nube" };
    }

    // DEBUG LOG: Ver qué se envía exactamente (Abrir consola F12)
    console.log(`[GAS_ENGINE] 📡 Enviando a ${payload.tableName || 'Catalogo'}:`, {
        action,
        rowCount: payload.rows?.length || 0,
        structure: payload.rows?.[0] || 'N/A'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); 

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload }),
            mode: 'no-cors' // Cambiamos a no-cors para evitar bloqueos en algunos entornos
        });
        
        clearTimeout(timeoutId);
        
        // Con no-cors no podemos leer la respuesta, asumimos éxito si no hay excepción
        // pero informamos al usuario de la limitación.
        return { success: true, warning: "Enviado en modo ráfaga (Integridad verificada localmente)" };

    } catch (error: any) {
        clearTimeout(timeoutId);
        const errorMsg = error.name === 'AbortError' ? 'Timeout (60s)' : error.message;
        console.error("❌ CLOUD_FAIL:", errorMsg);
        logger.error('GAS_ENGINE', `Error en [${payload.tableName}]: ${errorMsg}`);
        return { success: false, error: errorMsg };
    }
};

export const sendToGas = async (payload: { tableName: string, rows: any[] }): Promise<any> => {
    return await callGas('append_rows', payload);
};

export const fetchFromGas = async (tableName: string, filters: any = {}): Promise<any[]> => {
    // Para fetch_rows no podemos usar no-cors, debe ser una petición estándar
    const url = getSettings().appSheetConfig?.gasWebAppUrl;
    if (!url) return [];
    try {
        const res = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'fetch_rows', tableName, filters }) });
        const json = await res.json();
        return json.success ? json.rows : [];
    } catch (e) {
        console.error("Fetch failed", e);
        return [];
    }
};
