/**
 * DashboardActionCard - Tarjeta de acción optimizada
 * 
 * Componente memoizado para acciones rápidas del dashboard.
 */

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DashboardActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  primary?: boolean;
  delay: number;
  onClick: () => void;
}

export const DashboardActionCard = memo(({
  title,
  description,
  icon,
  primary = false,
  delay,
  onClick,
}: DashboardActionCardProps) => {
  // Memoizar el handler
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        'text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3 h-full',
        primary
          ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 shadow-lg shadow-blue-900/20'
          : 'bg-surface hover:bg-elevated border-subtle'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          primary ? 'bg-white/20 text-white' : 'bg-elevated text-blue-500'
        )}
      >
        {icon}
      </div>
      <div>
        <h4 className={cn('font-semibold mb-1', primary ? 'text-white' : 'text-primary')}>
          {title}
        </h4>
        <p className={cn('text-xs leading-relaxed', primary ? 'text-blue-100' : 'text-muted')}>
          {description}
        </p>
      </div>
    </motion.button>
  );
});

DashboardActionCard.displayName = 'DashboardActionCard';

// Versión simple sin animación
export const DashboardActionCardSimple = memo(({
  title,
  description,
  icon,
  primary = false,
  onClick,
}: Omit<DashboardActionCardProps, 'delay'>) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left p-4 rounded-xl border transition-colors flex items-center gap-4',
        primary
          ? 'bg-blue-600 text-white border-blue-500'
          : 'bg-surface border-subtle hover:bg-elevated'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          primary ? 'bg-white/20 text-white' : 'bg-elevated text-blue-500'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={cn('font-semibold text-sm', primary ? 'text-white' : 'text-primary')}>
          {title}
        </h4>
        <p className={cn('text-xs truncate', primary ? 'text-blue-100' : 'text-muted')}>
          {description}
        </p>
      </div>
    </button>
  );
});

DashboardActionCardSimple.displayName = 'DashboardActionCardSimple';

export default DashboardActionCard;