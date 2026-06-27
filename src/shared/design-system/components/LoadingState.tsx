/**
 * LoadingState - Estados de carga reutilizables
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../tokens';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  isDark?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  isDark = true,
  className,
}) => {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  return (
    <Loader2
      className={cn(
        'animate-spin',
        sizeClass,
        isDark ? 'text-neutral-400' : 'text-neutral-600',
        className
      )}
    />
  );
};

interface LoadingStateProps {
  message?: string;
  isDark?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando...',
  isDark = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4',
        className
      )}
    >
      <LoadingSpinner size="lg" isDark={isDark} className="mb-4" />
      <p
        className={cn(
          'text-sm',
          isDark ? 'text-neutral-400' : 'text-neutral-600'
        )}
      >
        {message}
      </p>
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  isDark?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message,
  isDark = true,
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-lg',
            isDark ? 'bg-neutral-950/80' : 'bg-white/80',
            'backdrop-blur-sm'
          )}
        >
          <LoadingState message={message} isDark={isDark} />
        </div>
      )}
    </div>
  );
};

// Skeleton para contenido
interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: boolean;
  isDark?: boolean;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  rounded = false,
  isDark = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'animate-pulse',
        rounded ? 'rounded-full' : 'rounded',
        isDark ? 'bg-neutral-800' : 'bg-neutral-200',
        className
      )}
      style={{ width, height }}
    />
  );
};
