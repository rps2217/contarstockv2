
// infrastructure/api/appsheetClient.ts

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
 * Pure HTTP Client for AppSheet API.
 * Zero dependencies on application logic or database.
 * Includes timeout handling for robustness in warehouse environments.
 */
export const sendToAppSheet = async (
  config: AppSheetConfig, 
  tableName: string, 
  payload: AppSheetPayload,
  timeoutMs: number = 45000 // Default 45s timeout
): Promise<any> => {
  if (!config.appId || !config.accessKey) {
      throw new Error("Configuración de AppSheet incompleta (Falta AppID o AccessKey).");
  }

  const endpoint = `https://api.appsheet.com/api/v2/apps/${config.appId}/tables/${tableName}/Action`;

  console.log(`[Infra] ${payload.Action} -> ${tableName}`, payload.Rows.length > 0 ? `(${payload.Rows.length} rows)` : '(Query)');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
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
        console.error(`[Infra] Error ${response.status}:`, errorBody);
        throw new Error(`AppSheet API Error: ${errorBody}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : { success: true };

  } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("[Infra] Network/Fetch Error:", error);
      
      if (error.name === 'AbortError') {
          throw new Error("Tiempo de espera agotado (Timeout). Verifique su conexión a internet.");
      }
      throw new Error(error.message || "Error de conexión con AppSheet.");
  }
};
