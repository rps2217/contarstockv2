
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
  fileUrl?: string;
  fileId?: string;
  id?: string;
  clave?: string;
  message?: string;
  // FIX: Added spreadsheet_name to satisfy diagnostic tests in services/diagnostics.ts
  spreadsheet_name?: string;
}

/**
 * CLIENTE HTTP LOGICOUNT v3.0 (Enterprise Core)
 */
export const cloudApi = {
 
 async post(action: string, payload: any, compress = false): Promise<ApiResponse> {
 const config = getSettings().appSheetConfig;
 const url = config?.gasWebAppUrl;

 if (!url) {
 console.info("[CloudApi] Petición abortada: URL no definida.");
 return { success: false, error: "URL_NOT_CONFIGURED" };
 }

 const bodyToSend: any = {
 action,
 ...payload,
 spreadsheetId: config.spreadsheetId,
 secret: import.meta.env.VITE_GAS_SECRET,
 metadata: { 
 timestamp: Date.now(), 
 compressed: compress,
 client_version: 'v5.7.9-AI' 
 }
 };

 if (compress && payload.rows) {
 try {
 bodyToSend.rows = await compressData(payload.rows);
 } catch (e) {
 bodyToSend.metadata.compressed = false;
 }
 }

 // Configuración de reintentos con Backoff exponencial
 const maxRetries = 2;
 const baseTimeout = action === 'upsert_products' ? 60000 : 40000; 

 for (let attempt = 0; attempt <= maxRetries; attempt++) {
 const controller = new AbortController();
 const timeoutId = setTimeout(() => controller.abort(), baseTimeout);

 try {
 if (attempt > 0) {
 await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
 }

 const response = await fetch(url, {
 method: 'POST',
 body: JSON.stringify(bodyToSend),
 headers: { 'Content-Type': 'text/plain;charset=utf-8' },
 signal: controller.signal
 });

 clearTimeout(timeoutId);

 if (!response.ok) throw new Error(`HTTP_${response.status}`);

 const text = await response.text();
 let json: ApiResponse;
 
 try {
 json = JSON.parse(text);
 } catch (e) {
 throw new Error("SERVER_JSON_PARSE_ERROR");
 }

 if (json.success === false) {
 // Manejo de bloqueos de Google Sheets
 if (json.error?.toLowerCase().includes("busy") || json.error?.toLowerCase().includes("lock")) {
 throw new Error("SHEET_LOCKED");
 }
 throw new Error(json.error || "UNKNOWN_SERVER_ERROR");
 }

 return json;

 } catch (error: any) {
 clearTimeout(timeoutId);
 if (attempt === maxRetries) {
 logger.error('CLOUD_API', `Fallo crítico tras ${attempt + 1} intentos`, error.message);
 throw error;
 }
 console.warn(`[CloudApi] Reintento ${attempt + 1}/${maxRetries} debido a: ${error.message}`);
 }
 }
 
 throw new Error("RETRY_LIMIT_EXCEEDED");
 },

 async fetchTable(tableName: string, since?: string) {
 return this.post('fetch_rows', { tableName, since });
 },

 async appendRows(tableName: string, rows: any[]) {
  return this.post('append_rows', { tableName, rows }, rows.length > 20);
 },

 async upsertRows(tableName: string, rows: any[]) {
  return this.post('upsert_rows', { tableName, rows }, rows.length > 20);
 },

 async getSummary(tableName: string, filterColumn?: string, filterValue?: string) {
  return this.post('get_summary', { tableName, filterColumn, filterValue });
 },

 async deleteRow(tableName: string, id: string) {
  return this.post('delete_row', { tableName, id });
 }
};
