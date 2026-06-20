/**
 * Spinner - Componente atómico para estados de carga
 */

import React, { memo } from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  color?: 'white' | 'primary' | 'muted';
}

const colorClasses: Record<string, string> = {
  white: 'border-white/30 border-t-white',
  primary: 'border-brand-warning/30 border-t-brand-warning',
  muted: 'border-slate-600 border-t-slate-400',
};

export const Spinner = memo(({
  size = 'md',
  color = 'white',
  className = '',
  ...props
}: SpinnerProps) => {
  return (
    <div
      className={`rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      {...props}
    />
  );
});

Spinner.displayName = 'Spinner';

// FullPageLoader - Loader de pantalla completa
export const FullPageLoader = memo(({
  message,
}: {
  message?: string;
}) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-50">
    <Spinner size="xl" color="primary" />
    {message && (
      <p className="mt-4 text-sm font-medium text-slate-400 uppercase tracking-widest">
        {message}
      </p>
    )}
  </div>
));

FullPageLoader.displayName = 'FullPageLoader';

// InlineLoader - Loader inline para botones
export const InlineLoader = memo(() => (
  <span className="inline-flex items-center gap-2">
    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  </span>
));

InlineLoader.displayName = 'InlineLoader';
