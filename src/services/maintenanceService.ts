export const AppMaintenanceService = {
  /**
   * Gestiona la actualización de versión del sistema, limpiando cachés obsoletas
   * y preservando la identidad del operador y las configuraciones críticas.
   */
  checkVersion: async (
    currentVersion: string,
    onStep?: (step: string) => void
  ): Promise<boolean> => {
    const storedVersion = localStorage.getItem('logicount_app_version');

    if (storedVersion !== currentVersion) {
      if (onStep) onStep('purging');

      try {
        // 1. Limpieza de Caché de Aplicación (PWA/Vite)
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }

        // 2. Desregistrar Service Workers
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

        localStorage.setItem('logicount_app_version', currentVersion);

        // El reinicio es necesario para aplicar cambios de esquema en IndexedDB
        window.location.reload();
        return true;
      } catch (e: unknown) {
        localStorage.setItem('logicount_app_version', currentVersion);
        return false;
      }
    }
    return false;
  },
};
