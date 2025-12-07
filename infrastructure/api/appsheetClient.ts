
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
 */
export const sendToAppSheet = async (
  config: AppSheetConfig, 
  tableName: string, 
  payload: AppSheetPayload
): Promise<any> => {
  if (!config.appId || !config.accessKey) {
      throw new Error("Configuración de AppSheet incompleta (Falta AppID o AccessKey).");
  }

  const endpoint = `https://api.appsheet.com/api/v2/apps/${config.appId}/tables/${tableName}/Action`;

  console.log(`[Infra] ${payload.Action} -> ${tableName}`, payload.Rows.length > 0 ? `(${payload.Rows.length} rows)` : '(Query)');

  try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'ApplicationAccessKey': config.accessKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Infra] Error ${response.status}:`, errorBody);
        throw new Error(`AppSheet API Error: ${errorBody}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : { success: true };

  } catch (error: any) {
      console.error("[Infra] Network/Fetch Error:", error);
      throw new Error(error.message || "Error de conexión con AppSheet.");
  }
};
