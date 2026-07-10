/**
 * Compatibility exports para funciones legacy de importacion
 * 
 * Estas funciones fueron movidas a unified/ pero mantenemos la API
 * para no romper codigo existente.
 */

import { unifiedSyncEngine } from './unified';
import { db } from '../../db';
import { logger } from '../logger';

/**
 * Importa productos desde la nube
 */
export async function importProductsFromCloud(): Promise<number> {
  try {
    logger.info('IMPORT', 'Importing products from cloud...');
    const result = await unifiedSyncEngine.pullTable('products');
    return result.added + result.updated;
  } catch (error) {
    logger.error('IMPORT', 'Failed to import products', error);
    throw error;
  }
}

/**
 * Importa proveedores desde la nube
 */
export async function importProvidersFromCloud(): Promise<number> {
  try {
    logger.info('IMPORT', 'Importing providers from cloud...');
    const result = await unifiedSyncEngine.pullTable('providers');
    return result.added + result.updated;
  } catch (error) {
    logger.error('IMPORT', 'Failed to import providers', error);
    throw error;
  }
}

/**
 * Importa clientes y plantillas desde la nube
 */
export async function importCustomersAndTemplatesFromCloud(): Promise<number> {
  try {
    logger.info('IMPORT', 'Importing customers and templates...');
    const customersResult = await unifiedSyncEngine.pullTable('customers');
    return customersResult.added + customersResult.updated;
  } catch (error) {
    logger.error('IMPORT', 'Failed to import customers', error);
    throw error;
  }
}
