
import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline' | 'purging';

const CURRENT_APP_VERSION = "5.6.0"; 

export const InitializationService = {
    shouldSync: (): boolean => {
        const lastInit = localStorage.getItem('logicount_last_init_ts');
        if (!lastInit) return true;
        const thirtyMinutes = 30 * 60 * 1000;
        return (Date.now() - parseInt(lastInit)) > thirtyMinutes;
    },

    run: async (onStep: (step: InitStep) => void): Promise<void> => {
        try {
            onStep('version_check');
            const wasPurged = await InitializationService.maintenance(onStep);
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
            logger.error('INIT_CRITICAL', 'Fallo en arranque', error.message);
            onStep('ready');
        }
    },

    maintenance: async (onStep: (step: InitStep) => void): Promise<boolean> => {
        const storedVersion = localStorage.getItem('logicount_app_version');
        
        if (storedVersion !== CURRENT_APP_VERSION) {
            onStep('purging');
            try {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const reg of registrations) await reg.unregister();
                }
                localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
                window.location.reload();
                return true;
            } catch (e) {
                localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
                return false;
            }
        }
        return false;
    },

    syncConfig: async () => {
        const settings = getSettings();
        if (settings.appSheetConfig?.gasWebAppUrl) {
            const newConfig = await fetchSystemConfig();
            const updated = { ...settings, appSheetConfig: { ...settings.appSheetConfig, ...newConfig } };
            await saveSettings(updated);
        }
    },

    backgroundRefresh: async () => {
        try {
            await InitializationService.syncConfig();
            await importProductsFromAppSheet();
            localStorage.setItem('logicount_last_init_ts', Date.now().toString());
        } catch (e) {}
    }
};
