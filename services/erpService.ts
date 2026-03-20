
import { cloudApi } from './cloud/apiClient';
import { CloudOrderRowSchema } from './schemas';

export interface ErpManifest {
  id: string;
  expectedTrays: number;
  description: string;
  status: 'pending' | 'completed';
  items?: any[];
}

/**
 * Service to interact with ERP for cloud downloads.
 */
export const erpService = {
  /**
   * Downloads a manifest from the cloud (Google Sheets).
   */
  async downloadManifest(manifestId: string): Promise<ErpManifest> {
    try {
      const res = await cloudApi.post('fetch_rows', { tableName: 'PEDIDOS' });
      
      if (!res.success || !res.rows) {
        throw new Error(res.error || 'Error al conectar con la nube');
      }

      const erpId = manifestId.toUpperCase().trim();
      
      // Filter rows for this ERP
      const rows = res.rows
        .map((row: any) => {
          try {
            return CloudOrderRowSchema.parse(row);
          } catch (e) {
            return null;
          }
        })
        .filter((p: any) => p !== null && p.erp.toUpperCase() === erpId);

      if (rows.length === 0) {
        throw new Error(`No se encontró el ERP "${erpId}" en la nube.`);
      }

      // Calculate total items and try to find a "Bandejas" or "Bultos" column if it exists in raw data
      // Since CloudOrderRowSchema might strip extra columns, we look at the raw rows too
      let expectedTrays = 0;
      const rawMatch = res.rows.find(r => {
        const normalized: any = {};
        Object.keys(r).forEach(k => normalized[k.trim().toUpperCase()] = r[k]);
        return normalized["ERP"] === erpId || normalized["ORDEN"] === erpId;
      });

      if (rawMatch) {
        const normalized: any = {};
        Object.keys(rawMatch).forEach(k => normalized[k.trim().toUpperCase()] = rawMatch[k]);
        expectedTrays = Number(normalized["BANDEJAS"] || normalized["BULTOS"] || normalized["EXPECTED_TRAYS"] || 0);
      }

      // If no trays column, we use the number of unique SKUs as a fallback or a default
      if (expectedTrays === 0) {
        expectedTrays = rows.length;
      }

      return {
        id: erpId,
        expectedTrays,
        description: `Pedido ERP: ${erpId} (${rows.length} items)`,
        status: 'pending',
        items: rows
      };
    } catch (error: any) {
      console.error("ERP Download Error:", error);
      throw error;
    }
  }
};
