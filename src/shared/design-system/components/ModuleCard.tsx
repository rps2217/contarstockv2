/**
 * ModuleCard - Tarjeta de módulo para navegación
 * 
 * Diseño limpio inspirado en AppSheet:
 * - Fondo superficie
 * - Borde sutil
 * - Icono con fondo elevado
 * - Texto monocromático
 */

import React, { memo } from 'react';
import { cn } from '../tokens';

interface ModuleCardProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isDark?: boolean;
  variant?: 'default' | 'primary';
  disabled?: boolean;
  className?: string;
}

export const ModuleCard: React.FC<ModuleCardProps> = memo(({
  icon,
  label,
  onClick,
  isDark = true,
  variant = 'default',
  disabled = false,
  className,
}) => {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Layout
        'relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl',
        'border transition-all duration-150 active:scale-[0.98]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500',
        'min-h-[90px]',
        
        // Variantes
        isPrimary
          ? isDark
            ? 'bg-neutral-100 text-neutral-900 border-neutral-200'
            : 'bg-neutral-900 text-white border-neutral-800'
          : isDark
            ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800/80 hover:border-neutral-700'
            : 'bg-white border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300',
        
        // Estados
        disabled && 'opacity-50 cursor-not-allowed',
        
        className
      )}
    >
      {/* Icon Container */}
      <div
        className={cn(
          'p-2.5 rounded-xl transition-colors',
          isPrimary
            ? isDark
              ? 'bg-neutral-800 text-white'
              : 'bg-neutral-700 text-white'
            : isDark
              ? 'bg-neutral-800 text-neutral-400'
              : 'bg-neutral-100 text-neutral-600'
        )}
      >
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })
          : icon
        }
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-xs font-medium text-center leading-tight',
          isPrimary
            ? isDark ? 'text-neutral-900' : 'text-white'
            : isDark ? 'text-neutral-300' : 'text-neutral-700'
        )}
      >
        {label}
      </span>
    </button>
  );
});

ModuleCard.displayName = 'ModuleCard';
