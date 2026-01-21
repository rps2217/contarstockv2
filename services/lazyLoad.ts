
import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * Envuelve React.lazy para reintentar la carga si falla (común en despliegues de Vercel/Vite).
 * Si falla por un error de red o de archivo inexistente (mismatch de versión), 
 * fuerza una recarga de la página una única vez.
 */
export const lazyWithRetry = (
  componentImport: () => Promise<{ default: ComponentType<any> }>
): LazyExoticComponent<ComponentType<any>> => {
  return lazy(async () => {
    const hasRefreshed = JSON.parse(
      window.sessionStorage.getItem('lazy-retry-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      // Si carga con éxito, reseteamos el flag de recarga
      window.sessionStorage.setItem('lazy-retry-refreshed', 'false');
      return component;
    } catch (error) {
      if (!hasRefreshed) {
        // Marcamos que ya intentamos recargar para evitar bucles infinitos
        window.sessionStorage.setItem('lazy-retry-refreshed', 'true');
        console.warn("Versión de aplicación desactualizada detectada. Recargando núcleo...");
        window.location.reload();
        return { default: () => null } as any;
      }
      // Si ya recargamos y sigue fallando, lanzamos el error al ErrorBoundary
      throw error;
    }
  });
};
