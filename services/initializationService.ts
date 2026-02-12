import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline' | 'purging';

const CURRENT_APP_VERSION = "5.7.2"; // Forzar mantenimiento tras corrección de SchemaDiff

export const InitializationService = {
    runMaintenance: async (onStep: (step: InitStep) => void): Promise<boolean> => {
        const storedVersion = localStorage.getItem('logicount_app_version');
        
        if (storedVersion !== CURRENT_APP_VERSION) {
            onStep('purging');
            try {
                // 1. Limpiar caches de PWA para asegurar nuevo bundle
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(key => caches.delete(key)));
                }

                // 2. Desregistrar Service Workers (Evitar versiones zombie)
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const reg of regs) await reg.unregister();
                }

                // 3. Limpieza de LocalStorage manteniendo identidad corporativa
                const auth = localStorage.getItem('logicount_auth');
                const opId = localStorage.getItem('logicount_operator_id');
                const sets = localStorage.getItem('logicount_settings');
                
                localStorage.clear();
                
                if (auth) localStorage.setItem('logicount_auth', auth);
                if (opId) localStorage.setItem('logicount_operator_id', opId);
                if (sets) localStorage.setItem('logicount_settings', sets);
                
                localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
                
                // Recarga total para aplicar el nuevo esquema Dexie v23
                window.location.reload();
                return true;
            } catch (e) {
                localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
                return false;
            }
        }
        return false;
    },

    run: async (onStep: (step: InitStep) => void): Promise<void> => {
        try {
            onStep('version_check');
            const wasPurged = await InitializationService.runMaintenance(onStep);
            if (wasPurged) return;

            // Manejo seguro del conteo inicial: si la DB está migrando, capturamos el error
            let hasLocalData = false;
            try {
                hasLocalData = (await db.products.count()) > 0;
            } catch (e) {
                console.warn("[Init] IndexedDB ocupada o migrando, procediendo con cautela.");
            }

            if (hasLocalData) {
                onStep('ready'); 
                if (navigator.onLine) InitializationService.backgroundRefresh();
                return;
            }

            if (!navigator.onLine) {
                onStep('offline');
                setTimeout(() => onStep('ready'), 3000);
                return;
            }

            onStep('config');
            await InitializationService.syncConfig();
            onStep('database');
            await importProductsFromAppSheet();
            onStep('ready');

        } catch (error: any) {
            logger.error('INIT_CRITICAL', 'Fallo en arranque operativo', error.message);
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