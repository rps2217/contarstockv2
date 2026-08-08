/**
 * QuickAction - Tarjeta de acción rápida para el dashboard
 * Estilo inspirado en Magic Patterns con soporte primary/secondary
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  isDark?: boolean;
  primary?: boolean;
  delay?: number;
}

export const QuickAction: React.FC<QuickActionProps> = memo(({
  icon,
  title,
  description,
  onClick,
  isDark = true,
  primary = false,
  delay = 0
}) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-3 h-full',
        primary
          ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 shadow-lg shadow-blue-900/20'
          : 'bg-surface/40 hover:bg-elevated/60 border-subtle/60 hover:border-subtle'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          primary ? 'bg-white/20 text-white' : 'bg-elevated text-blue-400'
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <div>
        <h4
          className={cn(
            'font-semibold mb-1',
            primary ? 'text-white' : 'text-primary'
          )}
        >
          {title}
        </h4>
        <p
          className={cn(
            'text-xs leading-relaxed',
            primary ? 'text-blue-100' : 'text-slate-500'
          )}
        >
          {description}
        </p>
      </div>
    </motion.button>
  );
});

QuickAction.displayName = 'QuickAction';

export default QuickAction;