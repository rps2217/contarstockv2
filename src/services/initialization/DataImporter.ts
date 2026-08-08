/**
 * DataImporter - Importación de datos iniciales desde la nube
 */

import { 
  importProductsFromCloud, 
  importProvidersFromCloud, 
  importCustomersAndTemplatesFromCloud 
} from '../sync';
import { DatabaseSanitizer } from '../../repositories/DatabaseSanitizer';
import { logger } from '../logger';
import { InitStepCallback } from './types';

export interface DataImportResult {
  products: number;
  providers: number;
  customers: number;
  sanitized: boolean;
}

/**
 * Importa datos iniciales desde la nube
 */
export const importInitialData = async (
  onProgress?: InitStepCallback
): Promise<DataImportResult> => {
  onProgress?.('database');
  
  let products = 0;
  let providers = 0;
  let customers = 0;
  let sanitized = false;

  try {
    // Ejecutar tareas en paralelo
    const [productsResult, providersResult] = await Promise.all([
      importProductsFromCloud().catch(e => {
        logger.warn('INIT_DATA', 'Products import failed', e);
        return 0;
      }),
      importProvidersFromCloud().catch(e => {
        logger.warn('INIT_DATA', 'Providers import failed', e);
        return 0;
      })
    ]);

    products = productsResult || 0;
    providers = providersResult || 0;

    // Clientes y plantillas en paralelo
    await Promise.all([
      importCustomersAndTemplatesFromCloud().catch(e => {
        logger.warn('INIT_DATA', 'Customers import failed', e);
      })
    ]);

    // Sanitización de la base de datos
    try {
      await DatabaseSanitizer.runAuditAndSanitize();
      sanitized = true;
    } catch (e) {
      logger.warn('INIT_DATA', 'Database sanitization failed', e);
    }

    logger.success('INIT_DATA', `Imported: ${products} products, ${providers} providers`);

    return {
      products,
      providers,
      customers,
      sanitized
    };
  } catch (error) {
    logger.error('INIT_DATA', 'Critical error during data import', error);
    throw error;
  }
};

/**
 * Ejecuta solo la sanitización de la base de datos
 */
export const sanitizeDatabase = async (): Promise<boolean> => {
  try {
    await DatabaseSanitizer.runAuditAndSanitize();
    return true;
  } catch (e) {
    logger.warn('INIT_DATA', 'Sanitization failed', e);
    return false;
  }
};
