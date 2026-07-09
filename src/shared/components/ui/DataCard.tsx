/**
 * DataCard - Card para mostrar elementos en listas
 * 
 * Card con header (icono + título + badge) y acciones en footer.
 * Estilo consistente con ReceptionPage, DataPage.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Pencil, Trash2, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButton {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
  disabled?: boolean;
  loading?: boolean;
}

interface DataCardProps {
  /** Título principal */
  title: string;
  /** Subtítulo / descripción */
  subtitle?: string;
  /** Icono a mostrar */
  icon?: LucideIcon;
  /** Color del icono */
  iconColor?: string;
  /** Badge de estado (opcional) */
  badge?: React.ReactNode;
  /** Metadata adicional (array de {label, value}) */
  metadata?: { label: string; value: string | number }[];
  /** Lista de acciones en footer */
  actions?: ActionButton[];
  /** Index para animación */
  index?: number;
  /** Si está expandido (para contenido adicional) */
  expanded?: boolean;
  /** Contenido expandido */
  children?: React.ReactNode;
  /** Clases CSS adicionales */
  className?: string;
  /** onClick en el header */
  onHeaderClick?: () => void;
}

const defaultActionColors = {
  default: 'hover:text-primary hover:bg-elevated',
  danger: 'hover:text-rose-500 hover:bg-elevated',
  primary: 'hover:text-blue-500 hover:bg-elevated',
};

export const DataCard: React.FC<DataCardProps> = memo(({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-500',
  badge,
  metadata,
  actions,
  index = 0,
  expanded = false,
  children,
  className,
  onHeaderClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={cn(
        'bg-surface border border-subtle rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          'p-4 flex items-start gap-3',
          onHeaderClick && 'cursor-pointer hover:bg-elevated/50 transition-colors'
        )}
        onClick={onHeaderClick}
      >
        {/* Icon */}
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center shrink-0">
            <Icon className={cn('w-6 h-6', iconColor)} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-primary truncate flex-1">
              {title}
            </h3>
            {badge}
          </div>
          
          {subtitle && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {subtitle}
            </div>
          )}

          {/* Metadata */}
          {metadata && metadata.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted">
              {metadata.map((item, i) => (
                <span key={i}>
                  <span className="opacity-70">{item.label}:</span>{' '}
                  <span className="text-secondary">{item.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && children && (
        <div className="border-t border-subtle px-4 py-3">
          {children}
        </div>
      )}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="border-t border-subtle flex">
          {actions.map((action, i) => {
            const ActionIcon = action.icon || Eye;
            return (
              <button
                key={i}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-xs transition-colors border-l border-subtle first:border-l-0',
                  action.loading && 'opacity-50 cursor-not-allowed',
                  !action.loading && defaultActionColors[action.variant || 'default']
                )}
              >
                {action.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  ActionIcon && <ActionIcon className="w-4 h-4" />
                )}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});

DataCard.displayName = 'DataCard';

export default DataCard;
