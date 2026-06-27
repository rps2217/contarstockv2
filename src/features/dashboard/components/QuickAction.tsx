/**
 * QuickAction - Tarjeta de acción rápida para el dashboard
 * Enlace directo a funciones comunes
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  isDark?: boolean;
}

export const QuickAction: React.FC<QuickActionProps> = memo(({
  icon,
  title,
  description,
  onClick,
  isDark = true
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        w-full p-4 rounded-xl border text-left transition-all
        flex items-center gap-4
        ${isDark 
          ? 'bg-neutral-900/50 border-neutral-800 hover:bg-neutral-800/70 hover:border-neutral-700' 
          : 'bg-white border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
        }
      `}
    >
      {/* Icon */}
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center shrink-0
        ${isDark ? 'bg-blue-600/20' : 'bg-blue-50'}
      `}>
        <div className={isDark ? 'text-blue-400' : 'text-blue-600'}>
          {icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
          {title}
        </h3>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
          {description}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className={`w-5 h-5 shrink-0 ${isDark ? 'text-neutral-600' : 'text-neutral-400'}`} />
    </motion.button>
  );
});

QuickAction.displayName = 'QuickAction';

export default QuickAction;