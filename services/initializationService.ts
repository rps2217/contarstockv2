
import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline' | 'purging';

const CURRENT_APP_VERSION = "5.6.5"; // Actualizado para forzar limpieza

export const InitializationService = {
    /**
     * Protocolo de Purga Profunda (Deep Purge)
     * Elimina CacheStorage y Service Workers para asegurar código fresco.
     */
    runMaintenance: async (onStep: (step: InitStep) => void): Promise<boolean> => {
        const storedVersion = localStorage.getItem('logicount_app_version');
        
        // Si no hay versión o es distinta, realizamos purga total
        if (!storedVersion || storedVersion !== CURRENT_APP_VERSION) {
            onStep('purging');
            logger.info('Kernel', 'Detectada nueva versión o cache corrupto. Iniciando purga...');

            try {
                // 1. Limpiar todos los caches de la PWA
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                }

                // 2. Desregistrar Service Workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) {
                        await reg.unregister();
                    }
                }

                // 3. Limpiar almacenamiento de sesión
                sessionStorage.clear();
                
                localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
                
                // Forzar recarga desde el servidor (rompiendo cache)
                logger.success('Kernel', 'Purga completada. Reiniciando entorno...');
                window.location.reload();
                return true;
            } catch (e) {
                console.error("Purge failed", e);
                localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
                return false;
            }
        }
        return false;
    },

    run: async (onStep: (step: InitStep) => void): Promise<void> => {
        try {
            onStep('version_check');
            
            // Ejecutar mantenimiento primero
            const wasPurged = await InitializationService.runMaintenance(onStep);
            if (wasPurged) return; // Detener flujo, la página se está recargando

            const hasLocalData = (await db.products.count()) > 0;

            if (hasLocalData) {
                onStep('ready'); 
                // Refresco silencioso en background si hay red
                if (navigator.onLine) {
                    InitializationService.backgroundRefresh();
                }
                return;
            }

            // Si no hay datos locales y está offline, avisar
            if (!navigator.onLine) {
                onStep('offline');
                setTimeout(() => onStep('ready'), 3000);
                return;
            }

            // Carga inicial completa
            onStep('config');
            await InitializationService.syncConfig();
            onStep('database');
            await importProductsFromAppSheet();
            localStorage.setItem('logicount_last_init_ts', Date.now().toString());
            onStep('ready');

        } catch (error: any) {
            logger.error('INIT_CRITICAL', 'Fallo en arranque', error.message);
            onStep('ready');
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
        } catch (e) {}
    }
};
