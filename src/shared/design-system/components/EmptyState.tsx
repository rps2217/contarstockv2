/**
 * EmptyState - Estado vacío reutilizable
 */

import React from 'react';
import { Inbox, Search, FileText, Database, RefreshCw } from 'lucide-react';
import { cn } from '../tokens';

type EmptyIcon = 'inbox' | 'search' | 'file' | 'database' | 'refresh';

interface EmptyStateProps {
  icon?: EmptyIcon | React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  isDark?: boolean;
  className?: string;
}

const iconMap: Record<EmptyIcon, React.ReactNode> = {
  inbox: <Inbox className="w-12 h-12" />,
  search: <Search className="w-12 h-12" />,
  file: <FileText className="w-12 h-12" />,
  database: <Database className="w-12 h-12" />,
  refresh: <RefreshCw className="w-12 h-12" />,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
  isDark = true,
  className,
}) => {
  const iconElement = typeof icon === 'string' ? iconMap[icon as EmptyIcon] : icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div
        className={cn(
          'p-6 rounded-full mb-6',
          isDark ? 'bg-neutral-900 text-neutral-600' : 'bg-neutral-100 text-neutral-400'
        )}
      >
        {iconElement}
      </div>
      
      <h3
        className={cn(
          'text-base font-medium mb-2',
          isDark ? 'text-neutral-300' : 'text-neutral-600'
        )}
      >
        {title}
      </h3>
      
      {description && (
        <p
          className={cn(
            'text-sm max-w-xs mb-6',
            isDark ? 'text-neutral-500' : 'text-neutral-500'
          )}
        >
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            isDark
              ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
              : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
