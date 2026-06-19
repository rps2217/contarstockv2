import React from 'react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

interface Props {
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const SessionRowSkeleton: React.FC<Props> = ({ theme = 'dark' }) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';

  const borderColor = isHighContrast ? 'border-yellow-400/30' : isLight ? 'border-slate-100' : 'border-white/5';
  const skeletonBg = isHighContrast ? 'bg-yellow-400/20' : isLight ? 'bg-slate-200' : 'bg-white/10';

  return (
    <div className={`px-6 py-4 border-b flex items-center justify-between ${borderColor}`}>
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className={`h-4 w-32 ${skeletonBg}`} />
        <Skeleton className={`h-3 w-48 opacity-50 ${skeletonBg}`} />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className={`h-5 w-16 rounded-full ${skeletonBg}`} />
        <Skeleton className={`h-3 w-20 opacity-50 ${skeletonBg}`} />
      </div>
    </div>
  );
};

