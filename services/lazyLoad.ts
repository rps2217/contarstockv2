import { lazy, ComponentType, LazyExoticComponent } from 'react';

/**
 * MOTOR DE CARGA RESILIENTE v4.1
 * Evita el error #31 asegurando la integridad del objeto devuelto.
 */
export const lazyWithRetry = (
  componentImport: () => Promise<{ default: ComponentType<any> }>
): LazyExoticComponent<ComponentType<any>> => {
  return lazy(async () => {
    try {
      const component = await componentImport();
      return component;
    } catch (error) {
      console.error("Fallo de carga en módulo:", error);
      
      // Si el error es de red o versión, intentamos recargar una vez
      const hasRefreshed = sessionStorage.getItem('retry-refreshed');
      if (!hasRefreshed) {
        sessionStorage.setItem('retry-refreshed', 'true');
        window.location.reload();
      }
      
      // Fallback: Componente de error básico para no romper el render
      return { 
        default: () => null 
      } as any;
    }
  });
};