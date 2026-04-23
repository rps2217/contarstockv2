
import { supabaseSyncService } from './supabaseSyncService';
import { getSettings } from './settings';

export interface TestResult {
 step: string;
 status: 'ok' | 'fail' | 'warn';
 message: string;
}

export const runStockEngineTest = async (): Promise<TestResult[]> => {
 const results: TestResult[] = [];
 const config = getSettings().cloudConfig;

  // 1. Verificar Configuración Local
  if (!config) {
    results.push({ 
      step: 'CONFIG_LOCAL', 
      status: 'warn', 
      message: 'Aviso: La configuración cloud no está inicializada.' 
    });
  } else {
    results.push({ step: 'CONFIG_LOCAL', status: 'ok', message: `Configuración cloud cargada correctamente.` });
  }

 // 2. Ping a Supabase
 try {
 const response = await supabaseSyncService.pullBatch('CONFIG_SISTEMA');
 if (response.success) {
 results.push({ step: 'SUPABASE_PING', status: 'ok', message: `Conectado exitosamente a Supabase. Tabla CONFIG_SISTEMA accesible.` });
 } else {
 throw new Error(response.error);
 }
 } catch (e: any) {
 results.push({ step: 'SUPABASE_PING', status: 'fail', message: `Error de conexión a Supabase: ${e.message}` });
 return results;
 }

 // 3. Estructura de Datos en Supabase
 try {
 const tableName = config?.productsTableName || 'PRODUCTOS';
 const res = await supabaseSyncService.pullBatch(tableName);
 if (!res.success) {
 results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: `No se pudo acceder a la tabla '${tableName}' en Supabase.` });
 } else {
 results.push({ step: 'DATA_STRUCTURE', status: 'ok', message: `Tabla ${tableName} leída (${res.rows?.length || 0} registros).` });
 }
 } catch (e: any) {
 results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: e.message });
 }

 return results;
};

// Forced GitHub sync
