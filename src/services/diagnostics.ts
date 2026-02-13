
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
 * ENGINE DIAGNOSTIC v1.0
 * Ejecuta un barrido de pruebas sobre el motor de Stock Teórico
 */
export const runStockEngineTest = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    const config = getSettings().appSheetConfig;

    // 1. Verificar Configuración Local
    if (!config?.spreadsheetId) {
        results.push({ step: 'CONFIG_LOCAL', status: 'fail', message: 'No hay ID de Excel configurado.' });
        return results;
    }
    results.push({ step: 'CONFIG_LOCAL', status: 'ok', message: `ID detectado: ${config.spreadsheetId.substring(0, 8)}...` });

    // 2. Ping al Servidor (GAS)
    try {
        const ping = await cloudApi.post('ping', {});
        if (ping.success) {
            results.push({ step: 'CLOUD_PING', status: 'ok', message: 'Servidor Google Script responde correctamente.' });
        } else {
            throw new Error(ping.error);
        }
    } catch (e: any) {
        results.push({ step: 'CLOUD_PING', status: 'fail', message: `Error de conexión: ${e.message}` });
        return results;
    }

    // 3. Prueba de Lectura de Tabla STOCK
    try {
        results.push({ step: 'DATA_STRUCTURE', status: 'warn', message: 'Analizando hoja "STOCK" en el Excel...' });
        const res = await cloudApi.post('fetch_rows', { tableName: 'STOCK' });
        
        if (!res.success) {
            results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: `No se pudo leer la hoja STOCK: ${res.error}` });
            return results;
        }

        const rows = res.rows || [];
        if (rows.length === 0) {
            results.push({ step: 'DATA_STRUCTURE', status: 'warn', message: 'La hoja STOCK existe pero no tiene datos (filas vacías).' });
        } else {
            // Validar cabeceras con el primer registro
            const firstRow = rows[0];
            const testParse = CloudStockSchema.safeParse(firstRow);
            
            if (testParse.success) {
                results.push({ 
                    step: 'DATA_STRUCTURE', 
                    status: 'ok', 
                    message: `Mapeo exitoso. Detectado: ${testParse.data.barcode} - ${testParse.data.name}` 
                });
            } else {
                const missingFields = testParse.error.errors.map(e => e.path.join('.')).join(', ');
                results.push({ 
                    step: 'DATA_STRUCTURE', 
                    status: 'fail', 
                    message: `Columnas no coinciden. Faltan o están mal escritas: ${missingFields}`,
                    details: firstRow
                });
            }
        }
    } catch (e: any) {
        results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: `Fallo crítico en lectura: ${e.message}` });
    }

    return results;
};
