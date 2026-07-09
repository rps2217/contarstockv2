/**
 * FAB - Floating Action Button
 * 
 * Botón flotante para acciones principales.
 * Posicionado en la esquina inferior derecha.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FABProps {
  /** Callback al hacer click */
  onClick: () => void;
  /** Icono a mostrar */
  icon?: LucideIcon;
  /** Color de fondo */
  color?: string;
  /** Posición vertical */
  position?: 'bottom-right' | 'bottom-center';
  /** Si está visible/activo */
  visible?: boolean;
  /** Texto para tooltip */
  label?: string;
  /** Clases CSS adicionales */
  className?: string;
}

export const FAB: React.FC<FABProps> = memo(({
  onClick,
  icon: Icon = Plus,
  color = 'bg-blue-600 hover:bg-blue-500',
  position = 'bottom-right',
  visible = true,
  label,
  className,
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-24 right-6',
    'bottom-center': 'bottom-24 left-1/2 -translate-x-1/2',
  };

  if (!visible) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(12);
        onClick();
      }}
      className={cn(
        'fixed md:hidden w-14 h-14 rounded-full',
        'shadow-lg shadow-black/20',
        'flex items-center justify-center',
        'text-white transition-colors z-40',
        color,
        positionClasses[position],
        className
      )}
      title={label}
      aria-label={label || 'Acción'}
    >
      <Icon className="w-6 h-6" />
    </motion.button>
  );
});

FAB.displayName = 'FAB';

/**
 * FABGroup - Grupo de FABs (FAB principal + mini FABs)
 */
interface FABGroupProps {
  mainOnClick: () => void;
  mainIcon?: LucideIcon;
  color?: string;
  visible?: boolean;
  children?: React.ReactNode;
}

export const FABGroup: React.FC<FABGroupProps> = memo(({
  mainOnClick,
  mainIcon: MainIcon = Plus,
  color = 'bg-blue-600 hover:bg-blue-500',
  visible = true,
  children,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed bottom-24 right-6 md:hidden flex flex-col items-end gap-3 z-40">
      {/* Mini FABs */}
      <div className="flex flex-col gap-3">
        {children}
      </div>
      
      {/* Main FAB */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(12);
          mainOnClick();
        }}
        className={cn(
          'w-14 h-14 rounded-full',
          'shadow-lg shadow-black/20',
          'flex items-center justify-center',
          'text-white transition-colors',
          color
        )}
      >
        <MainIcon className="w-6 h-6" />
      </motion.button>
    </div>
  );
});

FABGroup.displayName = 'FABGroup';

/**
 * MiniFAB - Mini FAB para acciones secundarias
 */
interface MiniFABProps {
  onClick: () => void;
  icon: LucideIcon;
  color?: string;
  label?: string;
}

export const MiniFAB: React.FC<MiniFABProps> = memo(({
  onClick,
  icon: Icon,
  color = 'bg-surface hover:bg-elevated text-primary',
  label,
}) => {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(8);
        onClick();
      }}
      className={cn(
        'w-12 h-12 rounded-full',
        'shadow-lg shadow-black/20',
        'flex items-center justify-center',
        'transition-colors border border-subtle',
        color
      )}
      title={label}
      aria-label={label}
    >
      <Icon className="w-5 h-5" />
    </motion.button>
  );
});

MiniFAB.displayName = 'MiniFAB';

export default FAB;
