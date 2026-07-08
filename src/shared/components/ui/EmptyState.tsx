"use client";
/**
 * EmptyState - Estados vacíos para listas y secciones
 * 
 * Proporciona feedback visual consistente cuando no hay datos.
 */

import React, { type ReactNode } from 'react';
import { type LucideIcon, Package, Search, WifiOff, AlertCircle, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

type IllustrationType = 'no-data' | 'no-results' | 'offline' | 'error';

interface EmptyStateProps {
  icon?: LucideIcon | React.ReactElement;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  illustration?: IllustrationType;
  className?: string;
  compact?: boolean;
}

/**
 * Ilustraciones SVG inline para cada tipo
 */
const EmptyIllustration: React.FC<{ type: IllustrationType; className?: string }> = ({ type, className }) => {
  const illustrations = {
    'no-data': (
      <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" className="fill-surface" />
        <rect x="60" y="70" width="80" height="60" rx="8" className="fill-elevated" />
        <rect x="70" y="80" width="60" height="8" rx="4" className="fill-muted/30" />
        <rect x="70" y="95" width="40" height="8" rx="4" className="fill-muted/20" />
        <rect x="70" y="110" width="50" height="8" rx="4" className="fill-muted/20" />
        <circle cx="140" cy="60" r="20" className="fill-blue-500/20" />
        <path d="M135 60l5 5 10-10" stroke="currentColor" strokeWidth="2" className="stroke-blue-500" />
      </svg>
    ),
    'no-results': (
      <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="90" cy="90" r="60" className="fill-surface" />
        <circle cx="90" cy="90" r="40" className="fill-elevated" />
        <line x1="120" y1="120" x2="150" y2="150" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="stroke-muted/40" />
        <path d="M80 85l20 20M100 85l-20 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="stroke-muted/30" />
      </svg>
    ),
    'offline': (
      <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" className="fill-surface" />
        <path d="M60 100c0-22 18-40 40-40s40 18 40 40" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="stroke-amber-500/50" />
        <path d="M50 100c0 28 22 50 50 50s50-22 50-50" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="stroke-amber-500/30" />
        <circle cx="100" cy="100" r="15" className="fill-amber-500/20" />
        <path d="M92 100h16M100 92v16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="stroke-amber-500" />
      </svg>
    ),
    'error': (
      <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" className="fill-surface" />
        <circle cx="100" cy="100" r="50" className="fill-rose-500/10" />
        <circle cx="100" cy="85" r="25" className="fill-rose-500/20" />
        <path d="M100 120v20M100 150v5" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="stroke-rose-500" />
      </svg>
    ),
  };

  return illustrations[type] || illustrations['no-data'];
};

/**
 * Iconos por defecto según tipo
 */
const defaultIcons: Record<IllustrationType, LucideIcon> = {
  'no-data': Package,
  'no-results': Search,
  'offline': WifiOff,
  'error': AlertCircle,
};

/**
 * EmptyState principal
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  illustration = 'no-data',
  className,
  compact = false,
}) => {
  const IconComponent = icon || defaultIcons[illustration];
  const renderIcon = (size: string) => {
    if (React.isValidElement(IconComponent)) {
      return IconComponent;
    }
    const Icon = IconComponent as LucideIcon;
    return <Icon className={size} />;
  };

  if (compact) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 px-4', className)}>
        <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-3">
          {renderIcon('w-6 h-6 text-muted')}
        </div>
        <p className="text-sm text-secondary text-center">{title}</p>
        {description && (
          <p className="text-xs text-muted text-center mt-1">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4',
      className
    )}>
      {/* Ilustración */}
      <div className="relative mb-6">
        <EmptyIllustration type={illustration} className="w-40 h-40 text-muted/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center">
            {renderIcon('w-8 h-8 text-muted')}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="text-center max-w-md">
        <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
        
        {description && (
          <p className="text-sm text-secondary mb-6">{description}</p>
        )}
        
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'px-6 py-2.5 rounded-xl font-medium transition-colors',
              action.variant === 'secondary'
                ? 'bg-surface text-secondary hover:bg-elevated'
                : 'bg-blue-500 text-white hover:bg-blue-400'
            )}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Componente de lista vacía optimizado para listas
 */
export const EmptyList: React.FC<{
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: LucideIcon;
}> = ({ 
  title = 'No hay elementos', 
  description = 'Esta lista está vacía.',
  action,
  icon: Icon = Inbox 
}) => (
  <EmptyState
    icon={Icon}
    title={title}
    description={description}
    action={action}
    illustration="no-data"
  />
);

/**
 * Skeleton para listas (loading state)
 */
export const ListSkeleton: React.FC<{ count?: number; height?: number }> = ({ 
  count = 5, 
  height = 72 
}) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="bg-surface rounded-xl p-4 animate-pulse"
        style={{ height }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-elevated" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-elevated rounded w-3/4" />
            <div className="h-3 bg-elevated rounded w-1/2" />
          </div>
          <div className="h-6 w-6 bg-elevated rounded" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Skeleton para cards/grids
 */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-2 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="bg-surface rounded-xl p-4 animate-pulse aspect-square"
      >
        <div className="w-full h-1/2 bg-elevated rounded-lg mb-3" />
        <div className="h-4 bg-elevated rounded w-3/4 mb-2" />
        <div className="h-3 bg-elevated rounded w-1/2" />
      </div>
    ))}
  </div>
);

export default EmptyState;
