/**
 * SummaryCard - Tarjeta de resumen con icono
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, icon: Icon, colorClass }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface border border-subtle rounded-2xl p-4 flex items-center gap-3"
  >
    <div
      className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center',
        colorClass.replace('text-', 'bg-') + '/10'
      )}
    >
      <Icon className={cn('w-6 h-6', colorClass)} />
    </div>
    <div>
      <p className={cn('text-2xl font-bold', colorClass)}>{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  </motion.div>
);
