/**
 * DatabaseBootstrap - Inicialización de la base de datos IndexedDB
 */

import { db } from '../../db';
import { recoverFromEmergencySnapshot } from '../backupService';
import { logger } from '../logger';

const DB_BOOTSTRAP_RETRIES = 5;
const DB_BOOTSTRAP_DELAY_MS = 500;

export interface DatabaseBootstrapResult {
  success: boolean;
  sessionCount: number;
  isFirstLaunch: boolean;
  recoveredFromSnapshot: boolean;
}

/**
 * Asegura que la base de datos IndexedDB esté disponible y lista
 */
export const bootstrapDatabase = async (): Promise<DatabaseBootstrapResult> => {
  let dbReady = false;
  let attempts = 0;
  
  while (!dbReady && attempts < DB_BOOTSTRAP_RETRIES) {
    try {
      await (db as any).open();
      dbReady = true;
      logger.info('INIT_DB', `Database opened successfully on attempt ${attempts + 1}`);
    } catch (e) {
      attempts++;
      logger.warn('INIT_DB' as any, "" as any, e);
      if (attempts < DB_BOOTSTRAP_RETRIES) {
        await new Promise(r => setTimeout(r, DB_BOOTSTRAP_DELAY_MS));
      }
    }
  }

  if (!dbReady) {
    throw new Error(`Failed to open database after ${DB_BOOTSTRAP_RETRIES} attempts`);
  }

  const sessionCount = await db.sessions.count();
  const isFirstLaunch = sessionCount === 0;
  let recoveredFromSnapshot = false;

  if (isFirstLaunch) {
    logger.info('INIT_DB', 'First launch detected, attempting recovery from emergency snapshot');
    try {
      await recoverFromEmergencySnapshot();
      recoveredFromSnapshot = true;
      logger.success('INIT_DB', 'Recovered from emergency snapshot');
    } catch (e) {
      logger.warn('INIT_DB', 'No emergency snapshot found or recovery failed' as any, "" as any, e);
    }
  }

  return {
    success: true,
    sessionCount,
    isFirstLaunch,
    recoveredFromSnapshot
  };
};

/**
 * Verifica si la base de datos necesita sincronización inicial
 */
export const needsInitialSync = async (): Promise<boolean> => {
  const productCount = await db.products.count();
  return productCount < 10;
};
