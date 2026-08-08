/**
 * TabButton - Botón de tabs con icono y contador
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
}

export const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon: Icon, label, count, color }) => {
  const colorMap: Record<string, string> = {
    emerald: 'emerald-500',
    indigo: 'indigo-500',
    amber: 'amber-500',
  };
  const c = colorMap[color] || 'blue-500';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
        active
          ? `bg-${c}/10 text-${c} border border-${c}/30`
          : 'bg-surface text-secondary hover:text-primary border border-subtle'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-bold',
          active ? `bg-${c}/20 text-${c.replace('-500', '-400')}` : 'bg-elevated text-muted'
        )}
      >
        {count}
      </span>
    </button>
  );
};
