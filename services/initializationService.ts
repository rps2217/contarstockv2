
import { logger } from './logger';
import { fetchSystemConfig } from './gasService';
import { importProductsFromAppSheet } from './syncManager';
import { getSettings, saveSettings } from './settings';

export type InitStep = 'idle' | 'config' | 'database' | 'ready' | 'offline';

export const InitializationService = {
    /**
     * Determina si es necesario realizar una sincronización de arranque
     * basada en el umbral de 30 minutos.
     */
    shouldSync: (): boolean => {
        const lastInit = localStorage.getItem('logicount_last_init_ts');
        if (!lastInit) return true;
        
        const thirtyMinutes = 30 * 60 * 1000;
        return (Date.now() - parseInt(lastInit)) > thirtyMinutes;
    },

    /**
     * Ejecuta el protocolo de inicialización en cascada.
     */
    run: async (onStep: (step: InitStep) => void): Promise<void> => {
        if (!navigator.onLine) {
            onStep('offline');
            return;
        }

        if (!InitializationService.shouldSync()) {
            onStep('ready');
            return;
        }

        try {
            // FASE 1: Sincronizar Configuración Global
            onStep('config');
            const settings = getSettings();
            if (settings.appSheetConfig?.gasWebAppUrl) {
                const newConfig = await fetchSystemConfig();
                const updatedSettings = { ...settings, appSheetConfig: { ...settings.appSheetConfig, ...newConfig } };
                await saveSettings(updatedSettings);
                logger.success('INIT', 'Configuración de sistema actualizada desde la nube.');
            }

            // FASE 2: Sincronizar Catálogo de Productos (Smart Delta)
            onStep('database');
            const importedCount = await importProductsFromAppSheet();
            logger.success('INIT', `Sincronización delta completada: ${importedCount} SKUs actualizados.`);

            // Finalización exitosa
            localStorage.setItem('logicount_last_init_ts', Date.now().toString());
            onStep('ready');

        } catch (error: any) {
            logger.error('INIT_FAILED', 'Fallo en inicialización automática. Usando caché local.', error.message);
            // Resiliencia: si falla la red, permitimos entrar en modo offline
            onStep('offline');
            // Retraso pequeño para que el usuario vea el estado
            await new Promise(r => setTimeout(r, 1000));
            onStep('ready');
        }
    }
};
