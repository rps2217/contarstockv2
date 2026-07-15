/**
 * Icon - Sistema de iconos optimizado
 * 
 * Proporciona iconos con lazy loading para reducir el bundle size.
 * Usa SVG inline para iconos críticos y lazy import para el resto.
 * 
 * @example
 * ```tsx
 * // Uso directo
 * import { Icon } from '@/shared/components/ui';
 * <Icon name="check" size={20} />
 * 
 * // Lazy icon con fallback
 * <LazyIcon name="loader" className="animate-spin" />
 * ```
 */

import React, { memo, Suspense, lazy, useMemo } from 'react'
import { logger } from '@/services/logger';
;
import { cn } from '@/lib/utils';

// Catálogo de SVG paths para iconos críticos (inline)
const INLINE_ICONS: Record<string, string> = {
  check: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
  x: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>',
  plus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14"/>',
  minus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/>',
  'chevron-right': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>',
  'chevron-left': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>',
  'chevron-down': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>',
  'chevron-up': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>',
  search: '<circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35"/>',
  loader: '<path d="M12 2v4m0 12v4m-8-10h4m12 0h4m-4.93-6.07l-2.83 2.83m-5.66 5.66l-2.83 2.83m0-11.32l2.83 2.83m5.66 5.66l2.83 2.83"/>',
  'alert-circle': '<circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"/>',
  'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01"/>',
  checkcircle: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 4L12 14.01l-3-3"/>',
  package: '<path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>',
  scan: '<path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>',
  user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
  download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>',
  edit: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  map: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
  bell: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>',
  info: '<circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16v-4m0-4h.01"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 6l-10 7L2 6"/>',
  phone: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>',
  wifi: '<path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>',
  'wifi-off': '<line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>',
  'cloud-off': '<path d="M22.61 16.95A5 5 0 0018 10h-1.26a8 8 0 00-7.05-6M5 5a8 8 0 004 15h9a5 5 0 001.7-.3M1 1l22 22"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>',
  save: '<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  unlock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/>',
  'arrow-right': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7l7 7-7 7"/>',
  'arrow-left': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7l-7 7 7 7"/>',
  'arrow-up': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m-7 7l7-7 7 7"/>',
  'arrow-down': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7l7 7 7-7"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>',
  barcode: '<path d="M3 5v14M21 5v14M5 5a1 1 0 100-2 1 1 0 000 2zM9 5a1 1 0 100-2 1 1 0 000 2zM15 5a1 1 0 100-2 1 1 0 000 2zM19 5a1 1 0 100-2 1 1 0 000 2z"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
};

export type IconName = keyof typeof INLINE_ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

// Componente Icon principal - usa SVG inline para iconos del catálogo
export const Icon = memo(({
  name,
  size = 24,
  className,
  strokeWidth = 2,
}: IconProps) => {
  const path = INLINE_ICONS[name];

  if (!path) {
    console.warn(`Icon "${name}" not found in inline catalog`);
    return null;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
});

Icon.displayName = 'Icon';

// Lazy Icon - para iconos no críticos (usa lucide-react)
interface LazyIconProps extends Omit<IconProps, 'name'> {
  name: string;
  fallback?: React.ReactNode;
}

export const LazyIcon = memo(({
  name,
  size = 24,
  className,
  fallback,
}: LazyIconProps) => {
  // Para iconos del catálogo, usar versión inline
  if (name in INLINE_ICONS) {
    return <Icon name={name as IconName} size={size} className={className} />;
  }

  // Para otros iconos, renderizar fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  return <Icon name="info" size={size} className={className} />;
});

LazyIcon.displayName = 'LazyIcon';

// Spinner animado
interface SpinnerProps {
  size?: number;
  className?: string;
}

export const Spinner = memo(({ size = 24, className }: SpinnerProps) => (
  <Icon name="loader" size={size} className={cn('animate-spin', className)} />
));

Spinner.displayName = 'Spinner';

export default Icon;