
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
        console.error(`[Infra] Error HTTP ${response.status}:`, errorBody);
        // AppSheet usually returns 400 or 404 for duplicates/keys not found
        throw new Error(`AppSheet API Error (${response.status}): ${errorBody}`);
      }

      const text = await response.text();
      // AppSheet sometimes returns empty string on success for some actions, but for Add/Find/Edit it usually returns JSON.
      if (!text) return { success: true };

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.warn("[Infra] Response was not JSON:", text);
        return { success: true }; // Assume success if 200 OK but weird body (rare)
      }

      // --- CRITICAL VALIDATION (THE FIX) ---
      // If we tried to ADD or EDIT, AppSheet MUST return the rows affected.
      // If it returns an empty array, the operation failed silently (e.g. key mismatch, constraint violation, or duplicate key on Add without proper error code).
      if ((payload.Action === 'Add' || payload.Action === 'Edit') && Array.isArray(json.Rows) && json.Rows.length === 0) {
          console.warn("[Infra] AppSheet returned 200 OK but ZERO rows were affected. Treating as Silent Failure.");
          throw new Error(`Escritura fallida (Silent Failure): AppSheet rechazó la fila pero dijo OK. Verifique Claves/Duplicados.`);
      }

      return json;

  } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("[Infra] Network/Fetch Error:", error);
      
      if (error.name === 'AbortError') {
          throw new Error("Tiempo de espera agotado (Timeout). Verifique su conexión a internet.");
      }
      throw new Error(error.message || "Error de conexión con AppSheet.");
  }
};
