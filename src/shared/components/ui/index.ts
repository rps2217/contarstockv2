/**
 * UI Components - Biblioteca de componentes atómicos
 * 
 * Componentes primitivos para construir interfaces de usuario.
 * Sigue el sistema de diseño de ContarStock v2.
 */

// Form Components
export * from './Button';
export * from './Input';
export * from './Textarea';
export * from './Select';
export * from './Switch';

// Display Components
export * from './Badge';
export * from './Card';
export * from './Spinner';
export * from './Skeleton';
export * from './StatCard';

// Layout Components
export * from './Modal';

// Data Components
export * from './VirtualList';

// New components exports
export * from './Tooltip';

// Export Components
export { ExportPreview } from './ExportPreview';

// Icon Components
export { Icon, LazyIcon, Spinner } from './Icon';
export type { IconName } from './Icon';

// Re-export specific components
export { CardHeader, CardTitle, CardContent } from './Card';
export { StatusDot } from './Badge';
