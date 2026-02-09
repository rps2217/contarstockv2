
import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';

export type InitStep = 'idle' | 'version_check' | 'config' | 'database' | 'ready' | 'offline';

// --- CONFIGURACIÓN DE VERSIÓN ---
const CURRENT_APP_VERSION = "4.5.8"; // Incrementa esto para forzar limpieza de UI en todos los clientes

export const InitializationService = {
    shouldSync: (): boolean => {
        const lastInit = localStorage.getItem('logicount_last_init_ts');
        if (!lastInit) return true;
        const thirtyMinutes = 30 * 60 * 1000;
        return (Date.now() - parseInt(lastInit)) > thirtyMinutes;
    },

    /**
     * Ejecuta el arranque profesional con mantenimiento preventivo.
     */
    run: async (onStep: (step: InitStep) => void): Promise<void> => {
        
        // 1. Mantenimiento de Versión (Anti-Caché obsoleto)
        onStep('version_check');
        await InitializationService.maintenance();

        const hasLocalData = (await db.products.count()) > 0;

        if (hasLocalData && !InitializationService.shouldSync()) {
            onStep('ready');
            return;
        }

        if (hasLocalData) {
            onStep('ready');
            InitializationService.backgroundSync();
            return;
        }

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
            logger.error('INIT_CRITICAL', 'Fallo en carga inicial', error.message);
            onStep('ready');
        }
    },

    /**
     * Limpieza selectiva para cargar nuevas características sin afectar datos vitales.
     */
    maintenance: async () => {
        const storedVersion = localStorage.getItem('logicount_app_version');
        
        if (storedVersion !== CURRENT_APP_VERSION) {
            console.log(`[Maintenance] Actualizando de ${storedVersion} a ${CURRENT_APP_VERSION}`);
            
            // Lógica de Limpieza Segura (Mantenemos Auth y DB)
            const keysToKeep = ['logicount_auth', 'logicount_operator_id', 'logicount_settings', 'logicount_brain_installed'];
            
            // Limpiamos solo flags de UI y estados de error antiguos que podrían causar conflictos
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('logicount_') && !keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });

            // Forzar actualización del Service Worker si existe
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.update();
                }
            }

            localStorage.setItem('logicount_app_version', CURRENT_APP_VERSION);
            console.log("[Maintenance] Limpieza de UI completada.");
        }
    },

    syncConfig: async () => {
        const settings = getSettings();
        if (settings.appSheetConfig?.gasWebAppUrl) {
            const newConfig = await fetchSystemConfig();
            const updatedSettings = { ...settings, appSheetConfig: { ...settings.appSheetConfig, ...newConfig } };
            await saveSettings(updatedSettings);
        }
    },

    backgroundSync: async () => {
        if (!navigator.onLine) return;
        try {
            await InitializationService.syncConfig();
            await importProductsFromAppSheet();
            localStorage.setItem('logicount_last_init_ts', Date.now().toString());
        } catch (e) {
            console.warn("[Init] Falló el refresco de fondo.");
        }
    }
};
