/**
 * ConfigSynchronizer - Sincronización de configuración con la nube
 *
 * NOTA: CONFIG_SISTEMA fue eliminado - la tabla no existe en Supabase
 * y no es necesaria para el funcionamiento de la app.
 * Los nombres de tablas se configuran directamente en el código.
 */

import { logger } from '../logger';

export interface ConfigSyncResult {
  success: boolean;
  configUpdated: boolean;
}

/**
 * Sincroniza la configuración local con la nube
 *
 * @deprecated CONFIG_SISTEMA fue eliminado. Esta función ahora es un no-op.
 */
export const syncConfig = async (): Promise<ConfigSyncResult> => {
  // CONFIG_SISTEMA no existe - no hay nada que sincronizar
  logger.info('INIT_CONFIG', 'Config sync skipped (CONFIG_SISTEMA removed)');
  return { success: true, configUpdated: false };
};
