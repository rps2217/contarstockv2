/**
 * SyncProgress - Componente para mostrar progreso de sincronización
 */

import React from 'react';

interface SyncProgressProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SyncProgress: React.FC<SyncProgressProps> = ({
  progress,
  label,
  showPercentage = true,
  size = 'md',
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between mb-1 text-sm">
          {label && (
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
          )}
          {showPercentage && (
            <span className="text-gray-500 dark:text-gray-500">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]}`}>
        <div
          className="bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

export default SyncProgress;
