
import { firebaseSyncService } from './firebaseSyncService';
import { getSettings } from './settings';

export interface TestResult {
 step: string;
 status: 'ok' | 'fail' | 'warn';
 message: string;
}

export const runStockEngineTest = async (): Promise<TestResult[]> => {
 const results: TestResult[] = [];
 const config = getSettings().appSheetConfig;

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

 // 2. Ping a Firestore
 try {
 const response = await firebaseSyncService.pullBatch('CONFIG_SISTEMA');
 if (response.success) {
 results.push({ step: 'FIRESTORE_PING', status: 'ok', message: `Conectado exitosamente a Firestore. Colección CONFIG_SISTEMA accesible.` });
 } else {
 throw new Error(response.error);
 }
 } catch (e: any) {
 results.push({ step: 'FIRESTORE_PING', status: 'fail', message: `Error de conexión a Firestore: ${e.message}` });
 return results;
 }

 // 3. Estructura de Datos en Firestore
 try {
 const tableName = config?.productsTableName || 'PRODUCTOS';
 const res = await firebaseSyncService.pullBatch(tableName);
 if (!res.success) {
 results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: `No se pudo acceder a la colección '${tableName}' en Firestore.` });
 } else {
 results.push({ step: 'DATA_STRUCTURE', status: 'ok', message: `Colección ${tableName} leída (${res.rows?.length || 0} documentos).` });
 }
 } catch (e: any) {
 results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: e.message });
 }

 return results;
};
