"use client";
/**
 * VirtualBadge - Componente para mostrar campos virtuales calculados
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { BadgeStyle } from '@/lib/virtualFields';

interface VirtualBadgeProps {
  /** Valor del badge */
  value: string;
  /** Estilo visual */
  style?: BadgeStyle;
  /** Tamaño */
  size?: 'sm' | 'md' | 'lg';
  /** Mostrar icono */
  showIcon?: boolean;
  className?: string;
}

const styleConfig: Record<BadgeStyle, { bg: string; text: string; dot: string }> = {
  success: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    dot: 'bg-green-500',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    dot: 'bg-yellow-500',
  },
  error: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    dot: 'bg-red-500',
  },
  info: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    dot: 'bg-blue-500',
  },
  neutral: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    dot: 'bg-zinc-400',
  },
};

const labels: Record<string, string> = {
  // Stock status
  ok: 'OK',
  warning: 'Bajo',
  critical: 'Crítico',
  expired: 'Vencido',
  out_of_stock: 'Sin Stock',
  unknown: 'Desconocido',
  // Expiry status
  none: 'Sin Fecha',
  // Location
  none_location: 'Sin Ubicación',
};

export const VirtualBadge: React.FC<VirtualBadgeProps> = ({
  value,
  style = 'neutral',
  size = 'md',
  showIcon = true,
  className,
}) => {
  const config = styleConfig[style] || styleConfig.neutral;
  const label = labels[value] || value;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        config.bg,
        config.text,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      )}
      {label}
    </span>
  );
};

/**
 * Status badge para stock
 */
export const StockStatusBadge: React.FC<{
  status: 'ok' | 'warning' | 'critical' | 'expired' | 'out_of_stock' | 'unknown';
  size?: 'sm' | 'md' | 'lg';
}> = ({ status, size = 'sm' }) => {
  const styleMap: Record<string, BadgeStyle> = {
    ok: 'success',
    warning: 'warning',
    critical: 'error',
    expired: 'error',
    out_of_stock: 'error',
    unknown: 'neutral',
  };

  return (
    <VirtualBadge
      value={status}
      style={styleMap[status] || 'neutral'}
      size={size}
    />
  );
};

/**
 * Badge para porcentaje
 */
export const PercentageBadge: React.FC<{
  value: number | null;
  thresholds?: { warning: number; critical: number };
  size?: 'sm' | 'md' | 'lg';
}> = ({ 
  value, 
  thresholds = { warning: 50, critical: 25 },
  size = 'sm' 
}) => {
  if (value === null || value === undefined) {
    return <VirtualBadge value="N/A" style="neutral" size={size} />;
  }

  let style: BadgeStyle = 'success';
  if (value <= thresholds.critical) {
    style = 'error';
  } else if (value <= thresholds.warning) {
    style = 'warning';
  }

  return (
    <VirtualBadge
      value={`${value}%`}
      style={style}
      size={size}
      showIcon={false}
    />
  );
};

/**
 * Badge para días
 */
export const DaysBadge: React.FC<{
  days: number | null;
  size?: 'sm' | 'md' | 'lg';
}> = ({ days, size = 'sm' }) => {
  if (days === null || days === undefined) {
    return <VirtualBadge value="Sin fecha" style="neutral" size={size} />;
  }

  let style: BadgeStyle = 'success';
  let label = `${days}d`;

  if (days < 0) {
    style = 'error';
    label = `Vencido ${Math.abs(days)}d`;
  } else if (days <= 30) {
    style = 'error';
  } else if (days <= 90) {
    style = 'warning';
  }

  return (
    <VirtualBadge value={label} style={style} size={size} showIcon={false} />
  );
};

export default VirtualBadge;
