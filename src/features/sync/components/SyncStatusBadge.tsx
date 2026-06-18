/**
 * SyncStatusBadge - Componente para mostrar estado de sincronización
 */

import React from 'react';
import { SYNC_STATUS_COLORS, SYNC_STATUS_LABELS } from '../constants/syncConstants';

type SyncStatusValue = 'synced' | 'pending' | 'error' | 'never' | 'syncing';

interface SyncStatusBadgeProps {
  status: SyncStatusValue;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const colorClass = (SYNC_STATUS_COLORS as Record<string, string>)[status] || 'bg-gray-400';
  const label = (SYNC_STATUS_LABELS as Record<string, string>)[status] || status;

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`${colorClass} ${sizeClasses[size]} rounded-full inline-block`} />
      {showLabel && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      )}
    </div>
  );
};

export default SyncStatusBadge;
