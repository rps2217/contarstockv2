/**
 * Command para sincronizar catalogos (productos, proveedores)
 * Extraido de syncManager.ts - syncCatalogs
 */
import { ProductRepository, productRepository } from '../../../repositories';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { getSettings } from '../../../services/settings';
import { saveProductBatch } from '../../../services/productService';
import { CloudProductSchema, CloudProviderSchema } from '../../../services/schemas';
import { logger } from '../../../services/logger';
import { useSyncStore } from '../../../store/useSyncStore';
import { supabase } from '../../../lib/supabase';
import type { Product, Provider } from '../../../types';

const BATCH_SIZE = 500;

/**
 * Sincroniza productos y proveedores hacia la nube
 */
export async function executeCatalogSync(
  onProgress?: (msg: string) => void
): Promise<{ products: number; providers: number }> {
  const config = getSettings().cloudConfig;
  let productsCount = 0;
  let providersCount = 0;

  try {
    // 1. sincronizar productos
    if (onProgress) onProgress("Sincronizando catalogo de productos...");
    
    const products = await productRepository.getAll();
    if (products.length > 0) {
      const validProducts = products
        .filter(p => p.barcode && p.name)
        .map(p => CloudProductSchema.parse({
          barcode: p.barcode,
          name: p.name,
          category: p.category,
          supplier: p.supplier,
          supplierRut: p.supplierRut,
          price: p.price,
          unitsPerBox: p.unitsPerBox,
          syncStatus: p.syncStatus
        }));

      for (let i = 0; i < validProducts.length; i += BATCH_SIZE) {
        const batch = validProducts.slice(i, i + BATCH_SIZE);
        const targetTable = config?.productsTableName || "PRODUCTOS";
        
        const result = await supabaseSyncService.pushBatch(targetTable, batch);
        if (result.success) {
          productsCount += batch.length;
          // Marcar como sincronizados
          for (const p of batch) {
            await productRepository.markSynced(p.barcode);
          }
        } else {
          logger.error("CATALOG_SYNC_PRODUCTS", result.error);
          useSyncStore.getState().addIncident(targetTable, result.error || "Error");
        }
      }
    }

    // 2. sincronizar proveedores
    if (onProgress) onProgress("Sincronizando proveedores...");
    
    const { ProviderRepository } = await import('../../../repositories');
    const providers = await ProviderRepository.getAll();
    
    if (providers.length > 0) {
      const validProviders = providers
        .filter(p => p.rut && p.name)
        .map(p => CloudProviderSchema.parse({
          rut: p.rut,
          name: p.name,
          exchangePolicy: p.exchangePolicy,
          withdrawalDays: p.withdrawalDays,
          hasExchange: p.hasExchange,
          syncStatus: p.syncStatus
        }));

      for (let i = 0; i < validProviders.length; i += BATCH_SIZE) {
        const batch = validProviders.slice(i, i + BATCH_SIZE);
        const targetTable = config?.providersTableName || "PROVEEDORES";
        
        const result = await supabaseSyncService.pushBatch(targetTable, batch);
        if (result.success) {
          providersCount += batch.length;
          await ProviderRepository.markAsSynced(batch.map(p => p.rut));
        } else {
          logger.error("CATALOG_SYNC_PROVIDERS", result.error);
          useSyncStore.getState().addIncident(targetTable, result.error || "Error");
        }
      }
    }

    return { products: productsCount, providers: providersCount };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("CATALOG_SYNC_FAIL", errorMsg);
    useSyncStore.getState().addIncident('catalog', errorMsg);
    return { products: productsCount, providers: providersCount };
  }
}

/**
 * Importa productos desde la nube
 */
export async function executeProductImport(
  onProgress?: (msg: string) => void
): Promise<number> {
  const config = getSettings().cloudConfig;
  const targetTable = config?.productsTableName || "PRODUCTOS";

  if (onProgress) onProgress("Importando productos desde la nube...");

  try {
    const { data, error } = await supabase
      .from(targetTable)
      .select('*')
      .order('barcode');

    if (error) {
      logger.error("PRODUCT_IMPORT_ERROR", error.message);
      return 0;
    }

    if (data && data.length > 0) {
      const products: Product[] = data.map((row) => ({
        barcode: row.barcode as string,
        name: row.name as string,
        category: (row.category as string) || '',
        supplier: row.supplier as string | undefined,
        supplierRut: row.supplierRut as string | undefined,
        price: row.price as number | undefined,
        unitsPerBox: row.unitsPerBox as number | undefined,
        syncStatus: 'synced' as const
      }));

      await saveProductBatch(products);
      if (onProgress) onProgress(`Importados ${products.length} productos.`);
      return products.length;
    }

    return 0;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("PRODUCT_IMPORT_FAIL", errorMsg);
    return 0;
  }
}

/**
 * Importa proveedores desde la nube
 */
export async function executeProviderImport(
  onProgress?: (msg: string) => void
): Promise<number> {
  const config = getSettings().cloudConfig;
  const targetTable = config?.providersTableName || "PROVEEDORES";

  if (onProgress) onProgress("Importando proveedores desde la nube...");

  try {
    const { data, error } = await supabase
      .from(targetTable)
      .select('*')
      .order('rut');

    if (error) {
      logger.error("PROVIDER_IMPORT_ERROR", error.message);
      return 0;
    }

    if (data && data.length > 0) {
      const { ProviderRepository } = await import('../../../repositories');
      const providers: Provider[] = data.map((row) => ({
        rut: row.rut as string,
        name: row.name as string,
        exchangePolicy: row.exchangePolicy as string | undefined,
        withdrawalDays: row.withdrawalDays as number | undefined,
        hasExchange: row.hasExchange as boolean | undefined,
        syncStatus: 'synced' as const
      }));

      await ProviderRepository.saveBatch(providers);
      if (onProgress) onProgress(`Importados ${providers.length} proveedores.`);
      return providers.length;
    }

    return 0;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("PROVIDER_IMPORT_FAIL", errorMsg);
    return 0;
  }
}
