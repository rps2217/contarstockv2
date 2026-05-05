
import { supabaseSyncService } from './supabaseSyncService';
import { CloudOrderRowSchema } from './schemas';
import { getSettings } from './settings';

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
   * Downloads a manifest from the cloud.
   */
  async downloadManifest(manifestId: string): Promise<ErpManifest> {
    try {
      const config = getSettings().cloudConfig;
      const tableName = config?.ordersTableName || 'PEDIDOS';
      const res = await supabaseSyncService.pullBatch(tableName);
      
      if (!res.success || !res.rows) {
        throw new Error(res.error || 'Error al conectar con la nube');
      }

      const erpId = String(manifestId || '').toUpperCase().trim();
      
      // Filter rows for this ERP
      const rows = res.rows
        .map((row: any) => {
          try {
            return CloudOrderRowSchema.parse(row);
          } catch (e) {
            return null;
          }
        })
        .filter((p: any) => p !== null && String(p.erp || '').toUpperCase() === erpId);

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
      const msg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error("ERP Download Error:", msg);
      throw new Error(msg);
    }
  },

  /**
   * Downloads all manifests from the cloud and groups them by ERP.
   * Useful for background syncing so the Detective AI has data to work with.
   */
  async downloadAllPendingManifests(): Promise<ErpManifest[]> {
    try {
      const config = getSettings().cloudConfig;
      const tableName = config?.ordersTableName || 'PEDIDOS';
      const res = await supabaseSyncService.pullBatch(tableName);
      
      if (!res.success || !res.rows) {
        throw new Error(res.error || 'Error al conectar con la nube');
      }

      // Group rows by ERP
      const erpGroups = new Map<string, any[]>();
      
      res.rows.forEach((row: any) => {
        try {
          const parsed = CloudOrderRowSchema.parse(row);
          const erpId = String(parsed.erp || '').toUpperCase().trim();
          if (!erpGroups.has(erpId)) {
            erpGroups.set(erpId, []);
          }
          erpGroups.get(erpId)!.push(parsed);
        } catch (e) {
          // Ignore invalid rows
        }
      });

      const manifests: ErpManifest[] = [];

      erpGroups.forEach((rows, erpId) => {
        // Find raw match for expected trays
        let expectedTrays = 0;
        const rawMatch = res.rows.find((r: any) => {
          const normalized: any = {};
          Object.keys(r).forEach(k => normalized[k.trim().toUpperCase()] = r[k]);
          return normalized["ERP"] === erpId || normalized["ORDEN"] === erpId;
        });

        if (rawMatch) {
          const normalized: any = {};
          Object.keys(rawMatch).forEach(k => normalized[k.trim().toUpperCase()] = rawMatch[k]);
          expectedTrays = Number(normalized["BANDEJAS"] || normalized["BULTOS"] || normalized["EXPECTED_TRAYS"] || 0);
        }

        if (expectedTrays === 0) {
          expectedTrays = rows.length;
        }

        manifests.push({
          id: erpId,
          expectedTrays,
          description: `Pedido ERP: ${erpId} (${rows.length} items)`,
          status: 'pending',
          items: rows
        });
      });

      return manifests;
    } catch (error: any) {
      const msg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error("ERP Download All Error:", msg);
      throw new Error(msg);
    }
  }
};

