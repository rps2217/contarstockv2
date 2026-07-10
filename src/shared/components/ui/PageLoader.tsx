/**
 * PageLoader - Componente de carga para páginas lazy
 * 
 * Proporciona un fallback visual atractivo mientras se carga una página.
 * 
 * @example
 * ```tsx
 * <Suspense fallback={<PageLoader />}>
 *   <LazyPage />
 * </Suspense>
 * ```
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'minimal' | 'dots';
  className?: string;
}

export const PageLoader = memo(({
  title = 'Cargando...',
  subtitle,
  variant = 'default',
  className,
}: PageLoaderProps) => {
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-4 p-8', className)}>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              className="w-3 h-3 bg-blue-500 rounded-full"
            />
          ))}
        </div>
        {subtitle && (
          <p className="text-sm text-muted">{subtitle}</p>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[50vh] p-8',
      className
    )}>
      {/* Logo placeholder */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mb-8"
      >
        <div className="w-20 h-20 border border-subtle rounded-3xl flex items-center justify-center bg-surface">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xl font-bold text-primary mb-2"
      >
        {title}
      </motion.h2>

      {/* Subtitle */}
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted"
        >
          {subtitle}
        </motion.p>
      )}

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 w-64"
      >
        <div className="h-1 w-full bg-elevated rounded-full overflow-hidden">
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
          />
        </div>
      </motion.div>
    </div>
  );
});

PageLoader.displayName = 'PageLoader';

// Skeleton loader para páginas completas
interface PageSkeletonProps {
  className?: string;
}

export const PageSkeleton = memo(({ className }: PageSkeletonProps) => {
  return (
    <div className={cn('p-6 space-y-6 animate-pulse', className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-elevated rounded-lg" />
          <div className="h-4 w-32 bg-elevated rounded" />
        </div>
        <div className="h-10 w-32 bg-elevated rounded-xl" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-surface rounded-2xl p-4 space-y-3">
            <div className="h-10 w-10 bg-elevated rounded-xl" />
            <div className="h-6 w-16 bg-elevated rounded" />
            <div className="h-4 w-20 bg-elevated rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-10 w-full bg-surface rounded-xl" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 bg-surface rounded-xl" />
        ))}
      </div>
    </div>
  );
});

PageSkeleton.displayName = 'PageSkeleton';

// Inline skeleton lines
interface SkeletonLineProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const SkeletonLine = memo(({
  width = '100%',
  height = '1rem',
  className,
}: SkeletonLineProps) => (
  <div
    className={cn('bg-elevated rounded animate-pulse', className)}
    style={{ width, height }}
  />
));

SkeletonLine.displayName = 'SkeletonLine';

export default PageLoader;