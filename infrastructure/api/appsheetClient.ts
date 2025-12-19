
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
 * Pure HTTP Client for AppSheet API with Exponential Backoff logic.
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
              console.warn(`[Sync] Reintento ${attempt} en ${delay}ms...`);
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
            // Si es un error de servidor (5xx) o rate limiting (429), reintentar
            if (response.status >= 500 || response.status === 429) {
                lastError = new Error(`Servidor ocupado (${response.status})`);
                continue; 
            }
            throw new Error(`Error HTTP ${response.status}: ${errorBody}`);
          }

          const text = await response.text();
          if (!text) return { success: true };

          const json = JSON.parse(text);

          // Silent Failure detection
          if ((payload.Action === 'Add' || payload.Action === 'Edit')) {
              if (!json.Rows || !Array.isArray(json.Rows) || json.Rows.length === 0) {
                  throw new Error("La API no confirmó la escritura de filas. Verifique permisos.");
              }
          }

          return json;

      } catch (error: any) {
          clearTimeout(timeoutId);
          lastError = error;
          if (error.name === 'AbortError') {
              console.error("[Sync] Timeout en intento", attempt);
              continue; // Reintentar en timeout
          }
          if (attempt === maxRetries) throw error;
      }
  }

  throw lastError;
};
