import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

export const SkeletonText: React.FC<{ width?: string }> = ({ width = 'w-full' }) => (
  <Skeleton className={`h-4 ${width}`} />
);

export const SkeletonTitle: React.FC<{ width?: string }> = ({ width = 'w-3/4' }) => (
  <Skeleton className={`h-6 ${width}`} />
);

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  return <Skeleton className={`rounded-full ${sizes[size]}`} />;
};

export const SkeletonButton: React.FC = () => (
  <Skeleton className="h-10 w-24 rounded-lg" />
);

export const SkeletonCard: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="skeleton-card space-y-3">
    <div className="flex items-center gap-3">
      <SkeletonAvatar size="sm" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-3">
    <div className="flex gap-4 pb-2 border-b border-subtle">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === 0 ? 'w-1/4' : 'flex-1'}`} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="flex gap-4 items-center">
        {Array.from({ length: cols }).map((_, col) => (
          <Skeleton key={col} className={`h-4 ${col === 0 ? 'w-1/4' : 'flex-1'}`} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonStats: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-card p-4">
        <Skeleton className="h-3 w-16 mb-3" />
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-12" />
      </div>
    ))}
  </div>
);

export const SkeletonForm: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i}>
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    ))}
    <div className="flex gap-3 pt-4">
      <Skeleton className="h-10 w-24 rounded-lg" />
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  </div>
);
