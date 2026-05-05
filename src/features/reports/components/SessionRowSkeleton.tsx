import React from 'react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const SessionRowSkeleton: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  return (
    <div className={`px-6 py-4 border-b flex items-center justify-between ${
      theme === 'dark' ? 'border-white/5' : 'border-slate-100'
    }`}>
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className={`h-4 w-32 ${theme === 'dark' ? 'bg-white/10' : ''}`} />
        <Skeleton className={`h-3 w-48 opacity-50 ${theme === 'dark' ? 'bg-white/10' : ''}`} />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className={`h-5 w-16 rounded-full ${theme === 'dark' ? 'bg-white/10' : ''}`} />
        <Skeleton className={`h-3 w-20 opacity-50 ${theme === 'dark' ? 'bg-white/10' : ''}`} />
      </div>
    </div>
  );
};

