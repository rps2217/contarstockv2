/**
 * EmptyState - Estado vacío para listas
 * 
 * Mensaje simple cuando no hay datos.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  isDark?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Sin datos',
  description,
  icon,
  action,
  isDark = true,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Icon */}
      <div className={`
        w-16 h-16 rounded-2xl flex items-center justify-center mb-4
        ${isDark ? 'bg-neutral-900' : 'bg-neutral-100'}
      `}>
        {icon || <Inbox className={`w-8 h-8 ${isDark ? 'text-neutral-600' : 'text-neutral-400'}`} />}
      </div>
      
      {/* Title */}
      <h3 className={`text-base font-semibold mb-1 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
        {title}
      </h3>
      
      {/* Description */}
      {description && (
        <p className={`text-sm text-center max-w-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
          {description}
        </p>
      )}
      
      {/* Action */}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </motion.div>
  );
};

export default EmptyState;