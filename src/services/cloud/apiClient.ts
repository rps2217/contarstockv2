
import { getSettings } from '../settings';
import { compressData } from '../utils';
import { logger } from '../logger';

interface ApiResponse {
    success: boolean;
    error?: string;
    rows?: any[];
    rows_written?: number;
    server_timestamp?: string;
    updated?: number; 
    added?: number;   
    // FIX: Added spreadsheet_name for consistency across client definitions
    spreadsheet_name?: string;
}

export const cloudApi = {
    
    async post(action: string, payload: any, compress = false): Promise<ApiResponse> {
        const config = getSettings().appSheetConfig;
        const url = config?.gasWebAppUrl;

        if (!url) {
            console.info("[CloudApi] Petición cancelada: No hay URL de Google Script.");
            return { success: false, error: "URL no configurada" };
        }

        let bodyToSend: any = {
            action,
            ...payload,
            spreadsheetId: config.spreadsheetId, // Pasamos el ID del Excel explícitamente
            metadata: { 
                timestamp: Date.now(), 
                compressed: compress,
                version: 'v7.1.5-Robust' 
            }
        };

        if (compress && payload.rows) {
            try {
                bodyToSend.rows = await compressData(payload.rows);
            } catch (e) {
                bodyToSend.metadata.compressed = false;
            }
        }

        const maxRetries = 3;
        const baseTimeout = 40000; 

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutMs = baseTimeout + (attempt * 15000); 
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                if (attempt > 0) {
                    const delay = Math.pow(2, attempt) * 2000; 
                    await new Promise(r => setTimeout(r, delay));
                }

                const response = await fetch(url, {
                    method: 'POST',
                    body: JSON.stringify(bodyToSend),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP Error ${response.status}`);
                }

                const text = await response.text();
                let json: ApiResponse;
                
                try {
                    json = JSON.parse(text);
                } catch (e) {
                    throw new Error("GAS devolvió un formato no válido (verifique despliegue)");
                }

                if (json.success === false) {
                    if (json.error?.includes("lock") || json.error?.includes("busy")) {
                        throw new Error("Servidor ocupado"); 
                    }
                    throw new Error(json.error || "Error en servidor.");
                }

                return json;

            } catch (error: any) {
                clearTimeout(timeoutId);
                if (attempt === maxRetries) {
                    logger.error('CLOUD_Transport', `Fallo tras ${maxRetries} reintentos`, error.message);
                    throw new Error(`Fallo de conexión: ${error.message}`);
                }
            }
        }
        
        throw new Error("Error inesperado en red.");
    },

    async fetchTable(tableName: string, since?: string) {
        return this.post('fetch_rows', { tableName, since });
    },

    async appendRows(tableName: string, rows: any[]) {
        return this.post('append_rows', { tableName, rows }, rows.length > 30);
    }
};