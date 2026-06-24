import { Home, Scan, Database, History, Cloud, Settings, LucideIcon } from 'lucide-react';

/**
 * Fuente única de verdad para la navegación principal (estilo AppSheet).
 * La consumen tanto el Sidebar (desktop) como el BottomDock (móvil),
 * evitando listas duplicadas y estados activos inconsistentes.
 */
export interface NavItem {
  /** Identificador estable del destino */
  key: string;
  /** Etiqueta visible */
  label: string;
  /** Icono de lucide-react */
  icon: LucideIcon;
  /** Ruta de navegación */
  path: string;
  /** Descripción corta (tooltip / accesibilidad) */
  description: string;
}

export const MAIN_NAV: NavItem[] = [
  { key: 'dashboard', label: 'Panel', icon: Home, path: '/', description: 'Vista general y módulos' },
  { key: 'capture', label: 'Capturar', icon: Scan, path: '/capture', description: 'Escaneo y recepción' },
  { key: 'data', label: 'Datos', icon: Database, path: '/data', description: 'Catálogo e inventario' },
  { key: 'reports', label: 'Reportes', icon: History, path: '/reports', description: 'Informes y descargas' },
  { key: 'sync', label: 'Sync', icon: Cloud, path: '/sync', description: 'Sincronización en la nube' },
  { key: 'settings', label: 'Ajustes', icon: Settings, path: '/settings', description: 'Configuración del sistema' },
];

/**
 * Resuelve el destino activo a partir del pathname actual.
 * Centraliza la lógica para que Sidebar y BottomDock coincidan siempre.
 */
export const getActiveNavKey = (pathname: string): string => {
  if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
  // Rutas que conceptualmente pertenecen a "Capturar"
  if (
    pathname.startsWith('/capture') ||
    pathname.startsWith('/reception') ||
    pathname.startsWith('/counting') ||
    pathname.startsWith('/massive') ||
    pathname.startsWith('/expiry') ||
    pathname.startsWith('/events')
  ) {
    return 'capture';
  }
  // Rutas que conceptualmente pertenecen a "Datos"
  if (
    pathname.startsWith('/data') ||
    pathname.startsWith('/database') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/providers') ||
    pathname.startsWith('/expected-orders') ||
    pathname.startsWith('/product')
  ) {
    return 'data';
  }
  if (pathname.startsWith('/reports') || pathname.startsWith('/session')) return 'reports';
  if (pathname.startsWith('/sync')) return 'sync';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'dashboard';
};
