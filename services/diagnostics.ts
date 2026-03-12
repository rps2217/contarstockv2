
import { cloudApi } from './cloud/apiClient';
import { CloudStockSchema } from './schemas';
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
 const ssId = config?.spreadsheetId || "";
 if (ssId.toUpperCase().includes("AUTO_DETECTED") || ssId === "") {
 results.push({ 
 step: 'CONFIG_LOCAL', 
 status: 'fail', 
 message: 'ERROR CRÍTICO: El ID del Excel no es válido. Debe copiarlo de la URL de su Google Sheet y pegarlo en Ajustes > Nube.' 
 });
 return results;
 }

 results.push({ step: 'CONFIG_LOCAL', status: 'ok', message: `ID válido detectado: ${ssId.substring(0, 10)}...` });

 // 2. Ping al Servidor (GAS)
 try {
 const ping = await cloudApi.post('ping', { spreadsheetId: ssId });
 if (ping.success) {
 results.push({ step: 'CLOUD_PING', status: 'ok', message: `Conectado exitosamente a: ${ping.spreadsheet_name}` });
 } else {
 throw new Error(ping.error);
 }
 } catch (e: any) {
 let msg = e.message;
 if (msg.includes("ACCESO_DENEGADO") || msg.includes("openById")) {
 msg = "ERROR DE PERMISOS: Google no permite al Script abrir el Excel. Comparta el Excel con el desarrollador o ejecute TRIGGER_PERMISSIONS en el editor de Script.";
 }
 results.push({ step: 'CLOUD_PING', status: 'fail', message: msg });
 return results;
 }

 // 3. Estructura de Datos
 try {
 const res = await cloudApi.post('fetch_rows', { tableName: 'STOCK', spreadsheetId: ssId });
 if (!res.success) {
 results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: `No se encuentra la pestaña 'STOCK' en el Excel.` });
 } else {
 results.push({ step: 'DATA_STRUCTURE', status: 'ok', message: `Pestaña STOCK leída (${res.rows?.length || 0} filas).` });
 }
 } catch (e: any) {
 results.push({ step: 'DATA_STRUCTURE', status: 'fail', message: e.message });
 }

 return results;
};
