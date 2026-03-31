import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet, importProvidersFromCloud } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';
import { migrationService } from './migrationService';
import { sanitizeBarcode, normalizeSku } from '../services/utils';
import { recoverFromEmergencySnapshot } from './backupService';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline' | 'purging' | 'migrating';

const CURRENT_APP_VERSION = "5.7.9"; // Incremento de versión para forzar limpieza estructural estable

export const InitializationService = {
  /**
  * Gestión de ciclo de vida del Software. 
  * Si la versión cambia, limpia bultos antiguos pero preserva el catálogo si es posible.
  */
  runMaintenance: async (onStep: (step: InitStep) => void): Promise<boolean> => {
    const storedVersion = localStorage.getItem('logicount_app_version');
    
    if (storedVersion !== CURRENT_APP_VERSION) {
      onStep('purging');
      try {
        // 1. Limpieza de Caché de Aplicación (PWA)
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }

        // 2. Desregistrar SWs para asegurar que el nuevo Kernel tome el control
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) await reg.unregister();
        }

        // 3. Reset de estado operativo (Preservando Identidad)
        const auth = localStorage.getItem('logicount_auth');
        const opId = localStorage.getItem('logicount_operator_id');
        const sets = localStorage.getItem('logicount_settings');
        
        localStorage.clear();
        
        if (auth) localStorage.setItem('logicount_auth', auth);
        if (opId) localStorage.setItem('logicount_operator_id', opId);
        if (sets) localStorage.setItem('logicount_settings', sets);
        
        localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
        
        // Forzar recarga limpia para aplicar esquema Dexie v23
        window.location.reload();
        return true;
      } catch (e) {
        localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
        return false;
      }
    }
    return false;
  },

  /**
  * Secuencia de Arranque Maestra
  */
  run: async (onStep: (step: InitStep) => void): Promise<void> => {
    try {
      onStep('version_check');
      const wasPurged = await InitializationService.runMaintenance(onStep);
      if (wasPurged) return;

      // Semáforo de Base de Datos: Esperar a que IndexedDB esté disponible
      let dbReady = false;
      let attempts = 0;
      while (!dbReady && attempts < 5) {
        try {
          // FIX: Added cast to any to resolve property 'open' access on Dexie instance
          await (db as any).open();
          dbReady = true;
        } catch (e) {
          attempts++;
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Ejecutar migración al nuevo motor si hay datos en la tabla antigua
      if (dbReady) {
        const oldDataCount = await db.cloudExpirations.count();
        if (oldDataCount > 0) {
          onStep('migrating');
          await migrationService.migrateCloudExpirationsToDynamic();
        }

        // RECUPERACIÓN DE EMERGENCIA: Si la DB está vacía pero hay snapshot en localStorage
        const sessionCount = await db.sessions.count();
        if (sessionCount === 0) {
          const recovered = await recoverFromEmergencySnapshot();
          if (recovered) {
            logger.success('SYSTEM', 'Datos recuperados desde snapshot de emergencia.');
          }
        }
      }

      const sanitizeExistingData = async () => {
        try {
          const products = await db.products.toArray();
          const providers = await db.providers.toArray();
          for (const p of products) {
            const sanitized = normalizeSku(p.barcode);
            if (sanitized !== p.barcode) {
              await db.products.delete(p.barcode);
              await db.products.put({ ...p, barcode: sanitized });
            }
          }
          for (const prov of providers) {
            const sanitized = normalizeSku(prov.rut);
            if (sanitized !== prov.rut) {
              await db.providers.delete(prov.rut);
              await db.providers.put({ ...prov, rut: sanitized });
            }
          }
        } catch (e) {}
      };

      await sanitizeExistingData();

      const productCount = await db.products.count();
      const hasLocalData = productCount > 0;

      if (hasLocalData && productCount >= 10) {
        onStep('ready'); 
        if (navigator.onLine) InitializationService.backgroundRefresh();
        return;
      }

      if (!navigator.onLine) {
        onStep('offline');
        setTimeout(() => onStep('ready'), 2000);
        return;
      }

      onStep('config');
      await InitializationService.syncConfig();
      onStep('database');
      await importProductsFromAppSheet();
      await importProvidersFromCloud();
      onStep('ready');

    } catch (error: any) {
      logger.error('INIT_CRITICAL', 'Fallo en secuencia de arranque', error.message);
      onStep('ready'); // Fallback: permitir entrada a la app aunque falle el sync inicial
    }
  },

  syncConfig: async () => {
    try {
      const settings = getSettings();
      if (settings.appSheetConfig?.gasWebAppUrl) {
        const newConfig = await fetchSystemConfig();
        const updated = { ...settings, appSheetConfig: { ...settings.appSheetConfig, ...newConfig } };
        await saveSettings(updated);
      }
    } catch (e) {}
  },

  backgroundRefresh: async () => {
    try {
      await InitializationService.syncConfig();
      await importProductsFromAppSheet();
      await importProvidersFromCloud();
    } catch (e) {}
  }
};
