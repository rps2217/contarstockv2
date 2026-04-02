import { logger } from './logger';
import { importProductsFromFirestore, importProvidersFromFirestore } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';
import { sanitizeBarcode, normalizeSku } from '../services/utils';
import { recoverFromEmergencySnapshot } from './backupService';
import { HydrationService } from './hydrationService';
import { firebaseSyncService } from './firebaseSyncService';
import { auth } from '../src/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline' | 'purging' | 'migrating';

const CURRENT_APP_VERSION = "5.8.0"; // Incremento de versión para migración Firebase completa

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
          await (db as any).open();
          dbReady = true;
        } catch (e) {
          attempts++;
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (dbReady) {
        // RECUPERACIÓN DE EMERGENCIA: Si la DB está vacía pero hay snapshot en localStorage
        const sessionCount = await db.sessions.count();
        if (sessionCount === 0) {
          const recovered = await recoverFromEmergencySnapshot();
          if (recovered) {
            logger.success('SYSTEM', 'Datos recuperados desde snapshot de emergencia.');
          }
        }
      }

      // Tareas de saneamiento y carga inicial (Optimizado para memoria y robustez)
      const sanitizeTask = async () => {
        try {
          // Obtenemos solo las llaves primarias primero para evitar cargar objetos pesados en memoria
          const allBarcodes = await db.products.toCollection().primaryKeys();
          
          const CHUNK_SIZE = 500;
          for (let i = 0; i < allBarcodes.length; i += CHUNK_SIZE) {
            const chunk = allBarcodes.slice(i, i + CHUNK_SIZE);
            const products = await db.products.where('barcode').anyOf(chunk).toArray();
            
            const productUpdates = products
              .filter(p => normalizeSku(p.barcode) !== p.barcode)
              .map(p => ({ ...p, barcode: normalizeSku(p.barcode) }));

            if (productUpdates.length > 0) {
              // Si el barcode cambió, el bulkPut creará un nuevo registro. 
              // Debemos borrar los antiguos para evitar duplicados "sucios"
              const oldBarcodes = products
                .filter(p => normalizeSku(p.barcode) !== p.barcode)
                .map(p => p.barcode);
                
              await db.transaction('rw', db.products, async () => {
                await db.products.bulkDelete(oldBarcodes);
                await db.products.bulkPut(productUpdates);
              });
            }
          }

          // Lo mismo para proveedores (suelen ser pocos, pero por consistencia)
          const providers = await db.providers.toArray();
          const providerUpdates = providers
            .filter(prov => normalizeSku(prov.rut) !== prov.rut)
            .map(prov => ({ ...prov, rut: normalizeSku(prov.rut) }));

          if (providerUpdates.length > 0) {
            await db.providers.bulkPut(providerUpdates);
          }
        } catch (e) {
          logger.warn('INIT', 'Error en saneamiento de datos', e);
        }
      };

      // Ejecutar saneamiento en segundo plano si ya hay datos
      const productCount = await db.products.count();
      const hasLocalData = productCount >= 10;

      if (hasLocalData) {
        onStep('ready');
        // Ejecutar tareas de mantenimiento y refresco en paralelo sin bloquear el inicio
        Promise.all([
          sanitizeTask(),
          InitializationService.backgroundRefresh()
        ]).catch(e => logger.warn('INIT', 'Error en tareas de fondo', e));
        return;
      }

      // Si no hay datos locales, carga obligatoria secuencial/paralela controlada
      if (!navigator.onLine) {
        onStep('offline');
        setTimeout(() => onStep('ready'), 2000);
        return;
      }

      onStep('config');
      await InitializationService.syncConfig();
      
      onStep('database');
      // Paralelizar importación de productos y proveedores desde Firestore
      await Promise.all([
        importProductsFromFirestore(),
        importProvidersFromFirestore(),
        sanitizeTask()
      ]);
      
      onStep('ready');
      await HydrationService.persist();

    } catch (error: any) {
      logger.error('INIT_CRITICAL', 'Fallo en secuencia de arranque', error.message);
      onStep('ready'); // Fallback: permitir entrada a la app aunque falle el sync inicial
    }
  },

  syncConfig: async () => {
    try {
      // Esperar un poco a que Firebase Auth intente conectar, pero no bloquear
      if (!auth.currentUser) {
        await new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
              unsubscribe();
              resolve(user);
            }
          });
          // Timeout corto de 2 segundos
          setTimeout(() => {
            unsubscribe();
            resolve(null);
          }, 2000);
        });
      }

      const settings = getSettings();
      // Intentar sincronizar configuración desde Firestore
      const response = await firebaseSyncService.pullBatch('CONFIG_SISTEMA');
      if (response.success && response.rows && response.rows.length > 0) {
        const cloudConfig = response.rows[0];
        const updated = { 
          ...settings, 
          appSheetConfig: { 
            ...settings.appSheetConfig, 
            ...cloudConfig 
          } 
        };
        await saveSettings(updated);
        logger.success('INIT', 'Configuración sincronizada desde Firestore');
      }
    } catch (e) {
      logger.warn('INIT', 'Error sincronizando configuración', e);
    }
  },

  backgroundRefresh: async () => {
    try {
      // Refresco en paralelo
      await Promise.all([
        InitializationService.syncConfig(),
        importProductsFromFirestore(),
        importProvidersFromFirestore(),
        HydrationService.persist()
      ]);
    } catch (e) {
      logger.warn('INIT', 'Error en refresco de fondo', e);
    }
  }
};
