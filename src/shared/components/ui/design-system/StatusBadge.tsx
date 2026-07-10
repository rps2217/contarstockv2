/**
 * StatusBadge - Badge de estado minimalista
 * 
 * Solo usa colores significativos (success, warning, error).
 */

import React from 'react';

interface StatusBadgeProps {
  status: 'synced' | 'pending' | 'error' | 'expired' | 'critical' | 'safe' | 'next_expiry';
  label?: string;
  isDark?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig = {
  synced: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  error: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  expired: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  critical: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  safe: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  next_expiry: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
};

const statusLabels = {
  synced: 'Sincronizado',
  pending: 'Pendiente',
  error: 'Error',
  expired: 'Vencido',
  critical: 'Crítico',
  safe: 'Seguro',
  next_expiry: 'Próximo',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  isDark = true,
  size = 'sm',
}) => {
  const config = statusConfig[status];
  const displayLabel = label || statusLabels[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
      `}
      style={{ 
        color: config.color,
        backgroundColor: config.bg,
      }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {displayLabel}
    </span>
  );
};

export default StatusBadge;