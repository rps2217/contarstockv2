
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
 * CLIENTE HTTP ROBUSTO V2 (Batch & Retry)
 * Gestiona la comunicación con Google Apps Script con tolerancia a fallos.
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
                version: 'v5.0-BatchOptimized' 
            }
        };

        // Compresión condicional
        if (compress && payload.rows) {
            try {
                bodyToSend.rows = await compressData(payload.rows);
            } catch (e) {
                console.warn("Fallo compresión, enviando plano", e);
                bodyToSend.metadata.compressed = false;
            }
        }

        // LÓGICA DE REINTENTO (Exponential Backoff)
        const maxRetries = 3;
        const baseTimeout = 20000; // 20s iniciales

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutMs = baseTimeout + (attempt * 10000); // Aumenta 10s por intento
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                if (attempt > 0) {
                    const delay = Math.pow(2, attempt) * 1000; // Espera: 2s, 4s, 8s
                    console.log(`[CloudAPI] Reintentando ${action} (Intento ${attempt}/${maxRetries}) en ${delay}ms...`);
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
                    throw new Error(`HTTP Error ${response.status}: El servidor rechazó la conexión.`);
                }

                const text = await response.text();
                let json: ApiResponse;
                
                try {
                    json = JSON.parse(text);
                } catch (e) {
                    throw new Error("Respuesta corrupta del servidor (HTML devuelto en lugar de JSON). Verifique despliegue GAS.");
                }

                if (json.success === false) {
                    // Si el servidor dice "bloqueado", es un error recuperable, forzamos reintento
                    if (json.error?.includes("Bloqueo") || json.error?.includes("Lock")) {
                        throw new Error("Server Busy"); 
                    }
                    throw new Error(json.error || "Error desconocido en servidor.");
                }

                return json;

            } catch (error: any) {
                clearTimeout(timeoutId);
                const isLastAttempt = attempt === maxRetries;
                
                // Errores fatales que no se deben reintentar
                if (error.message.includes("URL de Google Script") || error.message.includes("corrupta")) {
                    logger.error('CLOUD_FATAL', error.message);
                    throw error;
                }

                if (isLastAttempt) {
                    logger.error('CLOUD_Transport', `Fallo definitivo en [${action}] tras ${maxRetries} intentos`, error.message);
                    throw new Error(`Error de Conexión: ${error.message}`);
                }
                // Si no es el último intento, el bucle continúa (reintento)
            }
        }
        
        throw new Error("Error inesperado en ciclo de red.");
    },

    async fetchTable(tableName: string, since?: string) {
        return this.post('fetch_rows', { tableName, since });
    },

    async appendRows(tableName: string, rows: any[]) {
        return this.post('append_rows', { tableName, rows }, rows.length > 50);
    }
};
