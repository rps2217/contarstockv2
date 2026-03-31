import React from 'react';
import { Skeleton } from '../../../shared/components/ui/Skeleton';

export const SessionRowSkeleton: React.FC = () => {
  return (
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48 opacity-50" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3 w-20 opacity-50" />
      </div>
    </div>
  );
};
