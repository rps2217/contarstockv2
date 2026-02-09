
import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';
import { localBrain } from './localBrain';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline';

const CURRENT_APP_VERSION = "5.5.1";

export const InitializationService = {
    shouldSync: (): boolean => {
        const lastInit = localStorage.getItem('logicount_last_init_ts');
        if (!lastInit) return true;
        const thirtyMinutes = 30 * 60 * 1000;
        return (Date.now() - parseInt(lastInit)) > thirtyMinutes;
    },

    /**
     * Protocolo de Arranque Senior:
     * Si hay datos locales, libera la UI primero. El mantenimiento es transparente.
     */
    run: async (onStep: (step: InitStep) => void): Promise<void> => {
        onStep('version_check');
        await InitializationService.maintenance();

        const hasLocalData = (await db.products.count()) > 0;

        // ESTRATEGIA: UI Primero
        if (hasLocalData) {
            onStep('ready'); // Liberamos al usuario inmediatamente
            if (InitializationService.shouldSync() && navigator.onLine) {
                // Sincronización silenciosa post-arranque
                InitializationService.backgroundRefresh();
            }
            return;
        }

        // Si es el primer inicio y no hay datos, forzamos espera
        try {
            if (!navigator.onLine) {
                onStep('offline');
                return;
            }
            onStep('config');
            await InitializationService.syncConfig();
            onStep('database');
            await importProductsFromAppSheet();
            localStorage.setItem('logicount_last_init_ts', Date.now().toString());
            onStep('ready');
        } catch (error: any) {
            logger.error('INIT_CRITICAL', 'Fallo en carga inicial forzada', error.message);
            onStep('ready'); 
        }
    },

    maintenance: async () => {
        const storedVersion = localStorage.getItem('logicount_app_version');
        if (storedVersion !== CURRENT_APP_VERSION) {
            const keysToKeep = ['logicount_auth', 'logicount_operator_id', 'logicount_settings', 'logicount_brain_installed'];
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('logicount_') && !keysToKeep.includes(key)) localStorage.removeItem(key);
            });
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                regs.forEach(r => r.update());
            }
            localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
        }
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
            console.log("[Init] Sincronización de fondo completada.");
        } catch (e) {
            console.warn("[Init] Refresco silencioso falló, se reintentará luego.");
        }
    }
};
