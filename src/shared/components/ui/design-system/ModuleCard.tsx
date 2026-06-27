/**
 * ModuleCard - Tarjeta consistente para items de lista
 * 
 * Diseño monocromático con grises, sin colores distractores.
 */

import React from 'react';
import { motion } from 'motion/react';
import { Check, MoreHorizontal } from 'lucide-react';

interface ModuleCardProps {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onSelect?: (id: string) => void;
  showCheckbox?: boolean;
  isDark?: boolean;
  children?: React.ReactNode;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  id,
  title,
  subtitle,
  meta,
  icon,
  selected = false,
  onClick,
  onSelect,
  showCheckbox = false,
  isDark = true,
  children,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (showCheckbox && onSelect) {
      e.stopPropagation();
      onSelect(id);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <motion.div
      whileTap={{ scale: showCheckbox ? 1 : 0.98 }}
      onClick={handleClick}
      className={`
        relative flex items-center gap-3 p-4 rounded-xl cursor-pointer
        transition-all duration-150 border
        ${isDark 
          ? selected 
            ? 'bg-neutral-800 border-neutral-600' 
            : 'bg-neutral-900/50 border-neutral-800 hover:bg-neutral-800/70 hover:border-neutral-700'
          : selected 
            ? 'bg-neutral-100 border-neutral-400' 
            : 'bg-white border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
        }
      `}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div className={`
          w-5 h-5 rounded-md flex items-center justify-center
          transition-colors border-2
          ${selected 
            ? isDark ? 'bg-neutral-600 border-neutral-600' : 'bg-neutral-800 border-neutral-800'
            : isDark ? 'border-neutral-600' : 'border-neutral-300'
          }
        `}>
          {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      )}

      {/* Icon */}
      {icon && (
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center shrink-0
          ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}
        `}>
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={`
          text-sm font-semibold truncate
          ${isDark ? 'text-neutral-100' : 'text-neutral-900'}
        `}>
          {title}
        </h3>
        {subtitle && (
          <p className={`
            text-xs truncate mt-0.5
            ${isDark ? 'text-neutral-400' : 'text-neutral-500'}
          `}>
            {subtitle}
          </p>
        )}
        {meta && (
          <p className={`
            text-[10px] font-mono mt-1
            ${isDark ? 'text-neutral-500' : 'text-neutral-400'}
          `}>
            {meta}
          </p>
        )}
      </div>

      {/* Children (extra actions) */}
      {children && (
        <div className="flex items-center gap-1">
          {children}
        </div>
      )}

      {/* Actions button */}
      {!children && (
        <button 
          className={`
            p-2 rounded-lg
            ${isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-100'}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className={`w-4 h-4 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
        </button>
      )}
    </motion.div>
  );
};

export default ModuleCard;