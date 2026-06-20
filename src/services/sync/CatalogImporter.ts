/**
 * CatalogImporter - Importa catálogos desde la nube (Productos, Proveedores)
 * 
 * Extraído de syncManager.ts para reducir complejidad.
 */
import { ZodError } from 'zod';

import { db } from '../../db';
import { Product, Provider } from '../../types';
import { logger } from '../logger';
import { toast } from 'sonner';
import { supabaseSyncService } from '../supabaseSyncService';
import { CloudProductSchema, CloudProviderSchema } from '../schemas';
import { getSettings } from '../settings';
import { saveProductBatch } from '../productService';
import { useSyncStore } from '@/stores';

/**
 * Importa productos desde la nube (sincronización incremental)
 */
export const importProductsFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().cloudConfig;
    const tableName = config?.productsTableName || "PRODUCTOS";
    
    // Incremental Sync per table
    const { lastSyncPerTable, setTableSyncTime } = useSyncStore.getState();
    const lastSyncTime = lastSyncPerTable[tableName];
    const lastSyncIso = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;
    
    // Pull from cloud only rows updated after our last sync
    const response = await supabaseSyncService.pullBatch(tableName, lastSyncIso, 'updated_at'); 
    
    if (!response.success || !response.rows) return 0;

    const products: Product[] = response.rows
      .filter((p: any) => p.id !== 'undefined')
      .map((p: any) => {
        const result = CloudProductSchema.safeParse(p);
        if (!result.success) {
          console.warn("Product validation failed:", p, ((result as any).error as ZodError)?.issues?.[0]?.message || "Unknown");
        }
        return result.success ? result.data : null;
      })
      .filter((p): p is Product => p !== null)
      .map(p => ({ ...p, syncStatus: 'synced' as const }));

    if (products.length > 0) {
      await saveProductBatch(products);
    }

    // Actualizar Timestamp para esta tabla específica
    setTableSyncTime(tableName, Date.now());

    return products.length;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("FETCH_PRODUCTS_FAIL", `Error en Cloud Sync: ${error.message}`);
    throw err;
  }
};

/**
 * Importa proveedores desde la nube (sincronización incremental)
 */
export const importProvidersFromCloud = async (): Promise<number> => {
  try {
    const config = getSettings().cloudConfig;
    const tableName = config?.providersTableName || "PROVEEDORES";
    
    const { lastSyncPerTable, setTableSyncTime } = useSyncStore.getState();
    const lastSyncTime = lastSyncPerTable[tableName];
    const lastSyncIso = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;

    const response = await supabaseSyncService.pullBatch(tableName, lastSyncIso, 'updated_at'); 
    
    if (!response.success || !response.rows) {
      logger.info("FETCH_PROVIDERS", `No se recibieron datos de ${tableName} (Falla o vacío).`);
      return 0;
    }

    logger.info("FETCH_PROVIDERS", `Recibidas ${response.rows.length} filas desde ${tableName}. Procesando...`);

    const providers: Provider[] = response.rows
      .filter((row: any) => row.id !== 'undefined')
      .map((row: any) => {
        const result = CloudProviderSchema.safeParse(row);
        if (!result.success) {
          console.warn("Provider validation failed:", row, ((result as any).error as ZodError)?.issues?.[0]?.message || "Unknown");
          // Intentar un mapeo crudo si falla el esquema estricto (Resiliencia)
          if (row.rut || row.RUT) {
            return {
              rut: String(row.rut || row.RUT || row.id || ''),
              name: String(row.name || row.NOMBRE || 'PROVEEDOR RECONOCIDO'),
              withdrawalDays: Number(row.withdrawaldays || row.withdrawal_days || 0),
              hasExchange: !!(row.hasexchange || row.has_exchange)
            } as Provider;
          }
        }
        return result.success ? result.data : null;
      })
      .filter((p): p is Provider => p !== null && !!p.rut && !!p.name)
      .map(p => ({ ...p, syncStatus: 'synced' as const }));

    if (providers.length > 0) {
      logger.info("FETCH_PROVIDERS", `Guardando ${providers.length} proveedores en base de datos local.`);
      await db.providers.bulkPut(providers);
    } else {
      logger.warn("FETCH_PROVIDERS", "No se encontraron proveedores válidos tras filtrado y validación.");
    }

    setTableSyncTime(tableName, Date.now());

    return providers.length;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("FETCH_PROVIDERS_FAIL", `Error descargando proveedores: ${error.message}`);
    throw err;
  }
};

/**
 * Sincroniza ambos catálogos (productos y proveedores)
 */
export const syncCatalogs = async (onProgress?: (msg: string) => void): Promise<{ products: number, providers: number }> => {
  if (onProgress) onProgress("Sincronizando catálogos maestros...");
  
  try {
    const [productsCount, providersCount] = await Promise.all([
      importProductsFromCloud(),
      importProvidersFromCloud()
    ]);
    
    if (onProgress) onProgress(`✓ Catálogos actualizados: ${productsCount} productos, ${providersCount} proveedores.`);
    return { products: productsCount, providers: providersCount };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.message === 'Failed to fetch') {
      toast.error('Error de red: No se pudo conectar con el servidor.');
    } else {
      logger.warn("CATALOG_SYNC_PARTIAL_FAIL", error.message);
    }
    throw err;
  }
};

/**
 * Importa clientes y plantillas desde la nube
 */
export const importCustomersAndTemplatesFromCloud = async (): Promise<void> => {
  const { dynamicSyncService } = await import('../dynamicSync');
  const { logger } = await import('../logger');
  const { handleError } = await import('../types');

  for (const table of ['CLIENTES', 'PLANTILLAS_MENSAJES', 'PLANTILLAS_CORREOS']) {
    try { 
      await dynamicSyncService.pullSync(table); 
    }
    catch (err: unknown) {
      const msg = handleError(err).message;
      if (!msg.includes('Table not found')) logger.warn("FETCH_CONFIG", msg);
    }
  }
};
