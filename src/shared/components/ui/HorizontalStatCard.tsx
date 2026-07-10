/**
 * HorizontalStatCard - Componente para mostrar estadísticas en línea
 * 
 * Diseño horizontal con icono a la izquierda, valor y label a la derecha.
 * Estilo consistente con HammerPage, ReceptionPage, DataPage.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HorizontalStatCardProps {
  /** Icono a mostrar */
  icon: LucideIcon;
  /** Label descriptivo */
  label: string;
  /** Valor numérico o texto */
  value: number | string;
  /** Color del icono y valor (clase CSS) */
  color?: string;
  /** Texto adicional debajo del valor */
  subtext?: string;
  /** Index para delay de animación */
  index?: number;
  /** Clases CSS adicionales */
  className?: string;
}

export const HorizontalStatCard: React.FC<HorizontalStatCardProps> = memo(({
  icon: Icon,
  label,
  value,
  color = 'text-primary',
  subtext,
  index = 0,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn(
        'bg-surface border border-subtle rounded-xl p-3 flex items-center gap-3',
        className
      )}
    >
      {/* Icon Container */}
      <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center shrink-0">
        <Icon className={cn('w-5 h-5', color)} />
      </div>

      {/* Text Content */}
      <div className="min-w-0">
        <p className={cn('text-lg font-bold', color)}>{value}</p>
        <p className="text-xs text-muted">{label}</p>
        {subtext && <p className="text-[10px] text-muted/70">{subtext}</p>}
      </div>
    </motion.div>
  );
});

HorizontalStatCard.displayName = 'HorizontalStatCard';

export default HorizontalStatCard;
