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
 * Tightened validation to prevent false success reports.
 */
export const sendToAppSheet = async (
  config: AppSheetConfig, 
  tableName: string, 
  payload: AppSheetPayload,
  timeoutMs: number = 45000 
): Promise<any> => {
  if (!config.appId || !config.accessKey) {
      throw new Error("Configuración de AppSheet incompleta (Falta AppID o AccessKey).");
  }

  const endpoint = `https://api.appsheet.com/api/v2/apps/${config.appId}/tables/${tableName}/Action`;

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
        throw new Error(`Error HTTP ${response.status}: ${errorBody}`);
      }

      const text = await response.text();
      if (!text) return { success: true };

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        return { success: true }; 
      }

      // --- CRITICAL VALIDATION ---
      // AppSheet often returns 200 OK but an empty Rows array if column names are wrong or constraints fail.
      if ((payload.Action === 'Add' || payload.Action === 'Edit')) {
          if (!json.Rows || !Array.isArray(json.Rows) || json.Rows.length === 0) {
              console.error("[AppSheet] Silent Failure detected. Payload:", payload, "Response:", json);
              throw new Error("El servidor recibió los datos pero no pudo escribir la fila. Verifique que los nombres de las columnas en Excel coincidan exactamente con la App.");
          }
      }

      return json;

  } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
          throw new Error("Tiempo de espera agotado. Verifique su conexión.");
      }
      throw error;
  }
};