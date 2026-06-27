/**
 * PageHeader - Encabezado de página reutilizable
 */

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../tokens';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  isDark?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  showBack,
  onBack,
  isDark = true,
  className,
}) => {
  return (
    <header
      className={cn(
        'px-4 py-4 shrink-0',
        isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-neutral-200',
        'border-b',
        className
      )}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={onBack}
              className={cn(
                'p-2 -ml-2 rounded-lg transition-colors shrink-0',
                isDark
                  ? 'hover:bg-neutral-800 text-neutral-400'
                  : 'hover:bg-neutral-100 text-neutral-600'
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          {icon && (
            <div
              className={cn(
                'p-2 rounded-lg shrink-0',
                isDark ? 'bg-neutral-800' : 'bg-neutral-100'
              )}
            >
              {icon}
            </div>
          )}
          
          <div className="min-w-0">
            <h1
              className={cn(
                'text-lg font-semibold truncate',
                isDark ? 'text-white' : 'text-neutral-900'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={cn(
                  'text-xs truncate',
                  isDark ? 'text-neutral-500' : 'text-neutral-500'
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

interface CompactHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  isDark?: boolean;
}

export const CompactHeader: React.FC<CompactHeaderProps> = ({
  title,
  subtitle,
  action,
  isDark = true,
}) => {
  return (
    <header
      className={cn(
        'px-4 py-3',
        isDark ? 'bg-neutral-950' : 'bg-white'
      )}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <h1
            className={cn(
              'text-xl font-bold',
              isDark ? 'text-white' : 'text-neutral-900'
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'text-xs',
                isDark ? 'text-neutral-500' : 'text-neutral-500'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
};
