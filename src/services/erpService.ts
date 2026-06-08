
import { supabaseSyncService } from './supabaseSyncService';
import { CloudOrderRowSchema } from './schemas';
import { getSettings } from './settings';

/**
 * Helpers para reducir duplicación de lógica (DRY)
 */
const getOrdersTableName = (): string => getSettings().cloudConfig?.ordersTableName || 'PEDIDOS';

const calculateExpectedTrays = (rawRow: any, erpId: string): number => {
  const normalized: any = {};
  Object.keys(rawRow).forEach(k => normalized[k.trim().toUpperCase()] = rawRow[k]);
  return Number(normalized["BANDEJAS"] || normalized["BULTOS"] || normalized["EXPECTED_TRAYS"] || 0);
};

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
      const tableName = getOrdersTableName();
      const res = await supabaseSyncService.pullBatch(tableName);
      
      if (!res.success) {
        throw new Error(res.isMissing ? `Tabla ${tableName} no encontrada.` : 'No se pudo conectar a la nube. Verifique su conexión.');
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

      const rawMatch = res.rows.find((r: any) => {
        const n: any = {};
        Object.keys(r).forEach(k => n[k.trim().toUpperCase()] = r[k]);
        return n["ERP"] === erpId || n["ORDEN"] === erpId;
      });

      const expectedTrays = rawMatch ? calculateExpectedTrays(rawMatch, erpId) : rows.length;

      return {
        id: erpId,
        expectedTrays: expectedTrays || rows.length,
        description: `Pedido ERP: ${erpId} (${rows.length} items)`,
        status: 'pending',
        items: rows
      };
    } catch (error: any) {
      const msg = error.message || String(error);
      if (msg.includes('Failed to fetch')) {
        // Suppress network errors
      } else {
        console.error("ERP Download Error:", error);
      }
      throw new Error(`Error descargando manifest: ${msg}`);
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
        const rawMatch = res.rows.find((r: any) => {
          const normalized: any = {};
          Object.keys(r).forEach(k => normalized[k.trim().toUpperCase()] = r[k]);
          return normalized["ERP"] === erpId || normalized["ORDEN"] === erpId;
        });

        const expectedTrays = rawMatch ? calculateExpectedTrays(rawMatch, erpId) : rows.length;

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
      if (msg.includes('Failed to fetch')) {
        // Suppress network errors in logs
      } else {
        console.error("ERP Download All Error:", msg);
      }
      throw new Error(msg);
    }
  }
};

