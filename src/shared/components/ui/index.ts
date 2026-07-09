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
export * from './HorizontalStatCard';
export * from './DataCard';

// Layout Components
export * from './Modal';
export * from './PageHeader';

// Data Components
export * from './VirtualList';

// New components exports
export * from './Tooltip';
export * from './SearchInput';
export * from './FAB';

// Export Components
export { ExportPreview } from './ExportPreview';

// Icon Components
export { Icon, LazyIcon, Spinner } from './Icon';
export type { IconName } from './Icon';

// Page Loader Components
export { PageLoader, PageSkeleton, SkeletonLine } from './PageLoader';

// Re-export specific components
export { CardHeader, CardTitle, CardContent } from './Card';
export { StatusDot } from './Badge';

// Error Handling
export * from './ErrorBoundary';

// Empty States & Loading
export * from './EmptyState';

// Accessibility
export * from './SkipLinks';
