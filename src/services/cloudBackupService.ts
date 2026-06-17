import { db } from '../db';
import { logger } from './logger';
import { handleError, ServiceError } from './types';
import { getSettings } from './settings';
import { supabaseSyncService } from './supabaseSyncService';

const UPLOAD_BATCH_SIZE = 500;

/**
 * RESPALDO MAESTRO: Sube todos los productos locales a Supabase
 */
export const backupProductsToSupabase = async (onProgress?: (msg: string) => void): Promise<number> => {
  try {
    if (onProgress) onProgress("Obteniendo productos locales...");
    const products = await db.products.toArray();
    
    if (products.length === 0) {
      if (onProgress) onProgress("No hay productos locales para respaldar.");
      return 0;
    }

    const config = getSettings().cloudConfig;
    const tableName = config?.productsTableName || "PRODUCTOS";
    
    if (onProgress) onProgress(`Preparando ${products.length} productos para subir...`);
    
    const totalBatches = Math.ceil(products.length / UPLOAD_BATCH_SIZE);
    let totalUploaded = 0;

    for (let i = 0; i < totalBatches; i++) {
      const chunk = products.slice(i * UPLOAD_BATCH_SIZE, (i + 1) * UPLOAD_BATCH_SIZE);
      if (onProgress) onProgress(`Subiendo lote de productos ${i + 1}/${totalBatches}...`);
      
      const rows = chunk.map(p => ({
        barcode: p.barcode,
        name: p.name,
        category: p.category || 'GENERAL',
        supplier: p.supplier || '',
        supplier_rut: p.supplierRut || '',
        price: p.price || 0,
        units_per_box: p.unitsPerBox || 1,
        timestamp: new Date().toISOString()
      }));

      const result = await supabaseSyncService.pushBatch(tableName, rows);
      if (!result.success) throw new Error(result.error);
      totalUploaded += chunk.length;
    }

    return totalUploaded;
  } catch (err: unknown) {
    const error = handleError(err, 'BACKUP_PRODUCTS_FAIL');
    logger.error("BACKUP_PRODUCTS_FAIL", error.message);
    throw new ServiceError(error.message, 'BACKUP_PRODUCTS_FAIL');
  }
};

/**
 * RESPALDO MAESTRO: Sube todos los proveedores locales a Supabase
 */
export const backupProvidersToSupabase = async (onProgress?: (msg: string) => void): Promise<number> => {
  try {
    if (onProgress) onProgress("Obteniendo proveedores locales...");
    const providers = await db.providers.toArray();
    
    if (providers.length === 0) {
      if (onProgress) onProgress("No hay proveedores locales para respaldar.");
      return 0;
    }

    const config = getSettings().cloudConfig;
    const tableName = config?.providersTableName || "PROVEEDORES";
    
    if (onProgress) onProgress(`Subiendo ${providers.length} proveedores...`);
    
    const rows = providers.map(p => ({
      rut: p.rut,
      name: p.name,
      withdrawal_days: p.withdrawalDays || 0,
      has_exchange: p.hasExchange || false,
      timestamp: new Date().toISOString()
    }));

    const result = await supabaseSyncService.pushBatch(tableName, rows);
    if (!result.success) throw new Error(result.error);
        return providers.length;
  } catch (err: unknown) {
    const error = handleError(err, 'BACKUP_PROVIDERS_FAIL');
    logger.error("BACKUP_PROVIDERS_FAIL", error.message);
    throw new ServiceError(error.message, 'BACKUP_PROVIDERS_FAIL');
  }
};
