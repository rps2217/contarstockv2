
export interface AppSheetConfig {
 appId: string;
 accessKey: string;
}

export interface AppSheetPayload {
 Action: "Add" | "Edit" | "Find";
 Properties: {
 Locale: string;
 Timezone: string;
 Selector?: string;
 };
 Rows: any[];
}

/**
 * Cliente HTTP robusto para AppSheet con manejo de errores internos de negocio.
 */
export const sendToAppSheet = async (
 config: AppSheetConfig, 
 tableName: string, 
 payload: AppSheetPayload,
 timeoutMs: number = 45000,
 maxRetries: number = 2
): Promise<any> => {
 if (!config.appId || !config.accessKey) {
 throw new Error("Configuración de AppSheet incompleta.");
 }

 const endpoint = `https://api.appsheet.com/api/v2/apps/${config.appId}/tables/${tableName}/Action`;
 
 let lastError: any;

 for (let attempt = 0; attempt <= maxRetries; attempt++) {
 const controller = new AbortController();
 const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

 try {
 if (attempt > 0) {
 const delay = Math.pow(2, attempt) * 1000;
 await new Promise(r => setTimeout(r, delay));
 }

 const response = await fetch(endpoint, {
 method: 'POST',
 headers: {
 'ApplicationAccessKey': config.accessKey,
 'Content-Type': 'application/json'
 },
 body: JSON.stringify(payload),
 signal: controller.signal
 });

 clearTimeout(timeoutId);

 if (!response.ok) {
 const errorBody = await response.text();
 throw new Error(`Error Cloud ${response.status}: ${errorBody}`);
 }

 const text = await response.text();
 if (!text || text.trim() === "") return { Rows: [] };

 const json = JSON.parse(text);

 // DETECCIÓN DE ERROR INTERNO: AppSheet devuelve error dentro del JSON a veces
 if (json && json.REST_Operation_Failed) {
 throw new Error(`AppSheet Error: ${json.REST_Operation_Failed}`);
 }

 return Array.isArray(json) ? { Rows: json } : json;

 } catch (error: any) {
 clearTimeout(timeoutId);
 lastError = error;
 if (error.name === 'AbortError') continue; 
 if (attempt === maxRetries) throw error;
 }
 }
 throw lastError;
};
