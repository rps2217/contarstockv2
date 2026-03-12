import { lazy, ComponentType, LazyExoticComponent, createElement } from 'react';

/**
 * MOTOR DE CARGA RESILIENTE v4.3
 * Garantiza la integridad del retorno para evitar el Error #31 de React.
 */
export const lazyWithRetry = (
 componentImport: () => Promise<{ default: ComponentType<any> }>
): LazyExoticComponent<ComponentType<any>> => {
 return lazy(async () => {
 try {
 const component = await componentImport();
 if (!component || !component.default) {
 throw new Error("Módulo cargado no contiene un export default válido.");
 }
 return component;
 } catch (error) {
 console.error("Fallo crítico cargando módulo:", error);
 
 // Intento de recuperación por recarga suave si el error es de red
 const hasRefreshed = sessionStorage.getItem('retry-refreshed');
 if (!hasRefreshed) {
 sessionStorage.setItem('retry-refreshed', 'true');
 window.location.reload();
 }
 
 // Fallback seguro: Un componente funcional que devuelve null en lugar de romper React
 return { 
 default: () => createElement('div', { className: 'hidden' }, null)
 };
 }
 });
};