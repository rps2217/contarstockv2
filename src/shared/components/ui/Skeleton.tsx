
import React, { memo } from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton = memo(({ className = '', variant = 'rectangular' }: SkeletonProps) => {
  const variants = {
    text: 'h-3 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-2xl'
  };

  return (
    <div 
      className={`bg-white/5 animate-pulse ${variants[variant]} ${className}`}
    />
  );
});

Skeleton.displayName = 'Skeleton';

// Forced GitHub sync
