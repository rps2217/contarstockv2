
import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';
import { localBrain } from './localBrain';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline';

const CURRENT_APP_VERSION = "5.5.2";

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
            // 1. Mantenimiento Preventivo (Cache y SW)
            onStep('version_check');
            await InitializationService.maintenance();

            // 2. Verificar datos mínimos locales
            const hasLocalData = (await db.products.count()) > 0;

            // ESTRATEGIA: UI Primero si ya tenemos datos
            if (hasLocalData) {
                onStep('ready'); // Liberamos al usuario
                if (InitializationService.shouldSync() && navigator.onLine) {
                    InitializationService.backgroundRefresh();
                }
                return;
            }

            // 3. Carga Inicial Forzada (Solo primer inicio o base vacía)
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
            // FAIL-SAFE: Siempre permitir entrada al dashboard
            onStep('ready');
        }
    },

    maintenance: async () => {
        const storedVersion = localStorage.getItem('logicount_app_version');
        if (storedVersion !== CURRENT_APP_VERSION) {
            console.log(`[Kernel] Actualizando Kernel a v${CURRENT_APP_VERSION}`);
            
            // Limpieza selectiva para evitar conflictos de versiones
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

            // Forzar actualización de Service Worker
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (let registration of regs) {
                    await registration.update();
                }
            }

            localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
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
