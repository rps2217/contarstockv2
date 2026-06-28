/**
 * VersionChecker - Verificación de versión de la aplicación
 */

import { AppMaintenanceService } from '../maintenanceService';
import { CURRENT_APP_VERSION, InitStepCallback } from './types';
import { logger } from '../logger';

export interface VersionCheckResult {
  wasUpdated: boolean;
  currentVersion: string;
}

/**
 * Verifica si la aplicación fue actualizada desde la última ejecución
 */
export const checkVersion = async (
  onProgress?: InitStepCallback
): Promise<VersionCheckResult> => {
  try {
    onProgress?.('version_check');
    const wasUpdated = await AppMaintenanceService.checkVersion(CURRENT_APP_VERSION, onProgress as (step: string) => void);
    
    logger.info('INIT_VERSION', `App version: ${CURRENT_APP_VERSION}, Was updated: ${wasUpdated}`);
    
    return {
      wasUpdated,
      currentVersion: CURRENT_APP_VERSION
    };
  } catch (error) {
    logger.warn('INIT_VERSION', 'Error checking version', error);
    // No fallar la inicialización por errores de version check
    return {
      wasUpdated: false,
      currentVersion: CURRENT_APP_VERSION
    };
  }
};
