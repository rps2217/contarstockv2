/**
 * InitializationService - Orquestador de inicialización
 * 
 * REFACTORIZADO: Ahora usa módulos separados para cada responsabilidad:
 * - VersionChecker: Verificación de versión
 * - DatabaseBootstrap: Inicialización de IndexedDB
 * - DataImporter: Importación de datos
 * - ConfigSynchronizer: Sincronización de configuración
 */

import { logger } from './logger';
import { HydrationService } from './hydrationService';
import { purgeOldData } from './maintenance';
import { db } from '../db';
import { normalizeSku } from '../services/utils';
import { AppMaintenanceService } from './maintenanceService';

// Módulos de inicialización
import { 
  checkVersion, 
  bootstrapDatabase, 
  needsInitialSync,
  importInitialData, 
  sanitizeDatabase,
  syncConfig,
  type InitStep 
} from './initialization';

export type { InitStep };
export { InitializationService };

/**
 * Pasos de inicialización
 */
export type InitStepState = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline' | 'purging' | 'migrating';

const InitializationService = {
  /**
   * Secuencia de Arranque Maestra
   * 
   * Flujo:
   * 1. Version check
   * 2. Database bootstrap
   * 3. Si productos suficientes → ready (background refresh)
   * 4. Si offline → ready (modo offline)
   * 5. Sync config + Import data
   * 6. Ready
   */
  run: async (onStep: (step: InitStep) => void): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // 1. Version check
      const versionResult = await checkVersion((step) => onStep(step));
      if (versionResult.wasUpdated) {
        logger.info('INIT', 'App was updated, skipping full initialization');
        return;
      }

      // 2. Database bootstrap
      const dbResult = await bootstrapDatabase();
      logger.info('INIT', `Database ready: ${dbResult.sessionCount} sessions, firstLaunch: ${dbResult.isFirstLaunch}`);

      // 3. Verificar si necesita sync inicial
      const needsSync = await needsInitialSync();
      
      if (!needsSync) {
        logger.info('INIT', 'Products already synced, skipping initial import');
        onStep('ready');
        InitializationService.backgroundRefresh();
        return;
      }

      // 4. Modo offline
      if (!navigator.onLine) {
        logger.warn('INIT', 'Offline mode, skipping cloud sync');
        onStep('offline');
        setTimeout(() => onStep('ready'), 2000);
        return;
      }

      // 5. Sync config
      onStep('config');
      await syncConfig();
      
      // 6. Import initial data
      await importInitialData((step) => onStep(step));
      
      // 7. Done
      onStep('ready');
      await HydrationService.persist();
      
      const duration = Date.now() - startTime;
      logger.success('INIT', `Initialization complete in ${duration}ms`);
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('INIT_CRITICAL', `Initialization failed: ${message}`);
      onStep('ready'); // Siempre marcar como ready para no bloquear la UI
    }
  },

  /**
   * Sincroniza configuración con la nube
   */
  syncConfig: syncConfig,

  /**
   * Refresco en segundo plano
   * Se ejecuta después de que la app está lista
   */
  backgroundRefresh: async (): Promise<void> => {
    try {
      logger.info('INIT_BG', 'Starting background refresh');
      
      await Promise.all([
        syncConfig(),
        importInitialData(),
        HydrationService.persist(),
        purgeOldData(30), // Archivado automático > 30 días
        sanitizeDatabase()
      ]);
      
      logger.success('INIT_BG', 'Background refresh complete');
    } catch (e) {
      logger.warn('INIT_BG', 'Background refresh failed' as any, "" as any, e);
    }
  }
};


