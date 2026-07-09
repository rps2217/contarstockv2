/**
 * PageHeader - Header estándar para páginas
 * 
 * Incluye título con icono, subtítulo y acciones.
 * Diseño consistente en todas las páginas redesign.
 */

import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Icono del módulo */
  icon: LucideIcon;
  /** Título principal */
  title: string;
  /** Subtítulo / descripción */
  subtitle?: string;
  /** Botones de acción (lado derecho) */
  actions?: React.ReactNode;
  /** Clases CSS adicionales */
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = memo(({
  icon: Icon,
  title,
  subtitle,
  actions,
  className,
}) => {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-secondary text-sm mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  );
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
