/**
 * StatsRing - Gráfico de dona para mostrar progreso/estado
 * Ideal para mostrar porcentaje de sync, completion, etc.
 */

import React, { memo } from 'react';

interface StatsRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  sublabel?: string;
  isDark?: boolean;
}

export const StatsRing: React.FC<StatsRingProps> = memo(({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = '#3b82f6',
  bgColor,
  label,
  sublabel,
  isDark = true
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const defaultBgColor = isDark ? '#262626' : '#e5e5e5';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgColor || defaultBgColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out'
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {label && (
            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {label}
            </span>
          )}
        </div>
      </div>
      
      {sublabel && (
        <span className={`text-xs mt-1 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
          {sublabel}
        </span>
      )}
    </div>
  );
});

StatsRing.displayName = 'StatsRing';

export default StatsRing;