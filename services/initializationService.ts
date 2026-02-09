
import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet } from './syncManager';
import { getSettings, saveSettings } from './settings';
import { db } from '../db';

export type InitStep = 'idle' | 'config' | 'database' | 'ready' | 'offline';

export const InitializationService = {
    shouldSync: (): boolean => {
        const lastInit = localStorage.getItem('logicount_last_init_ts');
        if (!lastInit) return true;
        const thirtyMinutes = 30 * 60 * 1000;
        return (Date.now() - parseInt(lastInit)) > thirtyMinutes;
    },

    /**
     * Ejecuta el arranque profesional:
     * Si hay datos, libera la UI inmediatamente y sincroniza de fondo.
     */
    run: async (onStep: (step: InitStep) => void): Promise<void> => {
        const hasLocalData = (await db.products.count()) > 0;

        // Si tenemos datos, no bloqueamos al usuario
        if (hasLocalData && !InitializationService.shouldSync()) {
            onStep('ready');
            return;
        }

        // Si tenemos datos pero toca actualizar, avisamos pero no necesariamente bloqueamos
        if (hasLocalData) {
            onStep('ready'); // Liberamos la UI primero
            InitializationService.backgroundSync(); // Sync silencioso
            return;
        }

        // Si NO hay datos (primer inicio), sí es obligatorio bloquear y mostrar progreso
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
            onStep('ready'); // Intentamos abrir con lo que haya
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
            console.log("[Init] Ejecutando sincronización delta de fondo...");
            await InitializationService.syncConfig();
            await importProductsFromAppSheet();
            localStorage.setItem('logicount_last_init_ts', Date.now().toString());
            console.log("[Init] Sincronización de fondo completada.");
        } catch (e) {
            console.warn("[Init] Falló el refresco de fondo, se reintentará en la siguiente apertura.");
        }
    }
};
