
import { cloudApi } from './cloud/apiClient';
import { CloudStockSchema } from './schemas';
import { logger } from './logger';
import { getSettings } from './settings';

export interface TestResult {
    step: string;
    status: 'ok' | 'fail' | 'warn';
    message: string;
    details?: any;
}

/**
 * ENGINE DIAGNOSTIC v1.1
 * Ejecuta un barrido de pruebas sobre el motor de Stock Teórico
 */
export const runStockEngineTest = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    const config = getSettings().appSheetConfig;

    // 1. Verificar Configuración Local
    const ssId = config?.spreadsheetId;
    if (!ssId || ssId.length < 10) {
        results.push({ 
            step: 'CONFIG_LOCAL', 
            status: 'fail', 
            message: 'No hay ID de Excel configurado o es demasiado corto.' 
        });
        return results;
    }
    
    // Verificación de placeholder
    if (ssId.includes("AUTO_DET")) {
        results.push({ 
            step: 'CONFIG_LOCAL', 
            status: 'fail', 
            message: 'El ID detectado es genérico. Pegue el ID real de su Excel.' 
        });
        return results;
    }

    results.push({ step: 'CONFIG_LOCAL', status: 'ok', message: `ID válido: ${ssId.substring(0, 10)}...` });

    // 2. Ping al Servidor (GAS)
    try {
        const ping = await cloudApi.post('ping', {});
        if (ping.success) {
            results.push({ step: 'CLOUD_PING', status: 'ok', message: `Conectado a: ${ping.spreadsheet_name || 'Excel Desconocido'}` });
        } else {
            throw new Error(ping.error);
        }
    } catch (e: any) {
        results.push({ step: 'CLOUD_PING', status: 'fail', message: `Fallo Cloud: ${e.message}` });
        return results;
    }

    // 3. Prueba de Lectura de Tabla STOCK
    try {
        const res = await cloudApi.post('fetch_rows', { tableName: 'STOCK' });
        
        if (!res.success) {
            results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: `Pestaña 'STOCK' no encontrada o inaccesible.` });
            return results;
        }

        const rows = res.rows || [];
        if (rows.length === 0) {
            results.push({ step: 'DATA_STRUCTURE', status: 'warn', message: 'La pestaña STOCK está vacía.' });
        } else {
            const firstRow = rows[0];
            const testParse = CloudStockSchema.safeParse(firstRow);
            
            if (testParse.success) {
                results.push({ 
                    step: 'DATA_STRUCTURE', 
                    status: 'ok', 
                    message: `Mapeo OK. Ítem detectado: ${testParse.data.barcode}` 
                });
            } else {
                results.push({ 
                    step: 'DATA_STRUCTURE', 
                    status: 'fail', 
                    message: `Cabeceras no coinciden. Se espera: CODIGO, PRODUCTO, STOCK FINAL.`
                });
            }
        }
    } catch (e: any) {
        results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: `Error de lectura: ${e.message}` });
    }

    return results;
};
