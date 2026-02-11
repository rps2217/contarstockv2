
import { getSettings } from '../settings';
import { compressData } from '../utils';
import { logger } from '../logger';

interface ApiResponse {
    success: boolean;
    error?: string;
    rows?: any[];
    rows_written?: number;
    server_timestamp?: string;
    updated?: number; // Para upserts
    added?: number;   // Para upserts
}

/**
 * CLIENTE HTTP ROBUSTO V2.1 (AI Optimized)
 */
export const cloudApi = {
    
    async post(action: string, payload: any, compress = false): Promise<ApiResponse> {
        const config = getSettings().appSheetConfig;
        const url = config?.gasWebAppUrl;

        if (!url) throw new Error("URL de Google Script no configurada.");

        // Preparación del Payload
        let bodyToSend = {
            action,
            ...payload,
            metadata: { 
                timestamp: Date.now(), 
                compressed: compress,
                version: 'v7.1-AI-Ready' 
            }
        };

        // Compresión automática para IA (Vectores)
        if (compress && payload.rows) {
            try {
                bodyToSend.rows = await compressData(payload.rows);
            } catch (e) {
                console.warn("Fallo compresión, enviando plano", e);
                bodyToSend.metadata.compressed = false;
            }
        }

        const maxRetries = 3;
        const baseTimeout = 40000; // Aumentado a 40s para procesos de IA en GAS

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
                    throw new Error("GAS devolvió HTML (Posible error de ejecución en el script)");
                }

                if (json.success === false) {
                    if (json.error?.includes("lock") || json.error?.includes("busy")) {
                        throw new Error("Server Busy"); 
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
