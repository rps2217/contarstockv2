import { logger } from './logger';
import { importProductsFromCloud, importProvidersFromCloud, importCustomersAndTemplatesFromCloud } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';
import { normalizeSku } from '../services/utils';
import { recoverFromEmergencySnapshot } from './backupService';
import { HydrationService } from './hydrationService';
import { supabaseSyncService } from './supabaseSyncService';
import { purgeOldData } from './maintenance';
import { AppMaintenanceService } from './maintenanceService';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline' | 'purging' | 'migrating';

const CURRENT_APP_VERSION = "5.8.1"; 

// Umbral mínimo de productos para considerar que el catálogo está "completo"
// Si hay menos de este número, se fuerza un sync completo
const MIN_PRODUCTS_THRESHOLD = 300;

export const InitializationService = {
  /**
  * Secuencia de Arranque Maestra
  */
  run: async (onStep: (step: InitStep) => void): Promise<void> => {
    try {
      onStep('version_check');
      const wasUpdated = await AppMaintenanceService.checkVersion(CURRENT_APP_VERSION, onStep);
      if (wasUpdated) return;

      // Semáforo de Base de Datos: Esperar a que IndexedDB esté disponible
      let dbReady = false;
      let attempts = 0;
      while (!dbReady && attempts < 5) {
        try {
          await (db as any).open();
          dbReady = true;
        } catch (e) {
          attempts++;
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (dbReady) {
        const sessionCount = await db.sessions.count();
        if (sessionCount === 0) {
          await recoverFromEmergencySnapshot();
        }
      }

      // Tareas de saneamiento y carga inicial
      const sanitizeTask = async () => {
        try {
          const { DatabaseSanitizer } = await import('../repositories/DatabaseSanitizer');
          await DatabaseSanitizer.runAuditAndSanitize();
        } catch (e) {
          logger.warn('INIT', 'Fallo saneamiento', e);
        }
      };

      const productCount = await db.products.count();
      logger.info('INIT', `Productos en IndexedDB: ${productCount}`);
      
      // Si hay suficientes productos, hacer sync incremental
      if (productCount >= MIN_PRODUCTS_THRESHOLD) {
        logger.info('INIT', `Catálogo de productos parece completo (${productCount} items), usando sync incremental`);
        onStep('ready');
        InitializationService.backgroundRefresh();
        return;
      }

      // Si hay pocos productos o threshold no alcanzado, hacer sync completo
      if (productCount >= 10) {
        logger.info('INIT', `Catálogo incompleto (${productCount} items < ${MIN_PRODUCTS_THRESHOLD}), forzando sync completo`);
        onStep('database');
        await Promise.all([
          importProductsFromCloud(true), // forceFullSync = true
          importProvidersFromCloud(true),
          importCustomersAndTemplatesFromCloud(),
          sanitizeTask()
        ]);
        onStep('ready');
        await HydrationService.persist();
        return;
      }

      // Primera vez o sin productos: descarga inicial completa
      if (!navigator.onLine) {
        onStep('offline');
        setTimeout(() => onStep('ready'), 2000);
        return;
      }

      onStep('config');
      await InitializationService.syncConfig();
      
      onStep('database');
      await Promise.all([
        importProductsFromCloud(true), // forceFullSync = true en primera carga
        importProvidersFromCloud(true),
        importCustomersAndTemplatesFromCloud(),
        sanitizeTask()
      ]);
      
      onStep('ready');
      await HydrationService.persist();
    } catch (error: any) {
      logger.error('INIT_CRITICAL', 'Fallo arranque', error.message);
      onStep('ready');
    }
  },

  /**
   * Fuerza una resincronización completa del catálogo de productos
   * Útil cuando se sospecha que los datos están incompletos
   */
  forceFullProductSync: async (): Promise<{ products: number; providers: number }> => {
    logger.info('INIT', 'Forzando resincronización completa del catálogo');
    
    // Limpiar checkpoints
    try {
      await db.settings.delete('lastSync_PRODUCTOS');
      await db.settings.delete('lastSync_PROVEEDORES');
      localStorage.removeItem('last_sync_PRODUCTOS');
      localStorage.removeItem('last_sync_PROVEEDORES');
    } catch (e) {
      logger.warn('INIT', 'Error limpiando checkpoints', e);
    }
    
    // Descargar todo nuevamente
    const [products, providers] = await Promise.all([
      importProductsFromCloud(true),
      importProvidersFromCloud(true)
    ]);
    
    logger.info('INIT', `Resincronización completa: ${products} productos, ${providers} proveedores`);
    return { products, providers };
  },

  syncConfig: async () => {
    try {
      const settings = getSettings();
      // Intentar sincronizar configuración desde la nube
      const response = await supabaseSyncService.pullBatch('CONFIG_SISTEMA');
      if (response.success && response.rows && response.rows.length > 0) {
        const cloudConfig = response.rows[0];
        const updated = { 
          ...settings, 
          cloudConfig: { 
            ...settings.cloudConfig, 
            ...cloudConfig 
          } 
        };
        await saveSettings(updated);
        logger.success('INIT', 'Configuración sincronizada desde la nube');
      }
    } catch (e) {
      logger.warn('INIT', 'Error sincronizando configuración', e);
    }
  },

  backgroundRefresh: async () => {
    try {
      // Refresco en paralelo y archivado automático
      const { DatabaseSanitizer } = await import('../repositories/DatabaseSanitizer');
      
      await Promise.all([
        InitializationService.syncConfig(),
        importProductsFromCloud(),
        importProvidersFromCloud(),
        importCustomersAndTemplatesFromCloud(),
        HydrationService.persist(),
        purgeOldData(30), // Step 5: Archivado automático > 30 días
        DatabaseSanitizer.runAuditAndSanitize()
      ]);
    } catch (e) {
      logger.warn('INIT', 'Error en refresco de fondo', e);
    }
  }
};

// Alias para compatibilidad con código existente que usa initializationService
export const initializationService = InitializationService;

