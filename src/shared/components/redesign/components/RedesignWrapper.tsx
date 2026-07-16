/**
 * RedesignWrapper - Wrapper para aplicar el tema de diseño Redesign
 * 
 * Este componente envuelve componentes legacy con el sistema de diseño
 * monocromático del rediseño.
 */

import React, { memo, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeBackUrl } from '@/lib/urlSecurity';

interface RedesignWrapperProps {
  children: ReactNode;
  className?: string;
  withPadding?: boolean;
  withHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  headerAction?: ReactNode;
  headerBackUrl?: string;
  onBack?: () => void;
}

export const RedesignWrapper = memo(({
  children,
  className = '',
  withPadding = true,
  withHeader = false,
  headerTitle,
  headerSubtitle,
  headerAction,
  headerBackUrl,
  onBack,
}: RedesignWrapperProps) => {
  return (
    <div className={cn('flex flex-col h-full bg-base', className)}>
      {/* Header */}
      {withHeader && (
        <div className="shrink-0 border-b border-subtle">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              {headerBackUrl && sanitizeBackUrl(headerBackUrl) && (
                <a
                  href={sanitizeBackUrl(headerBackUrl)!}
                  className="p-2 -ml-2 rounded-lg hover:bg-surface transition-colors"
                >
                  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
              )}
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 -ml-2 rounded-lg hover:bg-surface transition-colors"
                >
                  <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                {headerTitle && (
                  <h1 className="text-lg font-bold text-primary">{headerTitle}</h1>
                )}
                {headerSubtitle && (
                  <p className="text-xs text-muted">{headerSubtitle}</p>
                )}
              </div>
            </div>
            {headerAction && (
              <div className="shrink-0">{headerAction}</div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 overflow-y-auto', withPadding && 'p-4')}>
        {children}
      </div>
    </div>
  );
});

RedesignWrapper.displayName = 'RedesignWrapper';

// Simple wrapper sin header para uso rápido
interface SimpleWrapperProps {
  children: ReactNode;
  className?: string;
}

export const SimpleRedesignWrapper = memo(({
  children,
  className = '',
}: SimpleWrapperProps) => {
  return (
    <div className={cn('flex flex-col h-full bg-base overflow-hidden', className)}>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
});

SimpleRedesignWrapper.displayName = 'SimpleRedesignWrapper';