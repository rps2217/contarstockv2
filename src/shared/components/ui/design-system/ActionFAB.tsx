/**
 * ActionFAB - Botón flotante de acción principal
 *
 * Diseño minimalista con sombra sutil.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface ActionFABProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  isDark?: boolean;
  position?: 'bottom-right' | 'bottom-center';
}

export const ActionFAB: React.FC<ActionFABProps> = ({
  onClick,
  icon,
  label,
  isDark = true,
  position = 'bottom-right',
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        fixed z-50 flex items-center gap-2 px-5 py-3 rounded-2xl
        font-semibold text-sm shadow-lg
        transition-all duration-200
        ${position === 'bottom-right' ? 'right-6' : 'left-1/2 -translate-x-1/2'}
        bottom-24 md:bottom-6
        ${
          isDark
            ? 'bg-neutral-100 text-neutral-900 shadow-black/20 hover:bg-neutral-200'
            : 'bg-neutral-900 text-white shadow-black/30 hover:bg-neutral-800'
        }
      `}
      aria-label={label || 'Acción principal'}
    >
      {icon || <Plus className="w-5 h-5" />}
      {label && <span>{label}</span>}
    </motion.button>
  );
};

export default ActionFAB;
