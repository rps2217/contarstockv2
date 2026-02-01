
import { getSettings } from '../settings';
import { compressData } from '../utils';
import { logger } from '../logger';

interface ApiResponse {
    success: boolean;
    error?: string;
    rows?: any[];
    rows_written?: number;
    server_timestamp?: string;
}

/**
 * CLIENTE HTTP ROBUSTO (SoC)
 * Se encarga exclusivamente del transporte de datos, manejo de errores de red,
 * compresión y protocolos de comunicación con GAS.
 */
export const cloudApi = {
    
    async post(action: string, payload: any, compress = false): Promise<ApiResponse> {
        const config = getSettings().appSheetConfig;
        const url = config?.gasWebAppUrl;

        if (!url) throw new Error("URL de Google Script no configurada.");

        let bodyToSend = {
            action,
            ...payload,
            metadata: { 
                timestamp: Date.now(), 
                compressed: compress,
                version: 'v4.5-Unified' 
            }
        };

        try {
            if (compress && payload.rows) {
                bodyToSend.rows = await compressData(payload.rows);
            }

            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(bodyToSend),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                // Signal para timeout podría ir aquí
            });

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: El servidor rechazó la conexión.`);
            }

            const text = await response.text();
            let json: ApiResponse;
            
            try {
                json = JSON.parse(text);
            } catch (e) {
                throw new Error("Respuesta corrupta del servidor (JSON inválido).");
            }

            if (json.success === false) {
                throw new Error(json.error || "Error desconocido en servidor.");
            }

            return json;

        } catch (error: any) {
            // Logging centralizado de errores de red
            logger.error('CLOUD_Transport', `Fallo en [${action}]`, error.message);
            throw error;
        }
    },

    async fetchTable(tableName: string, since?: string) {
        return this.post('fetch_rows', { tableName, since });
    },

    async appendRows(tableName: string, rows: any[]) {
        // Compresión automática si hay más de 5 filas
        return this.post('append_rows', { tableName, rows }, rows.length > 5);
    }
};