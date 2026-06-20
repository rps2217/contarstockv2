/**
 * CatalogImporter - Importa catálogos desde la nube
 * 
 * Ahora usa GenericSyncEngine como motor central.
 * Mantiene la misma API para compatibilidad legacy.
 */
import { genericSyncEngine } from '../cloud/GenericSyncEngine';
import { logger } from '../logger';
import { toast } from 'sonner';

/**
 * Importa productos desde la nube usando GenericSyncEngine
 */
export const importProductsFromCloud = async (): Promise<number> => {
  try {
    const result = await genericSyncEngine.pullRemoteChanges('products');
    logger.info("FETCH_PRODUCTS", `Descargados ${result.added + result.updated} productos`);
    return result.added + result.updated;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("FETCH_PRODUCTS_FAIL", `Error en Cloud Sync: ${error.message}`);
    throw err;
  }
};

/**
 * Importa proveedores desde la nube usando GenericSyncEngine
 */
export const importProvidersFromCloud = async (): Promise<number> => {
  try {
    const result = await genericSyncEngine.pullRemoteChanges('providers');
    logger.info("FETCH_PROVIDERS", `Descargados ${result.added + result.updated} proveedores`);
    return result.added + result.updated;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("FETCH_PROVIDERS_FAIL", `Error descargando proveedores: ${error.message}`);
    throw err;
  }
};

/**
 * Sincroniza ambos catálogos (productos y proveedores) usando GenericSyncEngine
 */
export const syncCatalogs = async (onProgress?: (msg: string) => void): Promise<{ products: number; providers: number }> => {
  if (onProgress) onProgress("Sincronizando catálogos maestros...");
  
  try {
    const [productsResult, providersResult] = await Promise.all([
      genericSyncEngine.pullRemoteChanges('products'),
      genericSyncEngine.pullRemoteChanges('providers')
    ]);
    
    const productsCount = productsResult.added + productsResult.updated;
    const providersCount = providersResult.added + providersResult.updated;
    
    if (onProgress) {
      onProgress(`✓ Catálogos actualizados: ${productsCount} productos, ${providersCount} proveedores.`);
    }
    
    logger.info("SYNC_CATALOGS", `Catálogos: ${productsCount} productos, ${providersCount} proveedores`);
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
