
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
            if (response.status >= 500 || response.status === 429) {
                lastError = new Error(`Servidor ocupado (${response.status})`);
                continue; 
            }
            throw new Error(`Error HTTP ${response.status}: ${errorBody}`);
          }

          const text = await response.text();
          
          // MEJORA: AppSheet a veces devuelve status 200 pero cuerpo vacío en Adds/Edits exitosos.
          if (!text || text.trim() === "") {
              return { Rows: [] }; 
          }

          let json;
          try {
              json = JSON.parse(text);
          } catch (e) {
              // Si no es un JSON pero la respuesta fue 200 OK en una acción de escritura, asumimos éxito.
              if (payload.Action === 'Find') throw new Error("La respuesta de búsqueda no es un JSON válido.");
              return { Rows: [] };
          }

          // NORMALIZACIÓN: Si AppSheet devuelve un Array directamente, lo envolvemos en { Rows: [...] }
          if (Array.isArray(json)) {
              json = { Rows: json };
          }

          // Validación para búsquedas (Find)
          if (payload.Action === 'Find') {
              if (!json || typeof json !== 'object' || !json.hasOwnProperty('Rows')) {
                  console.error("[Sync] Respuesta inesperada de AppSheet:", json);
                  throw new Error("La respuesta de AppSheet no contiene la lista de filas (Rows). Verifique el nombre de la tabla.");
              }
          }

          return json;

      } catch (error: any) {
          clearTimeout(timeoutId);
          lastError = error;
          if (error.name === 'AbortError') {
              console.error("[Sync] Timeout en intento", attempt);
              continue; 
          }
          if (attempt === maxRetries) throw error;
      }
  }

  throw lastError;
};
