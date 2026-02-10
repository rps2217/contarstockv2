
import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';
import { localBrain } from './localBrain';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline' | 'purging';

const CURRENT_APP_VERSION = "5.6.0"; // Bumping para forzar mantenimiento

export const InitializationService = {
    shouldSync: (): boolean => {
        const lastInit = localStorage.getItem('logicount_last_init_ts');
        if (!lastInit) return true;
        const thirtyMinutes = 30 * 60 * 1000;
        return (Date.now() - parseInt(lastInit)) > thirtyMinutes;
    },

    /**
     * Ejecuta el arranque profesional del sistema.
     */
    run: async (onStep: (step: InitStep) => void): Promise<void> => {
        try {
            onStep('version_check');
            const wasPurged = await InitializationService.maintenance(onStep);

            // Si se purgó, el navegador se recargará, así que cortamos ejecución
            if (wasPurged) return;

            const hasLocalData = (await db.products.count()) > 0;

            if (hasLocalData) {
                onStep('ready'); 
                if (InitializationService.shouldSync() && navigator.onLine) {
                    InitializationService.backgroundRefresh();
                }
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
            
            localStorage.setItem('logicount_last_init_ts', Date.now().toString());
            onStep('ready');

        } catch (error: any) {
            logger.error('INIT_CRITICAL', 'Fallo en flujo de arranque', error.message);
            onStep('ready');
        }
    },

    /**
     * Protocolo de Purga Profunda (Deep Purge)
     * Elimina CacheStorage, Service Workers y limpia localStorage obsoleto.
     */
    maintenance: async (onStep: (step: InitStep) => void): Promise<boolean> => {
        const storedVersion = localStorage.getItem('logicount_app_version');
        
        if (storedVersion !== CURRENT_APP_VERSION) {
            console.warn(`[Kernel] Mismatch de versión detectado: ${storedVersion} -> ${CURRENT_APP_VERSION}`);
            onStep('purging');

            try {
                // 1. Purga de Cache Storage (Archivos estáticos PWA)
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log("[Kernel] Cache Storage eliminado.");
                }

                // 2. Desregistro forzado de Service Workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) {
                        await reg.unregister();
                    }
                    console.log("[Kernel] Service Workers desregistrados.");
                }

                // 3. Limpieza selectiva de LocalStorage
                const keysToKeep = [
                    'logicount_auth', 
                    'logicount_operator_id', 
                    'logicount_settings',
                    'logicount_brain_installed'
                ];
                
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('logicount_') && !keysToKeep.includes(key)) {
                        localStorage.removeItem(key);
                    }
                });

                // Actualizar marcador de versión
                localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
                
                // 4. Hard Reload para cargar el nuevo bundle sin caché
                console.log("[Kernel] Purga completada. Reiniciando entorno...");
                window.location.reload();
                return true;

            } catch (e) {
                console.error("[Kernel] Error durante la purga:", e);
                localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
                return false;
            }
        }
        return false;
    },

    syncConfig: async () => {
        try {
            const settings = getSettings();
            if (settings.appSheetConfig?.gasWebAppUrl) {
                const newConfig = await fetchSystemConfig();
                const updated = { ...settings, appSheetConfig: { ...settings.appSheetConfig, ...newConfig } };
                await saveSettings(updated);
            }
        } catch (e) {
            console.warn("[Init] Falló sincronización de config, se usará caché.");
        }
    },

    backgroundRefresh: async () => {
        try {
            await InitializationService.syncConfig();
            await importProductsFromAppSheet();
            localStorage.setItem('logicount_last_init_ts', Date.now().toString());
            console.log("[Kernel] Refresco de fondo silencioso completado.");
        } catch (e) {
            console.warn("[Kernel] Sincronización silenciosa pospuesta.");
        }
    }
};
